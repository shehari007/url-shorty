import { and, eq, isNull, sql } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { analyticsEvents, blockedDomains, links, visits, type Link } from '../../db/schema.js';
import { generateShortCode, isReservedCode, sha256 } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { ClientDetails } from '../../lib/request.js';
import { buildShortUrl, extractHostname, inspectDestinationUrl } from '../../lib/url-safety.js';

/** How many code collisions to tolerate before widening the code length. */
const MAX_CODE_ATTEMPTS = 6;

/* -------------------------------------------------------------------------- */
/*  Blocked-domain cache                                                      */
/* -------------------------------------------------------------------------- */

let blocklistCache: { domains: string[]; loadedAt: number } | null = null;
const BLOCKLIST_TTL_MS = 60_000;

export async function getBlockedDomains(force = false): Promise<string[]> {
  if (!force && blocklistCache && Date.now() - blocklistCache.loadedAt < BLOCKLIST_TTL_MS) {
    return blocklistCache.domains;
  }

  try {
    const rows = await db.select({ domain: blockedDomains.domain }).from(blockedDomains);
    blocklistCache = { domains: rows.map((row) => row.domain), loadedAt: Date.now() };
    return blocklistCache.domains;
  } catch (error) {
    // Serving a *stale* list is fine, the entries in it are still blocked.
    if (blocklistCache) {
      logger.error({ err: error }, 'failed to refresh blocked domains; serving the last known list');
      return blocklistCache.domains;
    }

    // Never loaded, so we genuinely cannot say whether this destination is
    // blocked. Falling back to `[]` here failed *open*: on a cold serverless
    // process whose first database round-trip times out, every blocked domain
    // would be accepted and permanently minted, surviving the recovery.
    logger.error({ err: error }, 'blocklist unavailable and never loaded; refusing link creation');
    throw new AppError(
      503,
      'INTERNAL',
      'Link creation is briefly unavailable while we check our blocklist. Please try again in a moment.',
    );
  }
}

/**
 * Marks the cache stale rather than dropping it, so a refresh that fails
 * immediately after a moderator action still has a last-known-good list to fall
 * back on instead of tripping the fail-closed branch above.
 */
export function invalidateBlocklistCache(): void {
  if (blocklistCache) blocklistCache.loadedAt = 0;
}

/* -------------------------------------------------------------------------- */
/*  Link status                                                               */
/* -------------------------------------------------------------------------- */

export type LinkAvailability = 'active' | 'not_found' | 'expired' | 'blocked' | 'deleted';

export function evaluateAvailability(link: Link | undefined | null): LinkAvailability {
  if (!link) return 'not_found';
  if (link.deletedAt) return 'deleted';
  if (link.blacklisted === 1) return 'blocked';
  if (link.expiredStatus === 1) return 'expired';
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'active';
}

/* -------------------------------------------------------------------------- */
/*  Lookups                                                                   */
/* -------------------------------------------------------------------------- */

export async function findByCode(code: string): Promise<Link | undefined> {
  const [row] = await db.select().from(links).where(eq(links.shortCode, code)).limit(1);
  return row;
}

export async function findById(id: number): Promise<Link | undefined> {
  const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return row;
}

/**
 * Finds a live link with the same destination so repeat submissions return the
 * same short code instead of minting a new one each time.
 */
async function findReusableByDestination(urlHash: string): Promise<Link | undefined> {
  const [row] = await db
    .select()
    .from(links)
    .where(and(eq(links.urlHash, urlHash), isNull(links.deletedAt)))
    .limit(1);
  return row;
}

/* -------------------------------------------------------------------------- */
/*  Creation                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateLinkInput {
  url: string;
  client: ClientDetails;
  /** Optional caller-supplied vanity code (admin only). */
  customCode?: string;
  expiresAt?: Date | null;
  title?: string | null;
}

export interface CreateLinkResult {
  link: Link;
  reused: boolean;
}

async function reserveCode(preferred?: string): Promise<string> {
  if (preferred) {
    if (isReservedCode(preferred)) throw AppError.conflict('That alias is reserved. Please choose another.');
    const existing = await findByCode(preferred);
    if (existing) throw AppError.conflict('That alias is already taken. Please choose another.');
    return preferred;
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    // Widen the alphabet space if the short space is getting crowded.
    const length = env.PARAMLEN + Math.floor(attempt / 2);
    const candidate = generateShortCode(length);
    if (isReservedCode(candidate)) continue;
    const existing = await findByCode(candidate);
    if (!existing) return candidate;
  }

  throw AppError.internal('Could not allocate a unique short code. Please try again.');
}

