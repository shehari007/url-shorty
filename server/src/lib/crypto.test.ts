import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { dummyPasswordHash, generateOpaqueToken, generateShortCode, isReservedCode, safeEqual } from './crypto.js';

/**
 * The dummy hash exists purely to make an unknown-email login cost the same as
 * a real one. It is worth a test because the failure is completely silent: a
 * malformed hash still "works" as far as the login flow is concerned, it just
 * returns false 6800x faster and turns the endpoint into an account oracle.
 */
describe('dummyPasswordHash', () => {
  it('is a structurally valid 60-character bcrypt hash', () => {
    const hash = dummyPasswordHash();
    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('costs the same to verify as a genuine hash', () => {
    const real = bcrypt.hashSync('correct-horse-battery-staple', 12);
    const time = (hash: string) => {
      const started = process.hrtime.bigint();
      bcrypt.compareSync('an-attempted-password', hash);
      return Number(process.hrtime.bigint() - started) / 1e6;
    };

    const ratio = time(real) / time(dummyPasswordHash());
    // A malformed hash short-circuits and lands in the thousands here.
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
  });

  it('is stable across calls', () => {
    expect(dummyPasswordHash()).toBe(dummyPasswordHash());
  });
});

describe('generateShortCode', () => {
  it('honours the requested length and avoids ambiguous characters', () => {
    const code = generateShortCode(12);
    expect(code).toHaveLength(12);
    expect(code).not.toMatch(/[01OIl]/);
  });

  it('does not repeat over many draws', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateShortCode(8)));
    expect(codes.size).toBe(500);
  });
});

describe('isReservedCode', () => {
  it('matches regardless of case', () => {
    expect(isReservedCode('admin')).toBe(true);
    expect(isReservedCode('ADMIN')).toBe(true);
    expect(isReservedCode('gMW7g')).toBe(false);
  });
});

describe('generateOpaqueToken', () => {
  it('is URL-safe and unique', () => {
    const tokens = Array.from({ length: 200 }, () => generateOpaqueToken(32));
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(new Set(tokens).size).toBe(200);
  });
});

describe('safeEqual', () => {
  it('compares by value, including across differing lengths', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'much longer string')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});
