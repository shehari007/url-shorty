import type { Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';
import { getClientIp } from '../lib/request.js';

/**
 * express-rate-limit v8 notes:
 *  - `max` is superseded by `limit`.
 *  - A custom `keyGenerator` that touches the client IP MUST route it through
 *    `ipKeyGenerator`, otherwise IPv6 clients get a per-address bucket and can
 *    trivially rotate within their /56 to bypass the limit.
 *  - `standardHeaders: 'draft-8'` emits the combined `RateLimit` header.
 */

const MINUTE = 60_000;

function keyByClientIp(req: Request): string {
  return ipKeyGenerator(getClientIp(req));
}

type LimiterConfig = {
  windowMs: number;
  limit: number;
  message: string;
  /** Successful requests do not consume quota, used for login brute-force protection. */
  skipSuccessfulRequests?: boolean;
  keyGenerator?: Options['keyGenerator'];
};

function build({ windowMs, limit, message, skipSuccessfulRequests, keyGenerator }: LimiterConfig): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessfulRequests ?? false,
    keyGenerator: keyGenerator ?? keyByClientIp,
    // Route the rejection through the normal error pipeline so the response
    // envelope matches every other error the API produces.
    handler: (_req, _res, next) => next(AppError.rateLimited(message)),
  });
}

/** Default ceiling for every public API route. */
export const apiLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 200,
  message: 'Too many requests. Please try again in a few minutes.',
});

/** Link creation is the expensive, abusable path. */
export const createLinkLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 25,
  message: 'You have created a lot of links recently. Please try again shortly.',
});

export const reportLimiter = build({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: 'Report limit reached. Please try again later.',
});

export const contactLimiter = build({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: 'Contact form limit reached. Please try again later.',
});

export const statsLimiter = build({
  windowMs: 5 * MINUTE,
  limit: 60,
  message: 'Too many lookups. Please slow down.',
});

/** Generous, a popular link legitimately gets a lot of traffic from one CDN egress IP. */
export const redirectLimiter = rateLimit({
  windowMs: MINUTE,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyByClientIp,
  handler: (_req: Request, res: Response) => {
    res.status(429).type('text/plain').send('Too many requests. Please wait a moment and try again.');
  },
});

/**
 * Brute-force protection for the admin login endpoint. Keyed on IP *and* the
 * submitted email so one attacker cannot lock out every account from one IP,
 * and one account cannot be hammered from a rotating IP pool.
 */
export const adminLoginLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 255) : 'unknown';
    return `${ipKeyGenerator(getClientIp(req))}:${email}`;
  },
});

/** Authenticated admin traffic, high, but still bounded. */
export const adminApiLimiter = build({
  windowMs: 5 * MINUTE,
  limit: 300,
  message: 'Too many admin requests. Please slow down.',
});
