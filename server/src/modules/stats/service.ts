import { and, count, countDistinct, desc, eq, gte, isNull, sql, sum } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyticsEvents, contacts, links, reports, visits } from '../../db/schema.js';

/**
 * All aggregate reads live here so the SQL is in one place and the controllers
 * stay thin. Every window is computed in UTC to match how rows are written.
 */

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60_000);
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const liveLink = isNull(links.deletedAt);

/* -------------------------------------------------------------------------- */
/*  Public platform stats                                                     */
/* -------------------------------------------------------------------------- */

export interface PlatformStats {
  totalLinks: number;
  totalClicks: number;
  linksToday: number;
  clicksToday: number;
  qrDownloads: number;
  activeLinks: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const todayStart = startOfUtcDay();

  const [linkAggregate] = await db
    .select({
      totalLinks: count(),
      totalClicks: sum(links.timesClicked).mapWith(Number),
      qrDownloads: sum(links.qrGenerated).mapWith(Number),
      linksToday: sql<number>`SUM(CASE WHEN ${links.timeIssued} >= ${todayStart} THEN 1 ELSE 0 END)`.mapWith(Number),
      activeLinks: sql<number>`SUM(CASE WHEN ${links.blacklisted} = 0 AND ${links.expiredStatus} = 0 THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
    })
    .from(links)
    .where(liveLink);

  const [clicksTodayRow] = await db
    .select({ value: count() })
    .from(visits)
    .where(and(gte(visits.visitedAt, todayStart), eq(visits.isBot, 0)));

  return {
    totalLinks: linkAggregate?.totalLinks ?? 0,
    totalClicks: linkAggregate?.totalClicks ?? 0,
    qrDownloads: linkAggregate?.qrDownloads ?? 0,
    linksToday: linkAggregate?.linksToday ?? 0,
    activeLinks: linkAggregate?.activeLinks ?? 0,
    clicksToday: clicksTodayRow?.value ?? 0,
  };
}

/** Links created per day for the last `days` days (UTC buckets). */
export async function getDailyLinkTrend(days = 14) {
  const rows = await db
    .select({
      date: sql<string>`DATE(${links.timeIssued})`,
      links: count(),
      clicks: sum(links.timesClicked).mapWith(Number),
    })
    .from(links)
    .where(and(liveLink, gte(links.timeIssued, daysAgo(days))))
    .groupBy(sql`DATE(${links.timeIssued})`)
    .orderBy(sql`DATE(${links.timeIssued})`);

  return rows.map((row) => ({ date: String(row.date), links: row.links, clicks: row.clicks ?? 0 }));
}

/* -------------------------------------------------------------------------- */
/*  Per-link analytics                                                        */
/* -------------------------------------------------------------------------- */

export interface LinkAnalytics {
  totals: {
    totalVisits: number;
    uniqueVisitors: number;
    visitsToday: number;
    visitsLast7Days: number;
    visitsLast30Days: number;
    botVisits: number;
  };
  daily: { date: string; visits: number }[];
  referrers: { referrer: string; visits: number }[];
  countries: { country: string; visits: number }[];
  devices: { device: string; visits: number }[];
}

export async function getLinkAnalytics(urlId: number, days = 30): Promise<LinkAnalytics> {
  const todayStart = startOfUtcDay();
  const humanVisit = and(eq(visits.urlId, urlId), eq(visits.isBot, 0));

  const [totalsRow] = await db
    .select({
      totalVisits: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 THEN 1 ELSE 0 END)`.mapWith(Number),
      botVisits: sql<number>`SUM(CASE WHEN ${visits.isBot} = 1 THEN 1 ELSE 0 END)`.mapWith(Number),
      uniqueVisitors: countDistinct(visits.visitorIp),
      visitsToday: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 AND ${visits.visitedAt} >= ${todayStart} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      visitsLast7Days: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 AND ${visits.visitedAt} >= ${daysAgo(7)} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      visitsLast30Days: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 AND ${visits.visitedAt} >= ${daysAgo(30)} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
    })
    .from(visits)
    .where(eq(visits.urlId, urlId));

