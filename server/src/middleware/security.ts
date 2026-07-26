import cors, { type CorsOptions } from 'cors';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

/**
 * helmet 8 changed several defaults (notably a stricter default CSP and
 * `Cross-Origin-Resource-Policy: same-origin`). Everything is set explicitly
 * here so an upstream default change can never silently loosen the API.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      // The redirect host serves small self-contained interstitial pages.
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      scriptSrc: ["'none'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      upgradeInsecureRequests: env.isProduction ? [] : null,
    },
  },
  // API responses are consumed cross-origin by the Next.js frontend.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  noSniff: true,
  hidePoweredBy: true,
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xssFilter: true,
});

/**
 * Strict allow-list CORS. Requests with no `Origin` (curl, server-to-server,
 * the Next.js BFF) are permitted because CORS is a browser-only control and
 * blocking them would break legitimate non-browser clients without adding
 * security, authentication, not CORS, is what protects those routes.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (env.DOMAINS.includes('*') || env.DOMAINS.includes(origin)) return callback(null, true);
    return callback(AppError.forbidden(`Origin ${origin} is not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After', 'X-Request-Id'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86_400,
};

export const corsMiddleware: RequestHandler = cors(corsOptions);

/**
 * Belt-and-braces payload guard. `express.json({ limit })` already rejects
 * oversized bodies, but a bogus `Content-Length` should be refused before the
 * body is buffered at all.
 */
export function contentLengthGuard(maxBytes: number): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers['content-length'];
    if (header && Number(header) > maxBytes) {
      return next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'));
    }
    next();
  };
}
