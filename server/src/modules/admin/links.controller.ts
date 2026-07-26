import { and, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { links, visits, type Link } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { assessLink, SUSPICIOUS_DOMAIN_PATTERNS, SUSPICIOUS_URL_PATTERNS } from '../../lib/risk.js';
import { buildPageMeta, cache, sendOk } from '../../lib/http.js';
import { currentAdmin } from '../../middleware/auth.js';
import { paginationSchema, query } from '../../middleware/validate.js';
import { evaluateAvailability, findById } from '../links/service.js';
import { getLinkAnalytics } from '../stats/service.js';
import { recordAudit, type AuditAction } from './audit.js';

/* -------------------------------------------------------------------------- */
/*  Schemas                                                                   */
/* -------------------------------------------------------------------------- */

export const linkStatusFilters = [
  'all',
  'active',
  'suspicious',
  'blocked',
  'expired',
  'flagged',
  'reported',
  'deleted',
] as const;

export const listLinksSchema = paginationSchema.extend({
  search: z.string().trim().max(255).optional(),
  status: z.enum(linkStatusFilters).default('all'),
  domain: z.string().trim().max(255).optional(),
  sort: z.enum(['newest', 'oldest', 'clicks', 'reports']).default('newest'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const updateLinkSchema = z
  .object({
    title: z.string().trim().max(255).nullable().optional(),
    adminNote: z.string().trim().max(500).nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    blacklisted: z.boolean().optional(),
    expired: z.boolean().optional(),
    flagged: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const bulkActionSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Select at least one link').max(200),
  action: z.enum(['block', 'unblock', 'expire', 'reactivate', 'delete', 'restore']),
});

/* -------------------------------------------------------------------------- */
/*  Serialisation                                                             */
/* -------------------------------------------------------------------------- */

/** Extra context that sharpens the risk score when it is available. */
interface RiskContext {
  creatorLinkCount?: number;
  creatorBlockedCount?: number;
}

/** Admin view, includes the moderation columns the public API hides. */
function toAdminLink(link: Link, context: RiskContext = {}) {
  const risk = assessLink({
    destination: link.mainUrl,
    domain: link.domain,
    reportCount: link.reportCount,
    flagged: link.flagged === 1,
    blacklisted: link.blacklisted === 1,
    ...context,
  });

  return {
    id: link.id,
    code: link.shortCode,
    shortUrl: link.shortUrl,
    destination: link.mainUrl,
    domain: link.domain,
    title: link.title,
    status: evaluateAvailability(link),
    blacklisted: link.blacklisted === 1,
    expired: link.expiredStatus === 1,
    flagged: link.flagged === 1,
    clicks: link.timesClicked,
    qrDownloads: link.qrGenerated,
    reportCount: link.reportCount,
    createdAt: link.timeIssued,
    expiresAt: link.expiresAt,
    lastClickedAt: link.lastClickedAt,
    deletedAt: link.deletedAt,
    adminNote: link.adminNote,
    createdByIp: link.reqIp,
    createdByAgent: link.reqAgent,
    risk,
  };
}

/* -------------------------------------------------------------------------- */
/*  List                                                                      */
/* -------------------------------------------------------------------------- */

function buildFilter(params: z.infer<typeof listLinksSchema>): SQL | undefined {
  const conditions: SQL[] = [];

  // Deleted links are hidden unless explicitly requested.
  conditions.push(params.status === 'deleted' ? isNotNull(links.deletedAt) : isNull(links.deletedAt));

  switch (params.status) {
    case 'active':
      conditions.push(eq(links.blacklisted, 0), eq(links.expiredStatus, 0));
      conditions.push(or(isNull(links.expiresAt), sql`${links.expiresAt} > UTC_TIMESTAMP()`)!);
      break;
    case 'blocked':
      conditions.push(eq(links.blacklisted, 1));
      break;
    case 'expired':
      conditions.push(or(eq(links.expiredStatus, 1), sql`${links.expiresAt} <= UTC_TIMESTAMP()`)!);
      break;
    case 'flagged':
      conditions.push(eq(links.flagged, 1));
      break;
    case 'reported':
      conditions.push(sql`${links.reportCount} > 0`);
      break;
    case 'suspicious': {
      // The SQL-expressible subset of the risk heuristics. Entropy and creator
      // history cannot be evaluated here, so this is a narrower net than the
      // score shown in the table, never a wider one.
      const domainMatches = SUSPICIOUS_DOMAIN_PATTERNS.map((pattern) => like(links.domain, pattern));
      const urlMatches = SUSPICIOUS_URL_PATTERNS.map((pattern) => like(links.mainUrl, pattern));
      conditions.push(
        or(
          eq(links.flagged, 1),
          eq(links.blacklisted, 1),
          sql`${links.reportCount} > 0`,
          ...domainMatches,
          ...urlMatches,
        )!,
      );
      break;
    }
    default:
      break;
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(or(like(links.shortCode, term), like(links.mainUrl, term), like(links.domain, term))!);
  }

  if (params.domain) conditions.push(eq(links.domain, params.domain.toLowerCase()));
  if (params.from) conditions.push(gte(links.timeIssued, params.from));
  if (params.to) conditions.push(lte(links.timeIssued, params.to));

  return conditions.length ? and(...conditions) : undefined;
}

const SORTS = {
  newest: desc(links.timeIssued),
  oldest: links.timeIssued,
  clicks: desc(links.timesClicked),
  reports: desc(links.reportCount),
} as const;

export async function listLinks(req: Request, res: Response) {
  const params = query<z.infer<typeof listLinksSchema>>(req);
  const where = buildFilter(params);

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(links)
      .where(where)
      .orderBy(SORTS[params.sort])
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ value: sql<number>`COUNT(*)`.mapWith(Number) }).from(links).where(where),
  ]);

  // One grouped lookup for every creator IP on this page, so the risk score in
  // the list matches the one on the detail view instead of being a weaker
  // approximation of it.
  const creatorIps = [...new Set(rows.map((row) => row.reqIp).filter((ip): ip is string => Boolean(ip)))];

  const creatorStats = new Map<string, { total: number; blocked: number }>();
  if (creatorIps.length > 0) {
    const aggregates = await db
      .select({
        ip: links.reqIp,
        total: sql<number>`COUNT(*)`.mapWith(Number),
        blocked: sql<number>`SUM(CASE WHEN ${links.blacklisted} = 1 THEN 1 ELSE 0 END)`.mapWith(Number),
      })
      .from(links)
      .where(inArray(links.reqIp, creatorIps))
      .groupBy(links.reqIp);

    for (const row of aggregates) {
      if (row.ip) creatorStats.set(row.ip, { total: row.total, blocked: row.blocked });
    }
  }

  const payload = rows.map((row) => {
    const stats = row.reqIp ? creatorStats.get(row.reqIp) : undefined;
    return toAdminLink(row, {
      creatorLinkCount: stats?.total ?? 0,
      creatorBlockedCount: stats?.blocked ?? 0,
    });
  });

  cache.noStore(res);
  return sendOk(res, payload, buildPageMeta(params.page, params.pageSize, totalRow?.value ?? 0));
}

