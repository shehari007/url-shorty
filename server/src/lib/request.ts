import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import { env } from '../config/env.js';

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(',')[0]?.trim() || undefined;
}

/**
 * The client's address, as trustworthy as the deployment allows.
 *
 * `req.ip` is the default on purpose. Express walks `X-Forwarded-For` from the
 * right using `trust proxy`, so a client cannot prepend entries and be believed.
 * Reading `x-real-ip` / `cf-connecting-ip` / `true-client-ip` first, as this
 * once did, threw that away: nothing strips those headers on the way in, so any
 * client could send a fresh value per request, get a clean rate-limit bucket
 * every time, and write chosen addresses into visit rows, audit entries,
 * `lastLoginIp` and the IP-based dedupe on reports and contact messages.
 *
 * Set TRUSTED_IP_HEADER only when a proxy you control overwrites that header on
 * every inbound request.
 */
export function getClientIp(req: Request): string {
  if (env.TRUSTED_IP_HEADER) {
    const candidate = firstHeaderValue(req.headers[env.TRUSTED_IP_HEADER]);
    if (candidate) return normaliseIp(candidate);
  }

  if (req.ip) return normaliseIp(req.ip);
  return normaliseIp(req.socket?.remoteAddress ?? 'unknown');
}

/** `::ffff:1.2.3.4` is an IPv4 address wearing an IPv6 hat, store the plain form. */
function normaliseIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
  return trimmed.slice(0, 45);
}

export function getUserAgent(req: Request, maxLength = 255): string {
  const ua = req.headers['user-agent'];
  const value = Array.isArray(ua) ? ua[0] : ua;
  return (value ?? 'unknown').slice(0, maxLength);
}

export function getReferer(req: Request, maxLength = 500): string | null {
  const referer = req.headers.referer ?? req.headers.referrer;
  const value = Array.isArray(referer) ? referer[0] : referer;
  return value ? value.slice(0, maxLength) : null;
}

/** ISO-3166 alpha-2, supplied by the CDN edge. Null when running without one. */
export function getCountry(req: Request): string | null {
  const raw =
    firstHeaderValue(req.headers['x-vercel-ip-country']) ?? firstHeaderValue(req.headers['cf-ipcountry']);
  if (!raw || raw === 'XX' || raw.length !== 2) return null;
  return raw.toUpperCase();
}

const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|telegram|discord|slack|preview|monitor|curl|wget|python-requests|axios|headless|lighthouse|pingdom|uptime/i;

export interface UserAgentDetails {
  device: string;
  browser: string | null;
  os: string | null;
  isBot: boolean;
}

/**
 * Pure user-agent derivation, split out from `describeClient` so offline tools
 * - notably `scripts/migrate-data.ts`, classify historical rows exactly the
 * way the live request path classifies new ones.
 */
export function parseUserAgent(userAgent: string): UserAgentDetails {
  const parsed = UAParser(userAgent);
  const deviceType = parsed.device?.type;

  return {
    device: deviceType === 'mobile' || deviceType === 'tablet' ? deviceType : 'desktop',
    browser: parsed.browser?.name?.slice(0, 50) ?? null,
    os: parsed.os?.name?.slice(0, 50) ?? null,
    isBot: BOT_PATTERN.test(userAgent),
  };
}

export interface ClientDetails extends UserAgentDetails {
  ip: string;
  userAgent: string;
  referer: string | null;
  country: string | null;
}

export function describeClient(req: Request): ClientDetails {
  const userAgent = getUserAgent(req);

  return {
    ip: getClientIp(req),
    userAgent,
    referer: getReferer(req),
    country: getCountry(req),
    ...parseUserAgent(userAgent),
  };
}

/**
 * MySQL `DATETIME` has no timezone, so everything is written as UTC and the
 * driver is configured with `timezone: 'Z'` to read it back the same way.
 */
export function utcNow(): Date {
  return new Date();
}