  const [daily, referrers, countries, devices] = await Promise.all([
    db
      .select({ date: sql<string>`DATE(${visits.visitedAt})`, visits: count() })
      .from(visits)
      .where(and(humanVisit, gte(visits.visitedAt, daysAgo(days))))
      .groupBy(sql`DATE(${visits.visitedAt})`)
      .orderBy(sql`DATE(${visits.visitedAt})`),

    db
      .select({
        referrer: sql<string>`COALESCE(NULLIF(SUBSTRING_INDEX(SUBSTRING_INDEX(${visits.referer}, '://', -1), '/', 1), ''), 'Direct')`,
        visits: count(),
      })
      .from(visits)
      .where(humanVisit)
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(10),

    db
      .select({ country: sql<string>`COALESCE(${visits.country}, 'Unknown')`, visits: count() })
      .from(visits)
      .where(humanVisit)
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(10),

    db
      .select({ device: sql<string>`COALESCE(${visits.device}, 'unknown')`, visits: count() })
      .from(visits)
      .where(humanVisit)
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(5),
  ]);

  return {
    totals: {
      totalVisits: totalsRow?.totalVisits ?? 0,
      botVisits: totalsRow?.botVisits ?? 0,
      uniqueVisitors: totalsRow?.uniqueVisitors ?? 0,
      visitsToday: totalsRow?.visitsToday ?? 0,
      visitsLast7Days: totalsRow?.visitsLast7Days ?? 0,
      visitsLast30Days: totalsRow?.visitsLast30Days ?? 0,
    },
    daily: daily.map((row) => ({ date: String(row.date), visits: row.visits })),
    referrers: referrers.map((row) => ({ referrer: row.referrer, visits: row.visits })),
    countries: countries.map((row) => ({ country: row.country, visits: row.visits })),
    devices: devices.map((row) => ({ device: row.device, visits: row.visits })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Admin dashboard                                                           */
/* -------------------------------------------------------------------------- */

export interface AdminOverview {
  links: {
    total: number;
    active: number;
    blocked: number;
    expired: number;
    flagged: number;
    suspicious: number;
    deleted: number;
    today: number;
  };
  clicks: { total: number; today: number; last7Days: number; bots: number };
  reports: { total: number; pending: number };
  contacts: { total: number; pending: number };
  qr: { total: number };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const todayStart = startOfUtcDay();
  const weekAgo = daysAgo(7);

  const [linkRow] = await db
    .select({
      total: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL THEN 1 ELSE 0 END)`.mapWith(Number),
      deleted: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NOT NULL THEN 1 ELSE 0 END)`.mapWith(Number),
      blocked: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL AND ${links.blacklisted} = 1 THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      expired: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL AND (${links.expiredStatus} = 1 OR (${links.expiresAt} IS NOT NULL AND ${links.expiresAt} <= UTC_TIMESTAMP())) THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      flagged: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL AND ${links.flagged} = 1 THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      today: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL AND ${links.timeIssued} >= ${todayStart} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      // Live links carrying at least one machine-detectable abuse signal but
      // not yet actioned. This is the moderation backlog worth looking at.
      suspicious: sql<number>`SUM(CASE WHEN ${links.deletedAt} IS NULL AND ${links.blacklisted} = 0 AND (
          ${links.flagged} = 1
          OR ${links.reportCount} > 0
          OR ${links.domain} REGEXP '(strangled|jumpingcrab|crabdance|twilightparadox|chickenkiller|ignorelist|mooo|no-ip|noip|ddns|hopto|zapto|duckdns|ngrok|sytes|myftp|dynu|serveo|localtunnel)'
          OR LOWER(${links.mainUrl}) REGEXP '(verify|signin|login|confirm|unlock|wallet|suspend|reactivate)'
        ) THEN 1 ELSE 0 END)`.mapWith(Number),
      totalClicks: sql<number>`COALESCE(SUM(CASE WHEN ${links.deletedAt} IS NULL THEN ${links.timesClicked} ELSE 0 END), 0)`.mapWith(
        Number,
      ),
      qrTotal: sql<number>`COALESCE(SUM(${links.qrGenerated}), 0)`.mapWith(Number),
    })
    .from(links);

  const [visitRow] = await db
    .select({
      today: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 AND ${visits.visitedAt} >= ${todayStart} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      last7Days: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 AND ${visits.visitedAt} >= ${weekAgo} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
      bots: sql<number>`SUM(CASE WHEN ${visits.isBot} = 1 AND ${visits.visitedAt} >= ${weekAgo} THEN 1 ELSE 0 END)`.mapWith(
        Number,
      ),
    })
    .from(visits)
    .where(gte(visits.visitedAt, weekAgo));

  const [reportRow] = await db
    .select({
      total: count(),
      pending: sql<number>`SUM(CASE WHEN ${reports.status} = 'pending' THEN 1 ELSE 0 END)`.mapWith(Number),
    })
    .from(reports);

  const [contactRow] = await db
    .select({
      total: count(),
      pending: sql<number>`SUM(CASE WHEN ${contacts.status} = 'pending' THEN 1 ELSE 0 END)`.mapWith(Number),
    })
    .from(contacts);

  return {
    links: {
      total: linkRow?.total ?? 0,
      active: (linkRow?.total ?? 0) - (linkRow?.blocked ?? 0) - (linkRow?.expired ?? 0),
      blocked: linkRow?.blocked ?? 0,
      expired: linkRow?.expired ?? 0,
      flagged: linkRow?.flagged ?? 0,
      suspicious: linkRow?.suspicious ?? 0,
      deleted: linkRow?.deleted ?? 0,
      today: linkRow?.today ?? 0,
    },
    clicks: {
      total: linkRow?.totalClicks ?? 0,
      today: visitRow?.today ?? 0,
      last7Days: visitRow?.last7Days ?? 0,
      bots: visitRow?.bots ?? 0,
    },
    reports: { total: reportRow?.total ?? 0, pending: reportRow?.pending ?? 0 },
    contacts: { total: contactRow?.total ?? 0, pending: contactRow?.pending ?? 0 },
    qr: { total: linkRow?.qrTotal ?? 0 },
  };
}

/** Visits per day across the whole platform. */
export async function getPlatformVisitTrend(days = 30) {
  const rows = await db
    .select({
      date: sql<string>`DATE(${visits.visitedAt})`,
      visits: sql<number>`SUM(CASE WHEN ${visits.isBot} = 0 THEN 1 ELSE 0 END)`.mapWith(Number),
      bots: sql<number>`SUM(CASE WHEN ${visits.isBot} = 1 THEN 1 ELSE 0 END)`.mapWith(Number),
    })
    .from(visits)
    .where(gte(visits.visitedAt, daysAgo(days)))
    .groupBy(sql`DATE(${visits.visitedAt})`)
    .orderBy(sql`DATE(${visits.visitedAt})`);

  return rows.map((row) => ({ date: String(row.date), visits: row.visits ?? 0, bots: row.bots ?? 0 }));
}

export async function getTopLinks(limit = 10) {
  return db
    .select({
      id: links.id,
      code: links.shortCode,
      shortUrl: links.shortUrl,
      destination: links.mainUrl,
      domain: links.domain,
      clicks: links.timesClicked,
      createdAt: links.timeIssued,
    })
    .from(links)
    .where(and(liveLink, eq(links.blacklisted, 0)))
    .orderBy(desc(links.timesClicked))
    .limit(limit);
}

export async function getRecentLinks(limit = 10) {
  return db
    .select({
      id: links.id,
      code: links.shortCode,
      shortUrl: links.shortUrl,
      destination: links.mainUrl,
      domain: links.domain,
      clicks: links.timesClicked,
      createdAt: links.timeIssued,
    })
    .from(links)
    .where(liveLink)
    .orderBy(desc(links.timeIssued))
    .limit(limit);
}

/** Clicks bucketed by UTC hour over the last 24h, powers the activity chart. */
export async function getHourlyDistribution() {
  const rows = await db
    .select({ hour: sql<number>`HOUR(${visits.visitedAt})`.mapWith(Number), visits: count() })
    .from(visits)
    .where(and(gte(visits.visitedAt, daysAgo(1)), eq(visits.isBot, 0)))
    .groupBy(sql`HOUR(${visits.visitedAt})`)
    .orderBy(sql`HOUR(${visits.visitedAt})`);

  const byHour = new Map(rows.map((row) => [row.hour, row.visits]));
  return Array.from({ length: 24 }, (_unused, hour) => ({ hour, visits: byHour.get(hour) ?? 0 }));
}

export async function getTopDomains(limit = 10) {
  return db
    .select({ domain: sql<string>`COALESCE(${links.domain}, 'unknown')`, links: count() })
    .from(links)
    .where(liveLink)
    .groupBy(sql`1`)
    .orderBy(desc(count()))
    .limit(limit);
}

export async function getQrEventCount(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventType, 'qr_generated'));
  return row?.value ?? 0;
}
