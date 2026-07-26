import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * Serverless-safe database client.
 *
 * On Vercel each warm lambda reuses its module scope but a cold start creates a
 * fresh one, so the pool is cached on `globalThis` and kept deliberately small, * many concurrent lambdas each holding a large pool is the classic way to
 * exhaust a managed MySQL/TiDB connection limit.
 */

type DbGlobal = {
  __shortyPool?: mysql.Pool;
  __shortyDb?: MySql2Database<typeof schema>;
};

const globalRef = globalThis as unknown as DbGlobal;

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: env.DBHOST,
    port: env.DBPORT,
    user: env.DBUSERNAME,
    password: env.DBPASS,
    database: env.DBNAME,
    waitForConnections: true,
    connectionLimit: env.DB_POOL_SIZE,
    maxIdle: env.DB_POOL_SIZE,
    idleTimeout: 30_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // TiDB Cloud and most managed MySQL providers require TLS.
    ssl: env.DB_SSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    // The app stores UTC datetimes; keep the driver from applying a local offset.
    timezone: 'Z',
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    charset: 'utf8mb4',
  });
}

export const pool: mysql.Pool = globalRef.__shortyPool ?? createPool();
if (!env.isProduction) globalRef.__shortyPool = pool;

export const db: MySql2Database<typeof schema> =
  globalRef.__shortyDb ?? drizzle(pool, { schema, mode: 'default', logger: env.LOG_LEVEL === 'trace' });
if (!env.isProduction) globalRef.__shortyDb = db;

export type Database = typeof db;

/** Lightweight liveness probe used by `/health` and by local startup. */
export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  delete globalRef.__shortyPool;
  delete globalRef.__shortyDb;
}

export { schema };
