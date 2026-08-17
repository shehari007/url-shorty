import { and, desc, eq, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import {
  blockedDomains,
  contacts,
  contactStatuses,
  links,
  reports,
  reportStatuses,
} from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { buildPageMeta, cache, sendCreated, sendOk } from '../../lib/http.js';
import { currentAdmin } from '../../middleware/auth.js';
import { paginationSchema, query } from '../../middleware/validate.js';
import { getBlockedDomains, invalidateBlocklistCache } from '../links/service.js';
import { recordAudit } from './audit.js';

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const listReportsSchema = paginationSchema.extend({
  status: z.enum(['all', ...reportStatuses]).default('all'),
  search: z.string().trim().max(255).optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(reportStatuses),
  resolutionNote: z.string().trim().max(500).optional(),
  /** Convenience: action the report and block the link in a single request. */
  blockLink: z.boolean().optional(),
});

export async function listReports(req: Request, res: Response) {
  const params = query<z.infer<typeof listReportsSchema>>(req);

  const conditions: SQL[] = [];
  if (params.status !== 'all') conditions.push(eq(reports.status, params.status));
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(or(like(reports.shortyUrl, term), like(reports.userEmail, term), like(reports.reportDetails, term))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: reports.id,
        email: reports.userEmail,
        shortUrl: reports.shortyUrl,
        urlId: reports.urlId,
        reason: reports.reason,
        detail: reports.reportDetails,
        status: reports.status,
        reportedAt: reports.timeReport,
        reporterIp: reports.userIp,
        reviewedAt: reports.reviewedAt,
        resolutionNote: reports.resolutionNote,
        linkCode: links.shortCode,
        linkDestination: links.mainUrl,
        linkBlocked: links.blacklisted,
        linkReportCount: links.reportCount,
      })
      .from(reports)
      .leftJoin(links, eq(reports.urlId, links.id))
      .where(where)
      .orderBy(desc(reports.timeReport))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ value: sql<number>`COUNT(*)`.mapWith(Number) }).from(reports).where(where),
  ]);

  cache.noStore(res);
  return sendOk(
    res,
    rows.map((row) => ({ ...row, linkBlocked: row.linkBlocked === 1 })),
    buildPageMeta(params.page, params.pageSize, totalRow?.value ?? 0),
  );
}

export async function updateReport(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);
  const body = req.body as z.infer<typeof updateReportSchema>;

  const [existing] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Report not found');

  await db
    .update(reports)
    .set({
      status: body.status,
      resolutionNote: body.resolutionNote ?? existing.resolutionNote,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
    })
    .where(eq(reports.id, id));

  if (body.blockLink && existing.urlId) {
    await db.update(links).set({ blacklisted: 1, flagged: 1 }).where(eq(links.id, existing.urlId));
    await recordAudit({
      actor: admin,
      action: 'link.blocked',
      entity: 'link',
      entityId: existing.urlId,
      meta: { via: 'report', reportId: id },
      client: req.client,
    });
  }

  await recordAudit({
    actor: admin,
    action: 'report.status_changed',
    entity: 'report',
    entityId: id,
    meta: { from: existing.status, to: body.status, blockedLink: Boolean(body.blockLink) },
    client: req.client,
  });

  return sendOk(res, { updated: true, id, status: body.status });
}

export async function deleteReport(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const [existing] = await db.select({ id: reports.id, urlId: reports.urlId }).from(reports).where(eq(reports.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Report not found');

  await db.delete(reports).where(eq(reports.id, id));

  // Keep the denormalised counter honest after a deletion.
  if (existing.urlId) {
    const [tally] = await db
      .select({ value: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(reports)
      .where(eq(reports.urlId, existing.urlId));
    await db.update(links).set({ reportCount: tally?.value ?? 0 }).where(eq(links.id, existing.urlId));
  }

  await recordAudit({ actor: admin, action: 'report.deleted', entity: 'report', entityId: id, client: req.client });
  return sendOk(res, { deleted: true, id });
}

/* -------------------------------------------------------------------------- */
/*  Contact messages                                                          */
/* -------------------------------------------------------------------------- */

export const listContactsSchema = paginationSchema.extend({
  status: z.enum(['all', ...contactStatuses]).default('all'),
  search: z.string().trim().max(255).optional(),
});

export const updateContactSchema = z.object({
  status: z.enum(contactStatuses),
  adminNote: z.string().trim().max(500).optional(),
});

export async function listContacts(req: Request, res: Response) {
  const params = query<z.infer<typeof listContactsSchema>>(req);

  const conditions: SQL[] = [];
  if (params.status !== 'all') conditions.push(eq(contacts.status, params.status));
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(or(like(contacts.email, term), like(contacts.fullname, term), like(contacts.message, term))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(desc(contacts.timeSent))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ value: sql<number>`COUNT(*)`.mapWith(Number) }).from(contacts).where(where),
  ]);

  cache.noStore(res);
  return sendOk(
    res,
    rows.map((row) => ({
      id: row.id,
      name: row.fullname,
      email: row.email,
      subject: row.subject,
      message: row.message,
      status: row.status,
      sentAt: row.timeSent,
      ip: row.userIp,
      userAgent: row.userAgent,
      handledAt: row.handledAt,
      adminNote: row.adminNote,
    })),
    buildPageMeta(params.page, params.pageSize, totalRow?.value ?? 0),
  );
}

export async function updateContact(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);
  const body = req.body as z.infer<typeof updateContactSchema>;

  const [existing] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Message not found');

  await db
    .update(contacts)
    .set({
      status: body.status,
      adminNote: body.adminNote ?? existing.adminNote,
      handledAt: new Date(),
      handledBy: admin.id,
    })
    .where(eq(contacts.id, id));

  await recordAudit({
    actor: admin,
    action: 'contact.status_changed',
    entity: 'contact',
    entityId: id,
    meta: { from: existing.status, to: body.status },
    client: req.client,
  });

  return sendOk(res, { updated: true, id, status: body.status });
}

