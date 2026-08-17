import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { adminSessions, adminUsers, adminRoles } from '../../db/schema.js';
import { hashPassword } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { buildPageMeta, cache, sendCreated, sendOk } from '../../lib/http.js';
import { currentAdmin } from '../../middleware/auth.js';
import { emailSchema, paginationSchema, query } from '../../middleware/validate.js';
import {
  getAdminOverview,
  getDailyLinkTrend,
  getHourlyDistribution,
  getPlatformVisitTrend,
  getRecentLinks,
  getTopDomains,
  getTopLinks,
} from '../stats/service.js';
import { listAudit, recordAudit } from './audit.js';

/* -------------------------------------------------------------------------- */
/*  Overview                                                                  */
/* -------------------------------------------------------------------------- */

export async function getDashboard(_req: Request, res: Response) {
  const [overview, visitTrend, linkTrend, topLinks, recentLinks, hourly, topDomains] = await Promise.all([
    getAdminOverview(),
    getPlatformVisitTrend(30),
    getDailyLinkTrend(30),
    getTopLinks(8),
    getRecentLinks(8),
    getHourlyDistribution(),
    getTopDomains(8),
  ]);

  cache.noStore(res);
  return sendOk(res, { overview, visitTrend, linkTrend, topLinks, recentLinks, hourly, topDomains });
}

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export const listAuditSchema = paginationSchema.extend({
  action: z.string().trim().max(64).optional(),
  adminId: z.coerce.number().int().positive().optional(),
});

export async function getAuditLog(req: Request, res: Response) {
  const params = query<z.infer<typeof listAuditSchema>>(req);
  const { rows, total } = await listAudit(params);

  cache.noStore(res);
  return sendOk(res, rows, buildPageMeta(params.page, params.pageSize, total));
}

/* -------------------------------------------------------------------------- */
/*  Admin user management (owner only)                                        */
/* -------------------------------------------------------------------------- */

export const createAdminSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2, 'Enter a name').max(100),
  password: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(200)
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
  role: z.enum(adminRoles).default('moderator'),
});

export const updateAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(adminRoles).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export async function listAdmins(_req: Request, res: Response) {
  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      lastLoginIp: adminUsers.lastLoginIp,
      lockedUntil: adminUsers.lockedUntil,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt));

  cache.noStore(res);
  return sendOk(res, rows.map((row) => ({ ...row, isActive: row.isActive === 1 })));
}

export async function createAdmin(req: Request, res: Response) {
  const actor = currentAdmin(req);
  const body = req.body as z.infer<typeof createAdminSchema>;

  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, body.email)).limit(1);
  if (existing) throw AppError.conflict('An admin with that email already exists');

  const now = new Date();
  await db.insert(adminUsers).values({
    email: body.email,
    name: body.name,
    passwordHash: await hashPassword(body.password),
    role: body.role,
    createdAt: now,
    updatedAt: now,
  });

  await recordAudit({
    actor,
    action: 'admin.created',
    entity: 'admin',
    entityId: body.email,
    meta: { role: body.role },
    client: req.client,
  });

  return sendCreated(res, { email: body.email, name: body.name, role: body.role });
}

export async function updateAdmin(req: Request, res: Response) {
  const actor = currentAdmin(req);
  const id = Number(req.params.id);
  const body = req.body as z.infer<typeof updateAdminSchema>;

  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!target) throw AppError.notFound('Admin not found');

  // Guard rails: an owner cannot lock themselves out of their own console.
  if (target.id === actor.id && body.isActive === false) {
    throw AppError.badRequest('You cannot deactivate your own account');
  }
  if (target.id === actor.id && body.role && body.role !== target.role) {
    throw AppError.badRequest('You cannot change your own role');
  }

  const patch: Partial<typeof adminUsers.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.isActive !== undefined) {
    patch.isActive = body.isActive ? 1 : 0;
    // Deactivating must take effect immediately, not at token expiry.
    if (!body.isActive) patch.tokenVersion = target.tokenVersion + 1;
  }

  await db.update(adminUsers).set(patch).where(eq(adminUsers.id, id));

  // Revoke the refresh rows too, not just the token version. Otherwise
  // deactivating and later reactivating inside the refresh window brings every
  // outstanding session back to life.
  if (body.isActive === false) {
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminSessions.adminId, id), isNull(adminSessions.revokedAt)));
  }

  await recordAudit({
    actor,
    action: body.isActive === false ? 'admin.deactivated' : 'admin.updated',
    entity: 'admin',
    entityId: id,
    meta: { changes: body, targetEmail: target.email },
    client: req.client,
  });

  return sendOk(res, { updated: true, id });
}

/**
 * Force-signs-out an admin everywhere.
 *
 * Both halves are load-bearing, and for a while this did only the first:
 * bumping `tokenVersion` kills outstanding *access* tokens, but `refresh()`
 * never compares a session against it, so an un-revoked refresh row could be
 * exchanged straight back for a new access token carrying the *new* version.
 * The revocation reported success while leaving a stolen refresh token — up to
 * `ADMIN_REFRESH_TTL_DAYS` of it — fully working.
 */
export async function revokeAdminSessions(req: Request, res: Response) {
  const actor = currentAdmin(req);
  const id = Number(req.params.id);

  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!target) throw AppError.notFound('Admin not found');

  await db
    .update(adminUsers)
    .set({ tokenVersion: target.tokenVersion + 1, updatedAt: new Date() })
    .where(eq(adminUsers.id, id));

  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.adminId, id), isNull(adminSessions.revokedAt)));

  await recordAudit({
    actor,
    action: 'admin.sessions_revoked',
    entity: 'admin',
    entityId: id,
    meta: { targetEmail: target.email },
    client: req.client,
  });

  return sendOk(res, { revoked: true, id });
}
