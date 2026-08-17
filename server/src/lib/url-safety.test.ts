import { describe, expect, it } from 'vitest';
import { extractShortCode, hostMatchesDomain, inspectDestinationUrl, isPrivateHost } from './url-safety.js';

/**
 * The SSRF guard is the only thing standing between a public shortener and the
 * internal network it runs in, so the bypasses below are pinned as regression
 * tests rather than left to review. Every `::ffff:` case here passed the old
 * dotted-quad string match.
 */
describe('isPrivateHost', () => {
  it('blocks IPv4 private, loopback, link-local and CGNAT ranges', () => {
    for (const host of [
      '127.0.0.1',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.64.0.1', // CGNAT
      '0.0.0.0',
      '255.255.255.255',
    ]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('blocks IPv4-mapped IPv6 addresses in their hex form', () => {
    // `new URL('https://[::ffff:127.0.0.1]')` re-serialises the host to
    // `[::ffff:7f00:1]`, so a dotted-quad match never sees these.
    for (const host of [
      '[::ffff:7f00:1]', // 127.0.0.1
      '[::ffff:a9fe:a9fe]', // 169.254.169.254
      '[::ffff:c0a8:1]', // 192.168.0.1
      '[::ffff:a00:1]', // 10.0.0.1
      '[::7f00:1]', // deprecated IPv4-compatible
      '[64:ff9b::7f00:1]', // NAT64
    ]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('blocks IPv6 loopback, unique-local, link-local and multicast', () => {
    for (const host of ['[::1]', '[::]', '[fc00::1]', '[fd12:3456::1]', '[fe80::1]', '[ff02::1]']) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('blocks 6to4, Teredo and site-local IPv6', () => {
    for (const host of [
      '[2002:7f00:1::]', // 6to4 wrapping 127.0.0.1
      '[2001:0:53aa:64c::7f00:1]', // Teredo
      '[fec0::1]', // deprecated site-local
      '[2001:db8::1]', // documentation
    ]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('blocks wildcard-DNS hosts that resolve to private addresses', () => {
    // These resolve to the address spelled out in the label, so a literal-only
    // check would wave the cloud metadata endpoint straight through.
    for (const host of [
      '169-254-169-254.nip.io',
      '127.0.0.1.nip.io',
      '10-0-0-1.sslip.io',
      'anything.localtest.me',
      '192-168-1-1.lvh.me',
    ]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('does not over-block hosts embedding a public address', () => {
    for (const host of ['8-8-8-8.example.com', 'cdn-1.2.3.4.example.com', 'v1.2.3.example.com']) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });

  it('blocks reserved TLDs and bare labels', () => {
    for (const host of ['localhost', 'db.internal', 'router.lan', 'foo.test', 'redis', 'thing.onion']) {
      expect(isPrivateHost(host), host).toBe(true);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const host of [
      'example.com',
      'sub.example.co.uk',
      '8.8.8.8',
      '1.1.1.1',
      '93.184.216.34',
      '172.32.0.1', // just outside 172.16.0.0/12
      '192.0.1.1', // just outside the reserved 192.0.0.0/24
      '[2606:4700::1111]',
    ]) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });
});

describe('inspectDestinationUrl', () => {
  it('rejects non-http(s) schemes', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'ftp://example.com']) {
      expect(inspectDestinationUrl(url).ok, url).toBe(false);
    }
  });

  it('rejects embedded credentials', () => {
    const result = inspectDestinationUrl('https://user:pass@bank.example.com@evil.example.org');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('credentials');
  });

  it('rejects private hosts, including obfuscated IPv4 literals', () => {
    // `new URL()` normalises all three of these to 127.0.0.1 before we see them.
    for (const url of [
      'https://127.0.0.1/x',
      'https://2130706433/x',
      'https://0x7f000001/x',
      'https://[::ffff:a9fe:a9fe]/latest/meta-data/',
    ]) {
      const result = inspectDestinationUrl(url);
      expect(result.ok, url).toBe(false);
      expect(result.reason, url).toBe('private_host');
    }
  });

  it('rejects a URL longer than the cap', () => {
    const result = inspectDestinationUrl(`https://example.com/${'a'.repeat(2100)}`);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_long');
  });

  it('rejects shortening our own short domain', () => {
    const result = inspectDestinationUrl('https://short.example.com/abc123');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('self_reference');
  });

  it('rejects an administrator-blocked domain, its www and every subdomain', () => {
    // One entry has to cover all of these, because that is what a moderator
    // means when they block a domain.
    for (const url of [
      'https://example.org/x',
      'https://www.example.org/x',
      'https://spam.example.org/x',
      'https://deep.nested.example.org/x',
    ]) {
      expect(inspectDestinationUrl(url, ['example.org']).reason, url).toBe('blocked_domain');
    }
    // ...but not a domain that merely ends with the same characters.
    expect(inspectDestinationUrl('https://notexample.org/x', ['example.org']).ok).toBe(true);
  });

  it('accepts and normalises an ordinary https URL', () => {
    const result = inspectDestinationUrl('https://Example.com/path?b=2&a=1');
    expect(result.ok).toBe(true);
    expect(result.host).toBe('example.com');
    expect(result.normalised).toBe('https://example.com/path?b=2&a=1');
  });
});

describe('hostMatchesDomain', () => {
  it('matches the domain and its subdomains only', () => {
    expect(hostMatchesDomain('example.com', 'example.com')).toBe(true);
    expect(hostMatchesDomain('a.b.example.com', 'example.com')).toBe(true);
    expect(hostMatchesDomain('evil-example.com', 'example.com')).toBe(false);
    expect(hostMatchesDomain('example.com.evil.org', 'example.com')).toBe(false);
  });
});

describe('extractShortCode', () => {
  it('accepts a bare code or a full short URL on our own domain', () => {
    expect(extractShortCode('gMW7g')).toBe('gMW7g');
    expect(extractShortCode('https://short.example.com/gMW7g')).toBe('gMW7g');
    expect(extractShortCode('  gMW7g  ')).toBe('gMW7g');
  });

  it('rejects codes from a different domain', () => {
    expect(extractShortCode('https://bit.ly/gMW7g')).toBeNull();
  });

  it('rejects malformed input', () => {
    for (const input of ['', '  ', 'ab', 'has spaces', 'a'.repeat(40)]) {
      expect(extractShortCode(input), input).toBeNull();
    }
  });
});
