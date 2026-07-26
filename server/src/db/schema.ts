import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  char,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Shorty schema.
 *
 * Table and column names match the production database (`shorty_*`) so this
 * schema maps onto the existing TiDB instance. New columns added in v3 are
 * marked below; `sql/002_upgrade_v3.sql` adds them to an existing install.
 */

/* -------------------------------------------------------------------------- */
/*  Links                                                                     */
/* -------------------------------------------------------------------------- */

export const links = mysqlTable(
  'shorty_url',
  {
    id: int('id').autoincrement().primaryKey(),

    /** v3: the bare code (`gMW7g`), what redirects actually look up. */
    shortCode: varchar('short_code', { length: 32 }).notNull(),
    /** Legacy full short URL (`https://short.msyb.dev/gMW7g`). Kept in sync for old clients. */
    shortUrl: varchar('short_url', { length: 255 }).notNull(),

    mainUrl: text('main_url').notNull(),
    /** v3: sha256(mainUrl), lets us dedupe destinations without scanning a TEXT column. */
    urlHash: char('url_hash', { length: 64 }).notNull(),
    /** v3: destination hostname, denormalised for admin filtering and abuse triage. */
    domain: varchar('domain', { length: 255 }),
    /** v3: optional human label shown in the admin table. */
    title: varchar('title', { length: 255 }),

    expiredStatus: tinyint('expired_status').default(0).notNull(),
    blacklisted: tinyint('blacklisted').default(0).notNull(),
    /** v3: raised automatically once a link crosses the report threshold. */
    flagged: tinyint('flagged').default(0).notNull(),

    timesClicked: int('times_clicked').default(0).notNull(),
    qrGenerated: int('qr_generated').default(0).notNull(),
    /** v3: denormalised count so the admin list does not need a join. */
    reportCount: int('report_count').default(0).notNull(),

    /** v3: hard expiry. NULL means the link never expires on its own. */
    expiresAt: datetime('expires_at'),
    /** v3: most recent successful redirect. */
    lastClickedAt: datetime('last_clicked_at'),
    /** v3: soft delete, rows are retained for audit, hidden everywhere else. */
    deletedAt: datetime('deleted_at'),
    /** v3: free-form moderator note. */
    adminNote: varchar('admin_note', { length: 500 }),

    reqIp: varchar('req_ip', { length: 45 }),
    reqAgent: text('req_agent'),
    timeIssued: datetime('time_issued').notNull(),
  },
  (table) => [
    uniqueIndex('uq_short_code').on(table.shortCode),
    uniqueIndex('short_url').on(table.shortUrl),
    index('idx_url_hash').on(table.urlHash),
    index('idx_time_issued').on(table.timeIssued),
    index('idx_blacklisted').on(table.blacklisted),
    index('idx_flagged').on(table.flagged),
    index('idx_domain').on(table.domain),
    index('idx_expires_at').on(table.expiresAt),
    index('idx_deleted_at').on(table.deletedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Visits                                                                    */
/* -------------------------------------------------------------------------- */

export const visits = mysqlTable(
  'shorty_visits',
  {
    id: int('id').autoincrement().primaryKey(),
    urlId: int('url_id').notNull(),
    visitorIp: varchar('visitor_ip', { length: 45 }),
    visitorAgent: text('visitor_agent'),
    referer: text('referer'),

    /** v3: derived from the request so analytics do not re-parse user agents. */
    country: varchar('country', { length: 2 }),
    device: varchar('device', { length: 20 }),
    browser: varchar('browser', { length: 50 }),
    os: varchar('os', { length: 50 }),
    isBot: tinyint('is_bot').default(0).notNull(),

    visitedAt: datetime('visited_at').notNull(),
  },
  (table) => [
    index('idx_url_id').on(table.urlId),
    index('idx_visited_at').on(table.visitedAt),
    index('idx_visitor_ip').on(table.visitorIp),
    index('idx_url_visited').on(table.urlId, table.visitedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const reportStatuses = ['pending', 'reviewed', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reportReasons = ['phishing', 'malware', 'spam', 'adult', 'copyright', 'other'] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reports = mysqlTable(
  'shorty_report',
  {
    id: int('id').autoincrement().primaryKey(),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    shortyUrl: varchar('shorty_url', { length: 255 }).notNull(),
    urlId: int('url_id'),
    reportDetails: text('report_details'),
    /** v3: structured category alongside the free-text detail. */
    reason: mysqlEnum('reason', reportReasons).default('other').notNull(),
    timeReport: datetime('time_report').notNull(),
    userIp: varchar('user_ip', { length: 45 }),
    userAgent: text('user_agent'),
    status: mysqlEnum('status', reportStatuses).default('pending').notNull(),

    /** v3: moderation trail. */
    reviewedAt: datetime('reviewed_at'),
    reviewedBy: int('reviewed_by'),
    resolutionNote: varchar('resolution_note', { length: 500 }),
  },
  (table) => [
    index('idx_shorty_url').on(table.shortyUrl),
    index('idx_time_report').on(table.timeReport),
    index('idx_status').on(table.status),
    index('idx_user_ip').on(table.userIp),
    index('idx_report_url_id').on(table.urlId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Contact messages                                                          */
/* -------------------------------------------------------------------------- */

export const contactStatuses = ['pending', 'read', 'replied', 'archived'] as const;
export type ContactStatus = (typeof contactStatuses)[number];

export const contacts = mysqlTable(
  'shorty_contact',
  {
    id: int('id').autoincrement().primaryKey(),
    fullname: varchar('fullname', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    /** v3: subject line so the inbox is scannable. */
    subject: varchar('subject', { length: 150 }),
    message: text('message').notNull(),
    userIp: varchar('user_ip', { length: 45 }),
    userAgent: text('user_agent'),
    timeSent: datetime('time_sent').notNull(),
    status: mysqlEnum('status', contactStatuses).default('pending').notNull(),

    /** v3: handling trail. */
    handledAt: datetime('handled_at'),
    handledBy: int('handled_by'),
    adminNote: varchar('admin_note', { length: 500 }),
  },
  (table) => [
    index('idx_email').on(table.email),
    index('idx_time_sent').on(table.timeSent),
    index('idx_contact_status').on(table.status),
    index('idx_contact_user_ip').on(table.userIp),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Analytics events                                                          */
/* -------------------------------------------------------------------------- */

export const analyticsEvents = mysqlTable(
  'shorty_analytics',
  {
    id: int('id').autoincrement().primaryKey(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: text('event_data'),
    eventIp: varchar('event_ip', { length: 45 }),
    eventAgent: text('event_agent'),
    eventTime: datetime('event_time').notNull(),
  },
  (table) => [index('idx_event_type').on(table.eventType), index('idx_event_time').on(table.eventTime)],
);

/* -------------------------------------------------------------------------- */
/*  Admin users & sessions (v3)                                               */
/* -------------------------------------------------------------------------- */

export const adminRoles = ['owner', 'admin', 'moderator'] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminUsers = mysqlTable(
  'shorty_admin_user',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: mysqlEnum('role', adminRoles).default('moderator').notNull(),
    isActive: tinyint('is_active').default(1).notNull(),

    lastLoginAt: datetime('last_login_at'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    /** Consecutive failed logins; reset on success. Drives the lockout below. */
    failedAttempts: int('failed_attempts').default(0).notNull(),
    lockedUntil: datetime('locked_until'),
    /** Bumping this invalidates every issued access token for the user. */
    tokenVersion: int('token_version').default(0).notNull(),

    createdAt: datetime('created_at').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (table) => [uniqueIndex('uq_admin_email').on(table.email), index('idx_admin_role').on(table.role)],
);

export const adminSessions = mysqlTable(
  'shorty_admin_session',
  {
    id: int('id').autoincrement().primaryKey(),
    adminId: int('admin_id').notNull(),
    /** sha256 of the refresh token, the raw token is never stored. */
    refreshTokenHash: char('refresh_token_hash', { length: 64 }).notNull(),
    userAgent: varchar('user_agent', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
    expiresAt: datetime('expires_at').notNull(),
    revokedAt: datetime('revoked_at'),
    createdAt: datetime('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_refresh_token').on(table.refreshTokenHash),
    index('idx_session_admin').on(table.adminId),
    index('idx_session_expires').on(table.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Audit log (v3)                                                            */
/* -------------------------------------------------------------------------- */

export const auditLog = mysqlTable(
  'shorty_audit_log',
  {
    id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
    adminId: int('admin_id'),
    adminEmail: varchar('admin_email', { length: 255 }),
    action: varchar('action', { length: 64 }).notNull(),
    entity: varchar('entity', { length: 32 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }),
    /** JSON blob; TEXT rather than JSON for maximum TiDB/MySQL portability. */
    meta: text('meta'),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 255 }),
    createdAt: datetime('created_at').notNull(),
  },
  (table) => [
    index('idx_audit_admin').on(table.adminId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_entity').on(table.entity, table.entityId),
    index('idx_audit_created').on(table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Domain blocklist (v3)                                                     */
/* -------------------------------------------------------------------------- */

export const blockedDomains = mysqlTable(
  'shorty_blocked_domain',
  {
    id: int('id').autoincrement().primaryKey(),
    /** Stored lowercase, without a leading dot. Matches the host and any subdomain. */
    domain: varchar('domain', { length: 255 }).notNull(),
    reason: varchar('reason', { length: 255 }),
    createdBy: int('created_by'),
    createdAt: datetime('created_at').notNull(),
  },
  (table) => [uniqueIndex('uq_blocked_domain').on(table.domain)],
);

/* -------------------------------------------------------------------------- */
/*  Key/value settings (v3)                                                   */
/* -------------------------------------------------------------------------- */

export const settings = mysqlTable('shorty_setting', {
  key: varchar('setting_key', { length: 64 }).primaryKey(),
  value: text('setting_value'),
  updatedBy: int('updated_by'),
  updatedAt: datetime('updated_at').notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Relations                                                                 */
/* -------------------------------------------------------------------------- */

export const linksRelations = relations(links, ({ many }) => ({
  visits: many(visits),
  reports: many(reports),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  link: one(links, { fields: [visits.urlId], references: [links.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  link: one(links, { fields: [reports.urlId], references: [links.id] }),
  reviewer: one(adminUsers, { fields: [reports.reviewedBy], references: [adminUsers.id] }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  handler: one(adminUsers, { fields: [contacts.handledBy], references: [adminUsers.id] }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(adminUsers, { fields: [adminSessions.adminId], references: [adminUsers.id] }),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type BlockedDomain = typeof blockedDomains.$inferSelect;

/** Convenience for `count(*)`-style raw fragments used in the stats module. */
export const nowSql = sql`UTC_TIMESTAMP()`;
