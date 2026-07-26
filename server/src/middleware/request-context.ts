import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { describeClient, type ClientDetails } from '../lib/request.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      client: ClientDetails;
    }
  }
}

/**
 * Attaches a request id and the parsed client description once per request, so
 * handlers never re-parse the user agent and every log line can be correlated.
 */
export const requestContext: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-request-id'];
  const headerId = Array.isArray(incoming) ? incoming[0] : incoming;

  req.requestId = headerId?.slice(0, 64) || randomUUID();
  req.client = describeClient(req);
  res.setHeader('X-Request-Id', req.requestId);

  next();
};

/** Access log. Redirects are excluded. They are logged with richer detail. */
export const requestLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (env.LOG_LEVEL === 'silent') return next();

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.client?.ip,
    };

    if (res.statusCode >= 500) logger.error(payload, 'request failed');
    else if (res.statusCode >= 400) logger.warn(payload, 'request rejected');
    else logger.info(payload, 'request');
  });

  next();
};
