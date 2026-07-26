import { isIP } from 'node:net';
import { env } from '../config/env.js';

/**
 * Destination-URL vetting.
 *
 * A public shortener is an open redirect by design, which makes it attractive
 * for phishing, for laundering traffic, and, if the backend ever fetched the
 * target. For SSRF. Everything here is a cheap, offline check applied before a
 * link is ever persisted.
 */

export type RejectionReason =
  | 'invalid'
  | 'scheme'
  | 'too_long'
  | 'self_reference'
  | 'private_host'
  | 'credentials'
  | 'blocked_domain'
  | 'reserved_tld';

export interface UrlInspection {
  ok: boolean;
  reason?: RejectionReason;
  message?: string;
  /** Present when `ok`, the URL re-serialised in canonical form. */
  normalised?: string;
  host?: string;
}

export const MAX_URL_LENGTH = 2048;

/** Hostnames that only ever resolve to the machine or network running this API. */
const LOCAL_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback', '[::1]']);

/** Never resolvable on the public internet (RFC 2606 / RFC 6761 and friends). */
const RESERVED_TLDS = new Set(['local', 'localhost', 'internal', 'intranet', 'lan', 'home', 'corp', 'test', 'invalid', 'example', 'onion']);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a = 0, b = 0] = parts;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const normalised = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalised === '::1' || normalised === '::') return true;
  if (normalised.startsWith('fc') || normalised.startsWith('fd')) return true; // unique local
  if (normalised.startsWith('fe80')) return true; // link-local
  // IPv4-mapped addresses smuggle a v4 target through a v6 literal.
  const mapped = normalised.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(host)) return true;

  const ipVersion = isIP(host.replace(/^\[|\]$/g, ''));
  if (ipVersion === 4) return isPrivateIpv4(host);
  if (ipVersion === 6) return isPrivateIpv6(host);

  const tld = host.split('.').pop() ?? '';
  if (RESERVED_TLDS.has(tld)) return true;

  // A bare label with no dot cannot be a public FQDN.
  return !host.includes('.');
}

export function extractHostname(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}

/**
 * True when `host` is `domain` or any subdomain of it. Plain `includes()` would
 * match `evil-example.com` against a `example.com` block entry.
 */
export function hostMatchesDomain(host: string, domain: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  const d = domain.toLowerCase().replace(/^\.+|\.+$/g, '');
  return h === d || h.endsWith(`.${d}`);
}

export function inspectDestinationUrl(rawUrl: string, blockedDomains: readonly string[] = []): UrlInspection {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return { ok: false, reason: 'invalid', message: 'A destination URL is required' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, reason: 'too_long', message: `URL must be ${MAX_URL_LENGTH} characters or fewer` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid', message: 'That does not look like a valid URL' };
  }

  const allowedProtocols = env.ALLOW_HTTP_TARGETS ? ['https:', 'http:'] : ['https:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      ok: false,
      reason: 'scheme',
      message: env.ALLOW_HTTP_TARGETS
        ? 'Only http:// and https:// links can be shortened'
        : 'Only https:// links can be shortened',
    };
  }

  // `https://user:pass@bank.example.com@evil.com` is a classic phishing shape.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials', message: 'URLs containing credentials are not allowed' };
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) {
    return { ok: false, reason: 'invalid', message: 'That does not look like a valid URL' };
  }

  if (env.BLOCK_PRIVATE_HOSTS && isPrivateHost(host)) {
    return {
      ok: false,
      reason: 'private_host',
      message: 'Links to private, local, or reserved addresses are not allowed',
    };
  }

  // Shortening our own short links creates redirect loops and click-count noise.
  const ownHost = extractHostname(env.shortUrlBase);
  if (ownHost && hostMatchesDomain(host, ownHost)) {
    return { ok: false, reason: 'self_reference', message: 'You cannot shorten a Shorty link' };
  }

  for (const domain of blockedDomains) {
    if (hostMatchesDomain(host, domain)) {
      return { ok: false, reason: 'blocked_domain', message: 'This destination has been blocked by an administrator' };
    }
  }

  return { ok: true, normalised: parsed.toString(), host };
}

/**
 * Accepts either a bare code (`gMW7g`) or a full short URL and returns the code.
 * Used by the report form and the public analytics lookup, where people paste
 * whichever form they happen to have.
 */
export function extractShortCode(input: string): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{3,32}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const ownHost = extractHostname(env.shortUrlBase);
    if (ownHost && !hostMatchesDomain(url.hostname, ownHost)) return null;

    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments.at(-1);
    if (!last) return null;
    return /^[a-zA-Z0-9_-]{3,32}$/.test(last) ? last : null;
  } catch {
    return null;
  }
}

export function buildShortUrl(code: string): string {
  return `${env.shortUrlBase}${code}`;
}
