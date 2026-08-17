import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { z } from 'zod';
import { env } from './config/env.js';
import { APP_VERSION } from './config/version.js';
import { checkDatabase } from './db/index.js';
import { asyncHandler } from './lib/async-handler.js';
import { sendOk } from './lib/http.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { redirectLimiter } from './middleware/rate-limit.js';
import { requestContext, requestLogger } from './middleware/request-context.js';
import { contentLengthGuard, corsMiddleware, securityHeaders } from './middleware/security.js';
import { validateParams } from './middleware/validate.js';
import { handleRedirect } from './modules/redirect/controller.js';
import { apiRouter, legacyRouter } from './routes/index.js';

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Express 5 notes that shaped this file:
 *  - path-to-regexp v8 requires named wildcards; a bare `'*'` route throws at
 *    boot. The catch-all 404 is registered with `app.use()` instead.
 *  - `req.query` is now a getter, so validated query data is written to
 *    `req.validatedQuery` (see `middleware/validate.ts`).
 *  - Rejected promises from handlers propagate to the error handler natively.
 */
export function createApp(): Express {
  const app = express();

  // Vercel/Cloudflare put exactly one proxy in front of us. Setting a number
  // rather than `true` stops a client from spoofing `X-Forwarded-For` and
  // escaping the rate limiter.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');
  app.set('etag', 'strong');
  app.set('query parser', 'simple');

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(requestContext);
  app.use(requestLogger);

  app.use(contentLengthGuard(MAX_BODY_BYTES));
  app.use(express.json({ limit: MAX_BODY_BYTES }));
  app.use(express.urlencoded({ extended: false, limit: MAX_BODY_BYTES }));
  app.use(cookieParser());

  /* ----------------------------- health ---------------------------------- */

  /**
   * Unauthenticated and deliberately terse.
   *
   * `checkDatabase()` surfaces the driver's own message, which names the
   * database host, port and account (`getaddrinfo ENOTFOUND
   * gateway01...tidbcloud.com`, `Access denied for user 'x'@'y'`). That is
   * useful in a log and nowhere else, so it is logged and dropped rather than
   * returned. The 200/503 split stays, since uptime monitors key on it.
   */
  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const database = await checkDatabase();
      if (!database.ok) {
        logger.error({ err: database.error, latencyMs: database.latencyMs }, 'health check failed');
      }

      res.setHeader('Cache-Control', 'no-store');
      return sendOk(
        res,
        {
          status: database.ok ? ('healthy' as const) : ('degraded' as const),
          version: APP_VERSION,
          database: { ok: database.ok },
          timestamp: new Date().toISOString(),
        },
        undefined,
        database.ok ? 200 : 503,
      );
    }),
  );

  /* ------------------------------ api ------------------------------------ */

  app.use('/api/v1', apiRouter);
  // v2 compatibility, the old single-action endpoint.
  app.use('/api/shorty-url', legacyRouter);

  /* ---------------------------- redirects -------------------------------- */

  const codeParams = validateParams(
    z.object({
      code: z
        .string()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid link'),
    }),
  );

  // `/co/:code` is the historical path; `/:code` is what short URLs actually use.
  app.get('/co/:code', redirectLimiter, codeParams, asyncHandler(handleRedirect));
  app.get('/:code', redirectLimiter, codeParams, asyncHandler(handleRedirect));

  /* --------------------------- error handling ---------------------------- */

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
