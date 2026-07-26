import type { Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import { evaluateAvailability, findByCode, recordClick } from '../links/service.js';
import { views } from './views.js';

/**
 * Resolves a short code and redirects.
 *
 * Design notes:
 *  - Click tracking is fired *after* the response is sent. A slow analytics
 *    write must never delay the redirect, and a failed one must never break it.
 *  - 302 (not 307/301) so the destination can be re-pointed later and so
 *    browsers do not cache the mapping forever.
 *  - Interstitials are `noindex` and never echo the destination URL, so a
 *    blocked phishing link cannot use our domain as a preview surface.
 */
export async function handleRedirect(req: Request, res: Response): Promise<void> {
  // Express 5 types a route param as `string | string[]`; ours is always scalar.
  const code = typeof req.params.code === 'string' ? req.params.code : undefined;

  if (!code) {
    res.status(404).type('html').send(views.notFound(null));
    return;
  }

  let link;
  try {
    link = await findByCode(code);
  } catch (error) {
    logger.error({ err: error, code }, 'redirect lookup failed');
    res.status(500).type('html').send(views.error());
    return;
  }

  const availability = evaluateAvailability(link);

  if (availability !== 'active' || !link) {
    const page =
      availability === 'blocked'
        ? { status: 410, html: views.blocked(code) }
        : availability === 'expired'
          ? { status: 410, html: views.expired(code) }
          : { status: 404, html: views.notFound(code) };

    logger.info({ code, availability, ip: req.client.ip }, 'redirect refused');
    res.status(page.status).type('html').set('Cache-Control', 'no-store').send(page.html);
    return;
  }

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    // Do not leak our short URL to the destination site.
    'Referrer-Policy': 'no-referrer',
  });
  res.redirect(302, link.mainUrl);

  // Fire-and-forget: the response has already been flushed to the client.
  void recordClick(link, req.client).catch((error: unknown) => {
    logger.error({ err: error, code }, 'click tracking failed');
  });
}

/** Cheap existence probe used by the frontend before it renders a preview. */
export async function peekLink(req: Request, res: Response): Promise<void> {
  const code = typeof req.params.code === 'string' ? req.params.code : '';
  const link = await findByCode(code);
  const availability = evaluateAvailability(link);

  res.status(availability === 'active' ? 200 : 404).json({
    success: availability === 'active',
    data: { code, status: availability },
  });
}
