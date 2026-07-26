import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabase, closeDatabase } from './db/index.js';
import { logger } from './lib/logger.js';

/**
 * Local / long-running server entry point.
 * On Vercel the app is exported from `api/index.ts` instead and never listens.
 */
async function main(): Promise<void> {
  const health = await checkDatabase();

  if (!health.ok) {
    logger.fatal({ error: health.error }, 'cannot reach the database, refusing to start');
    process.exit(1);
  }

  logger.info({ latencyMs: health.latencyMs }, 'database connected');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, shortBase: env.shortUrlBase },
      `Shorty API listening on http://localhost:${env.PORT}`,
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception, exiting');
    process.exit(1);
  });
}

void main();
