import { BlockList, isIP } from 'node:net';
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

/**
 * Address ranges a destination must never point at.
 *
 * `net.BlockList` rather than hand-rolled octet arithmetic, because it resolves
 * IPv4-mapped IPv6 addresses against the IPv4 entries natively. That is the
 * whole game here: the WHATWG URL parser re-serialises `[::ffff:127.0.0.1]` to
 * its hex form `[::ffff:7f00:1]`, so the dotted-quad string match this replaces
 * never fired, and `::ffff:a9fe:a9fe` walked straight through to the cloud
 * metadata endpoint. Integer, octal and hex IPv4 literals (`2130706433`,
 * `0x7f000001`, `0177.0.0.1`) need no special handling for the same reason in
 * reverse: `new URL()` has already normalised them to dotted-quad by this point.
 */
const PRIVATE_RANGES = new BlockList();

PRIVATE_RANGES.addSubnet('0.0.0.0', 8, 'ipv4'); // "this" network
PRIVATE_RANGES.addSubnet('10.0.0.0', 8, 'ipv4'); // RFC 1918
PRIVATE_RANGES.addSubnet('100.64.0.0', 10, 'ipv4'); // CGNAT
PRIVATE_RANGES.addSubnet('127.0.0.0', 8, 'ipv4'); // loopback
PRIVATE_RANGES.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local, incl. 169.254.169.254 metadata
PRIVATE_RANGES.addSubnet('172.16.0.0', 12, 'ipv4'); // RFC 1918
PRIVATE_RANGES.addSubnet('192.0.0.0', 24, 'ipv4'); // IETF protocol assignments
PRIVATE_RANGES.addSubnet('192.0.2.0', 24, 'ipv4'); // TEST-NET-1
PRIVATE_RANGES.addSubnet('192.168.0.0', 16, 'ipv4'); // RFC 1918
PRIVATE_RANGES.addSubnet('198.18.0.0', 15, 'ipv4'); // benchmarking
PRIVATE_RANGES.addSubnet('198.51.100.0', 24, 'ipv4'); // TEST-NET-2
PRIVATE_RANGES.addSubnet('203.0.113.0', 24, 'ipv4'); // TEST-NET-3
PRIVATE_RANGES.addSubnet('224.0.0.0', 4, 'ipv4'); // multicast
PRIVATE_RANGES.addSubnet('240.0.0.0', 4, 'ipv4'); // reserved, incl. 255.255.255.255

PRIVATE_RANGES.addSubnet('::', 96, 'ipv6'); // unspecified, loopback, deprecated IPv4-compatible
PRIVATE_RANGES.addSubnet('64:ff9b::', 96, 'ipv6'); // NAT64
PRIVATE_RANGES.addSubnet('100::', 64, 'ipv6'); // discard-only
PRIVATE_RANGES.addSubnet('2001::', 32, 'ipv6'); // Teredo (2001:0000::/32, not 2001:db8::)
PRIVATE_RANGES.addSubnet('2001:db8::', 32, 'ipv6'); // documentation
PRIVATE_RANGES.addSubnet('2002::', 16, 'ipv6'); // 6to4, e.g. 2002:7f00:1:: for 127.0.0.1
PRIVATE_RANGES.addSubnet('fc00::', 7, 'ipv6'); // unique local
PRIVATE_RANGES.addSubnet('fe80::', 10, 'ipv6'); // link-local
PRIVATE_RANGES.addSubnet('fec0::', 10, 'ipv6'); // deprecated site-local
PRIVATE_RANGES.addSubnet('ff00::', 8, 'ipv6'); // multicast

/**
 * Wildcard-DNS services, which resolve any hostname that encodes an address
 * straight to that address: `169-254-169-254.nip.io` is the cloud metadata
 * endpoint wearing a public name. Without these the whole range table above is
 * optional for anyone willing to paste a different hostname.
 */
const WILDCARD_DNS_DOMAINS = [
  'nip.io',
  'sslip.io',
  'xip.io',
  'localtest.me',
  'traefik.me',
  'lvh.me',
  'vcap.me',
];

/** A label spelling out an IPv4 address, dot- or dash-separated. */
const EMBEDDED_IPV4 = /(?:^|[.-])((?:\d{1,3}[-.]){3}\d{1,3})(?:[.-]|$)/;

export function isPrivateHost(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(lowered)) return true;

  // `URL.hostname` keeps the brackets on an IPv6 literal; `isIP` rejects them.
  const host = lowered.replace(/^\[|\]$/g, '');
  const ipVersion = isIP(host);
  if (ipVersion === 4) return PRIVATE_RANGES.check(host, 'ipv4');
  // 'ipv6' is deliberate even for an IPv4-mapped address: BlockList maps it back
  // onto the IPv4 entries above, which is what closes the `::ffff:` bypass.
  if (ipVersion === 6) return PRIVATE_RANGES.check(host, 'ipv6');

  if (WILDCARD_DNS_DOMAINS.some((domain) => hostMatchesDomain(host, domain))) return true;

  // `10-0-0-1.example.com` and friends. Only rejected when the embedded address
  // is itself private, so an ordinary host that happens to contain a public
  // dotted-quad is unaffected.
  const embedded = EMBEDDED_IPV4.exec(host)?.[1]?.replace(/-/g, '.');
  if (embedded && isIP(embedded) === 4 && PRIVATE_RANGES.check(embedded, 'ipv4')) return true;

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
