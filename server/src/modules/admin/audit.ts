import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { auditLog } from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import type { AuthenticatedAdmin } from '../../middleware/auth.js';
import type { ClientDetails } from '../../lib/request.js';

/**
 * Append-only record of every state-changing admin action.
 *
 * Writes are best-effort: an audit failure is logged loudly but never blocks
 * the action the operator asked for.
 */

export type AuditAction =
  | 'admin.login'
  | 'admin.login_failed'
  | 'admin.logout'
  | 'admin.password_changed'
  | 'admin.created'
  | 'admin.updated'
  | 'admin.deactivated'
  | 'admin.sessions_revoked'
  | 'link.blocked'
  | 'link.unblocked'
  | 'link.expired'
  | 'link.reactivated'
  | 'link.updated'
  | 'link.deleted'
  | 'link.restored'
  | 'link.purged'
  | 'link.bulk_action'
  | 'report.status_changed'
  | 'report.deleted'
  | 'contact.status_changed'
  | 'contact.deleted'
  | 'domain.blocked'
  | 'domain.unblocked'
  | 'setting.updated';

export interface AuditInput {
  actor: Pick<AuthenticatedAdmin, 'id' | 'email'> | null;
  action: AuditAction;
  entity: string;
  entityId?: string | number | null;
  meta?: Record<string, unknown>;
  client: Pick<ClientDetails, 'ip' | 'userAgent'>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      adminId: input.actor?.id ?? null,
      adminEmail: input.actor?.email ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId != null ? String(input.entityId).slice(0, 64) : null,
      meta: input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
      ip: input.client.ip,
      userAgent: input.client.userAgent.slice(0, 255),
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'failed to write audit entry');
  }
}

export interface AuditQuery {
  page: number;
  pageSize: number;
  action?: string;
  adminId?: number;
}

export async function listAudit({ page, pageSize, action, adminId }: AuditQuery) {
  const conditions = [];
  if (action) conditions.push(eq(auditLog.action, action));
  if (adminId) conditions.push(eq(auditLog.adminId, adminId));
  const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: sql<number>`COUNT(*)`.mapWith(Number) }).from(auditLog).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row,
      meta: row.meta ? safeParse(row.meta) : null,
    })),
    total: totalRow?.value ?? 0,
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