/* -------------------------------------------------------------------------- */
/*  Detail                                                                    */
/* -------------------------------------------------------------------------- */

export async function getLink(req: Request, res: Response) {
  const id = Number(req.params.id);
  const link = await findById(id);
  if (!link) throw AppError.notFound('Link not found');

  const [analytics, recentVisits, creator, siblings, topVisitorIps] = await Promise.all([
    getLinkAnalytics(link.id),

    db
      .select({
        id: visits.id,
        ip: visits.visitorIp,
        country: visits.country,
        device: visits.device,
        browser: visits.browser,
        os: visits.os,
        referer: visits.referer,
        isBot: visits.isBot,
        visitedAt: visits.visitedAt,
      })
      .from(visits)
      .where(eq(visits.urlId, link.id))
      .orderBy(desc(visits.id))
      .limit(50),

    // What else has this creator IP done? The single most useful abuse signal.
    link.reqIp
      ? db
          .select({
            total: sql<number>`COUNT(*)`.mapWith(Number),
            blocked: sql<number>`SUM(CASE WHEN ${links.blacklisted} = 1 THEN 1 ELSE 0 END)`.mapWith(Number),
            reported: sql<number>`SUM(CASE WHEN ${links.reportCount} > 0 THEN 1 ELSE 0 END)`.mapWith(Number),
            firstSeen: sql<Date>`MIN(${links.timeIssued})`,
            lastSeen: sql<Date>`MAX(${links.timeIssued})`,
          })
          .from(links)
          .where(eq(links.reqIp, link.reqIp))
      : Promise.resolve([]),

    // A few sibling links from the same IP, for quick pattern spotting.
    link.reqIp
      ? db
          .select({
            id: links.id,
            code: links.shortCode,
            domain: links.domain,
            blacklisted: links.blacklisted,
            reportCount: links.reportCount,
            createdAt: links.timeIssued,
          })
          .from(links)
          .where(and(eq(links.reqIp, link.reqIp), sql`${links.id} <> ${link.id}`))
          .orderBy(desc(links.timeIssued))
          .limit(8)
      : Promise.resolve([]),

    // Heaviest visitor IPs: repeat hits from one address suggest automation.
    db
      .select({
        ip: visits.visitorIp,
        hits: sql<number>`COUNT(*)`.mapWith(Number),
        botHits: sql<number>`SUM(CASE WHEN ${visits.isBot} = 1 THEN 1 ELSE 0 END)`.mapWith(Number),
        country: sql<string | null>`MAX(${visits.country})`,
        lastSeen: sql<Date>`MAX(${visits.visitedAt})`,
      })
      .from(visits)
      .where(and(eq(visits.urlId, link.id), isNotNull(visits.visitorIp)))
      .groupBy(visits.visitorIp)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),
  ]);

  const creatorRow = creator[0];

  cache.noStore(res);
  return sendOk(res, {
    link: toAdminLink(link, {
      creatorLinkCount: creatorRow?.total ?? 0,
      creatorBlockedCount: creatorRow?.blocked ?? 0,
    }),
    analytics,
    recentVisits: recentVisits.map((visit) => ({ ...visit, isBot: visit.isBot === 1 })),
    creatorIp: link.reqIp
      ? {
          ip: link.reqIp,
          userAgent: link.reqAgent,
          totalLinks: creatorRow?.total ?? 0,
          blockedLinks: creatorRow?.blocked ?? 0,
          reportedLinks: creatorRow?.reported ?? 0,
          firstSeen: creatorRow?.firstSeen ?? null,
          lastSeen: creatorRow?.lastSeen ?? null,
          otherLinks: siblings.map((row) => ({
            id: row.id,
            code: row.code,
            domain: row.domain,
            blacklisted: row.blacklisted === 1,
            reportCount: row.reportCount,
            createdAt: row.createdAt,
          })),
        }
      : null,
    topVisitorIps,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export async function updateLink(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);
  const body = req.body as z.infer<typeof updateLinkSchema>;

  const existing = await findById(id);
  if (!existing) throw AppError.notFound('Link not found');

  const patch: Partial<typeof links.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.adminNote !== undefined) patch.adminNote = body.adminNote;
  if (body.expiresAt !== undefined) patch.expiresAt = body.expiresAt;
  if (body.blacklisted !== undefined) patch.blacklisted = body.blacklisted ? 1 : 0;
  if (body.expired !== undefined) patch.expiredStatus = body.expired ? 1 : 0;
  if (body.flagged !== undefined) patch.flagged = body.flagged ? 1 : 0;

  await db.update(links).set(patch).where(eq(links.id, id));

  const action: AuditAction =
    body.blacklisted === true
      ? 'link.blocked'
      : body.blacklisted === false
        ? 'link.unblocked'
        : body.expired === true
          ? 'link.expired'
          : body.expired === false
            ? 'link.reactivated'
            : 'link.updated';

  await recordAudit({
    actor: admin,
    action,
    entity: 'link',
    entityId: id,
    meta: { code: existing.shortCode, changes: body },
    client: req.client,
  });

  const updated = await findById(id);
  return sendOk(res, toAdminLink(updated!));
}

