import type { Request, Response } from 'express';
import type { Link } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { sendCreated, sendOk } from '../../lib/http.js';
import { extractShortCode } from '../../lib/url-safety.js';
import { getLinkAnalytics } from '../stats/service.js';
import type { CreateLinkBody, LookupBody } from './schemas.js';
import { createLink, evaluateAvailability, findByCode, trackQrGenerated } from './service.js';

/** Shape returned to the public frontend, deliberately excludes IP/agent columns. */
export function toPublicLink(link: Link) {
  return {
    code: link.shortCode,
    shortUrl: link.shortUrl,
    destination: link.mainUrl,
    domain: link.domain,
    title: link.title,
    clicks: link.timesClicked,
    qrDownloads: link.qrGenerated,
    createdAt: link.timeIssued,
    expiresAt: link.expiresAt,
    lastClickedAt: link.lastClickedAt,
    status: evaluateAvailability(link),
  };
}

export async function createShortLink(req: Request, res: Response) {
  const body = req.body as CreateLinkBody;
  const { link, reused } = await createLink({ url: body.url, client: req.client });

  const payload = { ...toPublicLink(link), reused };
  return reused ? sendOk(res, payload) : sendCreated(res, payload);
}

/**
 * Public per-link analytics. Only aggregate figures are exposed. Never the
 * visitor IPs, which are admin-only.
 */
export async function getPublicLinkStats(req: Request, res: Response) {
  const body = req.body as LookupBody;

  const code = extractShortCode(body.url);
  if (!code) {
    throw AppError.badRequest('That does not look like a Shorty link. Paste the full short URL or just its code.');
  }

  const link = await findByCode(code);
  if (!link || link.deletedAt) throw AppError.notFound('We could not find that Shorty link');

  const analytics = await getLinkAnalytics(link.id);

  return sendOk(res, {
    link: toPublicLink(link),
    totals: analytics.totals,
    daily: analytics.daily,
    referrers: analytics.referrers,
    countries: analytics.countries,
    devices: analytics.devices,
  });
}

export async function trackQr(req: Request, res: Response) {
  const code = extractShortCode((req.body as { url: string }).url);
  if (!code) throw AppError.badRequest('A valid Shorty link is required');

  await trackQrGenerated(code, req.client);
  return sendOk(res, { tracked: true });
}
