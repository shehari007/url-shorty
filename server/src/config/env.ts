import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the server reads is declared. And validated, here.
 * A misconfigured deploy fails loudly at boot instead of surfacing as a 500 later.
 */

const csv = (fallback: string[] = []) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : fallback,
    );

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : value === 'true' || value === '1'));

const int = (fallback: number, min?: number, max?: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
    .pipe(z.number().int().min(min ?? Number.MIN_SAFE_INTEGER).max(max ?? Number.MAX_SAFE_INTEGER));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: int(8080, 1, 65535),

    // ---- Database ------------------------------------------------------
    DBHOST: z.string().min(1, 'DBHOST is required'),
    DBPORT: int(3306, 1, 65535),
    DBUSERNAME: z.string().min(1, 'DBUSERNAME is required'),
    DBPASS: z.string().default(''),
    DBNAME: z.string().min(1, 'DBNAME is required'),
    DB_SSL: bool(true),
    DB_POOL_SIZE: int(5, 1, 50),

    // ---- Short links ---------------------------------------------------
    SHORTURLDEF: z.string().url('SHORTURLDEF must be an absolute URL'),
    PARAMLEN: int(6, 4, 16),

    // ---- HTTP ----------------------------------------------------------
    DOMAINS: csv(['http://localhost:3000']),
    HOMEPAGE_LINK: z.string().url().default('http://localhost:3000'),
    CONTACTUS_LINK: z.string().url().default('http://localhost:3000/contact'),
    TRUST_PROXY_HOPS: int(1, 0, 10),
    /**
     * Lower-case name of a single proxy header to read the client IP from, e.g.
     * `cf-connecting-ip` behind Cloudflare or `x-vercel-forwarded-for` on Vercel.
     *
     * Leave unset unless a proxy you control *overwrites* that header on every
     * inbound request. Nothing strips these at the edge by default, so trusting
     * one that is merely present lets any client pick their own address and walk
     * past every rate limiter. Unset means `req.ip`, which Express derives from
     * `X-Forwarded-For` using TRUST_PROXY_HOPS and cannot be spoofed past.
     */
    TRUSTED_IP_HEADER: z
      .string()
      .optional()
      .transform((value) => value?.trim().toLowerCase() || undefined),

    // ---- Admin auth ----------------------------------------------------
    /** 32+ random bytes, e.g. `openssl rand -base64 48`. */
    ADMIN_JWT_SECRET: z.string().min(32, 'ADMIN_JWT_SECRET must be at least 32 characters'),
    ADMIN_ACCESS_TTL_MIN: int(30, 5, 720),
    ADMIN_REFRESH_TTL_DAYS: int(7, 1, 90),
    ADMIN_MAX_FAILED_LOGINS: int(5, 3, 20),
    ADMIN_LOCKOUT_MINUTES: int(15, 1, 1440),

    // ---- Behaviour toggles --------------------------------------------
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Reports needed before a link is auto-flagged for review. */
    AUTO_FLAG_THRESHOLD: int(3, 1, 100),
    /** Reports needed before a link is automatically taken offline. */
    AUTO_BLOCK_THRESHOLD: int(8, 2, 500),
    /** Block links pointing at private/loopback addresses (SSRF + internal-network abuse). */
    BLOCK_PRIVATE_HOSTS: bool(true),
    /** Allow plain http:// destinations. Off by default, https only. */
    ALLOW_HTTP_TARGETS: bool(false),
  })
  .transform((raw) => ({
    ...raw,
    isProduction: raw.NODE_ENV === 'production',
    isTest: raw.NODE_ENV === 'test',
    /** Always exactly one trailing slash, so code can concatenate freely. */
    shortUrlBase: `${raw.SHORTURLDEF.replace(/\/+$/, '')}/`,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  // Intentionally console, the logger itself depends on this module.
  console.error(`\n✖ Invalid server environment:\n${issues.join('\n')}\n`);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = typeof env;