/**
 * Soft delete. The row is retained so the audit trail, existing reports, and
 * historical click data stay intact, `purgeLink` is the destructive version.
 */
export async function deleteLink(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const existing = await findById(id);
  if (!existing) throw AppError.notFound('Link not found');
  if (existing.deletedAt) throw AppError.conflict('This link is already deleted');

  await db.update(links).set({ deletedAt: new Date(), blacklisted: 1 }).where(eq(links.id, id));

  await recordAudit({
    actor: admin,
    action: 'link.deleted',
    entity: 'link',
    entityId: id,
    meta: { code: existing.shortCode, destination: existing.mainUrl },
    client: req.client,
  });

  return sendOk(res, { deleted: true, id });
}

export async function restoreLink(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const existing = await findById(id);
  if (!existing) throw AppError.notFound('Link not found');
  if (!existing.deletedAt) throw AppError.conflict('This link is not deleted');

  await db.update(links).set({ deletedAt: null, blacklisted: 0 }).where(eq(links.id, id));

  await recordAudit({
    actor: admin,
    action: 'link.restored',
    entity: 'link',
    entityId: id,
    meta: { code: existing.shortCode },
    client: req.client,
  });

  return sendOk(res, { restored: true, id });
}

/** Irreversible. Owner-only, and it takes the visit history with it. */
export async function purgeLink(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const existing = await findById(id);
  if (!existing) throw AppError.notFound('Link not found');

  await db.delete(visits).where(eq(visits.urlId, id));
  await db.delete(links).where(eq(links.id, id));

  await recordAudit({
    actor: admin,
    action: 'link.purged',
    entity: 'link',
    entityId: id,
    meta: { code: existing.shortCode, destination: existing.mainUrl, clicks: existing.timesClicked },
    client: req.client,
  });

  return sendOk(res, { purged: true, id });
}

export async function bulkAction(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const { ids, action } = req.body as z.infer<typeof bulkActionSchema>;

  const patch: Partial<typeof links.$inferInsert> =
    action === 'block'
      ? { blacklisted: 1 }
      : action === 'unblock'
        ? { blacklisted: 0 }
        : action === 'expire'
          ? { expiredStatus: 1 }
          : action === 'reactivate'
            ? { expiredStatus: 0, blacklisted: 0 }
            : action === 'delete'
              ? { deletedAt: new Date(), blacklisted: 1 }
              : { deletedAt: null };

  await db.update(links).set(patch).where(inArray(links.id, ids));

  await recordAudit({
    actor: admin,
    action: 'link.bulk_action',
    entity: 'link',
    entityId: null,
    meta: { action, count: ids.length, ids: ids.slice(0, 50) },
    client: req.client,
  });

  return sendOk(res, { updated: ids.length, action });
}
