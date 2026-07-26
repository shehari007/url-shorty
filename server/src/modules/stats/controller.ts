import type { Request, Response } from 'express';
import { cache, sendOk } from '../../lib/http.js';
import { getDailyLinkTrend, getPlatformStats, getTopLinks } from './service.js';

/**
 * Public platform counters shown on the marketing homepage. Cached at the edge
 * for a minute. These numbers do not need to be to-the-second accurate and the
 * homepage is the most-hit route on the site.
 */
export async function getPublicStats(_req: Request, res: Response) {
  const [totals, trend] = await Promise.all([getPlatformStats(), getDailyLinkTrend(14)]);

  cache.publicShort(res, 60);
  return sendOk(res, { totals, trend });
}

/** Leaderboard of the most-clicked links. Destinations are omitted on purpose. */
export async function getPublicLeaderboard(_req: Request, res: Response) {
  const top = await getTopLinks(10);

  cache.publicShort(res, 300);
  return sendOk(
    res,
    top.map((link) => ({
      code: link.code,
      shortUrl: link.shortUrl,
      domain: link.domain,
      clicks: link.clicks,
      createdAt: link.createdAt,
    })),
  );
}
