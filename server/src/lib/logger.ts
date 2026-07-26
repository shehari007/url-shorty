import { pino } from 'pino';
import { env } from '../config/env.js';

/**
 * Structured JSON logging. On Vercel stdout is already collected and parsed, so
 * no transport/pretty-printer is configured in production.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'shorty-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'refreshToken',
      '*.refreshToken',
      'ADMIN_JWT_SECRET',
      'DBPASS',
    ],
    censor: '[redacted]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;
