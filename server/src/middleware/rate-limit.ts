import { createHash } from 'node:crypto';
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
 * Outer bound on the login endpoint, keyed on IP alone.
 *
 * This is the limiter that actually caps work, because its key space is not
 * attacker-controlled. `adminLoginLimiter` below keys on the submitted email,
 * which means a caller who varies the email gets an unlimited supply of fresh
 * buckets, and every one of those requests costs a full bcrypt cost-12 compare
 * on the same thread that serves public redirects.
 *
 * Deliberately without `skipSuccessfulRequests`: refunding quota on success
 * would let a caller who holds one valid credential top the bucket back up.
 */
export const adminLoginIpLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: 'Too many sign-in attempts. Please wait before trying again.',
});

/**
 * Per-account brute-force protection, keyed on IP *and* the submitted email so
 * one account cannot be hammered from a rotating IP pool.
 *
 * The email is normalised exactly the way `emailSchema` normalises it before
 * the account lookup. Without the `trim()` these were distinct buckets that
 * resolved to the same row, so `"admin@x.com"`, `"admin@x.com "` and
 * `"\tadmin@x.com"` gave three independent budgets against one account — enough
 * to walk any known admin into a permanent lockout. It is hashed so the store
 * holds fixed-width keys rather than attacker-chosen strings.
 */
export const adminLoginLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait before trying again.',
  keyGenerator: (req) => {
    const raw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = raw.trim().toLowerCase().slice(0, 255);
    const suffix = email ? createHash('sha256').update(email).digest('hex').slice(0, 32) : 'unknown';
    return `${ipKeyGenerator(getClientIp(req))}:${suffix}`;
  },
});

/**
 * Password change runs two bcrypt cost-12 operations (verify, then hash), so an
 * unthrottled loop of wrong-current-password calls is roughly 600 ms of
 * main-thread CPU per request from any token holder, including a `moderator`.
 *
 * Keyed on the admin id, with an IP fallback that matters: keying on
 * `req.admin?.id` alone would collapse every unauthenticated caller into a
 * single shared bucket.
 */
export const passwordChangeLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: 'Too many password change attempts. Please wait before trying again.',
  keyGenerator: (req) => (req.admin ? `pw:${req.admin.id}` : keyByClientIp(req)),
});

/** Authenticated admin traffic, high, but still bounded. */
export const adminApiLimiter = build({
  windowMs: 5 * MINUTE,
  limit: 300,
  message: 'Too many admin requests. Please slow down.',
});