export async function createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  const blocked = await getBlockedDomains();
  const inspection = inspectDestinationUrl(input.url, blocked);

  if (!inspection.ok || !inspection.normalised) {
    // A refused *destination* is a policy block (403/URL_BLOCKED); a malformed
    // or oversized input is the caller's mistake (400/BAD_REQUEST).
    const isPolicyBlock = inspection.reason === 'blocked_domain' || inspection.reason === 'private_host';
    throw new AppError(
      isPolicyBlock ? 403 : 400,
      isPolicyBlock ? 'URL_BLOCKED' : 'BAD_REQUEST',
      inspection.message ?? 'Invalid URL',
    );
  }

  const destination = inspection.normalised;
  const urlHash = sha256(destination);

  // Reuse only when the caller has not asked for a specific alias/expiry.
  if (!input.customCode && !input.expiresAt) {
    const existing = await findReusableByDestination(urlHash);
    if (existing) {
      const availability = evaluateAvailability(existing);
      if (availability === 'blocked') {
        throw new AppError(403, 'URL_BLOCKED', 'This destination has been blocked by an administrator');
      }
      if (availability === 'active') {
        await recordEvent('url_generated', existing.shortUrl, input.client);
        return { link: existing, reused: true };
      }
    }
  }

  const code = await reserveCode(input.customCode);
  const now = new Date();

  const values = {
    shortCode: code,
    shortUrl: buildShortUrl(code),
    mainUrl: destination,
    urlHash,
    domain: inspection.host ?? extractHostname(destination),
    title: input.title ?? null,
    expiresAt: input.expiresAt ?? null,
    reqIp: input.client.ip,
    reqAgent: input.client.userAgent,
    timeIssued: now,
  };

  try {
    await db.insert(links).values(values);
  } catch (error) {
    // Lost a race on the unique index, retry once with a fresh code.
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY' && !input.customCode) {
      const retryCode = await reserveCode();
      await db.insert(links).values({ ...values, shortCode: retryCode, shortUrl: buildShortUrl(retryCode) });
      const created = await findByCode(retryCode);
      if (!created) throw AppError.internal('Link was created but could not be read back');
      await recordEvent('url_generated', created.shortUrl, input.client);
      return { link: created, reused: false };
    }
    throw error;
  }

  const created = await findByCode(code);
  if (!created) throw AppError.internal('Link was created but could not be read back');

  await recordEvent('url_generated', created.shortUrl, input.client);
  return { link: created, reused: false };
}

/* -------------------------------------------------------------------------- */
/*  Click tracking                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Records a redirect. Bot traffic is stored (so the admin can see it) but does
 * not inflate the public click counter.
 */
export async function recordClick(link: Link, client: ClientDetails): Promise<void> {
  const now = new Date();

  const tasks: Promise<unknown>[] = [
    db.insert(visits).values({
      urlId: link.id,
      visitorIp: client.ip,
      visitorAgent: client.userAgent,
      referer: client.referer,
      country: client.country,
      device: client.device,
      browser: client.browser,
      os: client.os,
      isBot: client.isBot ? 1 : 0,
      visitedAt: now,
    }),
  ];

  if (!client.isBot) {
    tasks.push(
      db
        .update(links)
        .set({ timesClicked: sql`${links.timesClicked} + 1`, lastClickedAt: now })
        .where(eq(links.id, link.id)),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      // Analytics must never break a redirect.
      logger.error({ err: result.reason, linkId: link.id }, 'failed to record click');
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  QR + events                                                               */
/* -------------------------------------------------------------------------- */

export async function recordEvent(
  eventType: string,
  eventData: string | null,
  client: ClientDetails,
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      eventType,
      eventData,
      eventIp: client.ip,
      eventAgent: client.userAgent,
      eventTime: new Date(),
    });
  } catch (error) {
    logger.error({ err: error, eventType }, 'failed to record analytics event');
  }
}

export async function trackQrGenerated(code: string, client: ClientDetails): Promise<void> {
  const link = await findByCode(code);
  if (!link) throw AppError.notFound('That short link does not exist');

  await Promise.allSettled([
    db.update(links).set({ qrGenerated: sql`${links.qrGenerated} + 1` }).where(eq(links.id, link.id)),
    recordEvent('qr_generated', link.shortUrl, client),
  ]);
}