export async function deleteContact(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const [existing] = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Message not found');

  await db.delete(contacts).where(eq(contacts.id, id));
  await recordAudit({ actor: admin, action: 'contact.deleted', entity: 'contact', entityId: id, client: req.client });

  return sendOk(res, { deleted: true, id });
}

/* -------------------------------------------------------------------------- */
/*  Blocked domains                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A blocked domain is stored in its broadest useful form.
 *
 * The entry always covers the host itself *and* every subdomain (see
 * `hostMatchesDomain`), so a leading `www.` is stripped before storing:
 * blocking `www.evil.com` verbatim would have covered `a.www.evil.com` but not
 * `evil.com` itself, which is almost certainly the opposite of what the
 * moderator clicking the button intended. Strip it once, and one entry covers
 * the apex, `www.`, and everything below.
 */
export const createBlockedDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(255)
    .transform((value) =>
      (value.replace(/^https?:\/\//, '').replace(/^\.+|\.+$/g, '').split('/')[0] ?? '').replace(/^www\./, ''),
    )
    .pipe(
      z
        .string()
        .min(3, 'Enter a valid domain')
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a valid domain, for example: example.com'),
    ),
  reason: z.string().trim().max(255).optional(),
});

export async function listBlockedDomains(_req: Request, res: Response) {
  const rows = await db.select().from(blockedDomains).orderBy(desc(blockedDomains.createdAt));
  cache.noStore(res);
  return sendOk(res, rows);
}

/**
 * Blocks a destination domain, and takes down what already points at it.
 *
 * The blocklist has exactly one other reader, `inspectDestinationUrl` during
 * link creation, so on its own an entry here only ever stopped *future* links.
 * Anything already minted kept redirecting, which made the control close to
 * useless in the situation it exists for: mass-create links to a phishing
 * domain, wait for the first report, and blocking the domain left every
 * existing link serving traffic from our own domain while the console
 * cheerfully displayed it as blocked.
 */
export async function addBlockedDomain(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const body = req.body as z.infer<typeof createBlockedDomainSchema>;

  const [existing] = await db.select({ id: blockedDomains.id }).from(blockedDomains).where(eq(blockedDomains.domain, body.domain)).limit(1);
  if (existing) throw AppError.conflict('That domain is already blocked');

  await db.insert(blockedDomains).values({
    domain: body.domain,
    reason: body.reason ?? null,
    createdBy: admin.id,
    createdAt: new Date(),
  });

  // Mirror `hostMatchesDomain`: the apex plus every subdomain, which covers
  // `www.` without a special case. The domain has already been validated
  // against /^[a-z0-9.-]+\.[a-z]{2,}$/, so it carries no LIKE wildcards.
  const [result] = await db
    .update(links)
    .set({ blacklisted: 1, flagged: 1 })
    .where(
      and(
        isNull(links.deletedAt),
        or(eq(links.domain, body.domain), like(links.domain, `%.${body.domain}`)),
      ),
    );
  const takenDown = result.affectedRows;

  // Refresh eagerly rather than only invalidating, so the very next creation
  // sees the new entry even if the follow-up read were to fail.
  invalidateBlocklistCache();
  await getBlockedDomains(true).catch(() => undefined);

  await recordAudit({
    actor: admin,
    action: 'domain.blocked',
    entity: 'domain',
    entityId: body.domain,
    meta: { reason: body.reason, linksTakenDown: takenDown },
    client: req.client,
  });

  return sendCreated(res, { domain: body.domain, blocked: true, linksTakenDown: takenDown });
}

export async function removeBlockedDomain(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const id = Number(req.params.id);

  const [existing] = await db.select().from(blockedDomains).where(eq(blockedDomains.id, id)).limit(1);
  if (!existing) throw AppError.notFound('Blocked domain not found');

  await db.delete(blockedDomains).where(eq(blockedDomains.id, id));
  invalidateBlocklistCache();

  await recordAudit({
    actor: admin,
    action: 'domain.unblocked',
    entity: 'domain',
    entityId: existing.domain,
    client: req.client,
  });

  return sendOk(res, { removed: true, domain: existing.domain });
}
