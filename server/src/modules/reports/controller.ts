import { and, count, eq, gte, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { links, reportReasons, reports } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { sendCreated } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { extractShortCode } from '../../lib/url-safety.js';
import { emailSchema } from '../../middleware/validate.js';
import { findByCode } from '../links/service.js';

export const submitReportSchema = z.object({
  email: emailSchema,
  url: z.string().trim().min(1, 'Enter the Shorty link you want to report').max(2048),
  reason: z.enum(reportReasons).default('other'),
  detail: z
    .string()
    .trim()
    .min(10, 'Please describe the problem in at least 10 characters')
    .max(500, 'Please keep the description under 500 characters'),
});

export type SubmitReportBody = z.infer<typeof submitReportSchema>;

const DUPLICATE_WINDOW_HOURS = 24;

/**
 * Accepts an abuse report.
 *
 * Reports accumulate against the link; crossing `AUTO_FLAG_THRESHOLD` raises it
 * for moderator review, and crossing `AUTO_BLOCK_THRESHOLD` takes it offline
 * immediately rather than waiting for a human.
 */
export async function submitReport(req: Request, res: Response) {
  const body = req.body as SubmitReportBody;

  const code = extractShortCode(body.url);
  if (!code) throw AppError.badRequest('That does not look like a Shorty link');

  const link = await findByCode(code);
  if (!link || link.deletedAt) throw AppError.notFound('We could not find that Shorty link');

  const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60_000);
  const [duplicate] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.urlId, link.id), eq(reports.userIp, req.client.ip), gte(reports.timeReport, since)))
    .limit(1);

  if (duplicate) {
    throw AppError.conflict('You have already reported this link in the last 24 hours. Our team is on it.');
  }

  await db.insert(reports).values({
    userEmail: body.email,
    shortyUrl: link.shortUrl,
    urlId: link.id,
    reason: body.reason,
    reportDetails: body.detail,
    timeReport: new Date(),
    userIp: req.client.ip,
    userAgent: req.client.userAgent,
    status: 'pending',
  });

  const [tally] = await db.select({ value: count() }).from(reports).where(eq(reports.urlId, link.id));
  const total = tally?.value ?? 1;

  const shouldBlock = total >= env.AUTO_BLOCK_THRESHOLD;
  const shouldFlag = total >= env.AUTO_FLAG_THRESHOLD;

  await db
    .update(links)
    .set({
      reportCount: total,
      ...(shouldFlag ? { flagged: 1 as const } : {}),
      ...(shouldBlock ? { blacklisted: 1 as const } : {}),
    })
    .where(eq(links.id, link.id));

  if (shouldBlock) {
    logger.warn({ linkId: link.id, code: link.shortCode, total }, 'link auto-blocked after repeated reports');
  } else if (shouldFlag) {
    logger.warn({ linkId: link.id, code: link.shortCode, total }, 'link auto-flagged for review');
  }

  return sendCreated(res, {
    received: true,
    // Never echo the running total. It would let an attacker probe the threshold.
    message: 'Thanks for the report. Our team will review this link shortly.',
  });
}

/** Aggregate abuse counters used by the trust & safety section of the site. */
export async function getReportSummary(): Promise<{ pending: number; actioned: number }> {
  const [row] = await db
    .select({
      pending: sql<number>`SUM(CASE WHEN ${reports.status} = 'pending' THEN 1 ELSE 0 END)`.mapWith(Number),
      actioned: sql<number>`SUM(CASE WHEN ${reports.status} = 'actioned' THEN 1 ELSE 0 END)`.mapWith(Number),
    })
    .from(reports);

  return { pending: row?.pending ?? 0, actioned: row?.actioned ?? 0 };
}
