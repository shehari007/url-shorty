import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

/** Characters used for short codes. No `0/O/1/l/I` ambiguity when read aloud. */
const CODE_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Paths the redirect host serves itself. A generated code must never collide
 * with one of these or the short link would shadow a real route.
 */
export const RESERVED_CODES = new Set([
  'api',
  'admin',
  'health',
  'co',
  'static',
  'assets',
  'favicon',
  'robots',
  'sitemap',
  'terms',
  'privacy',
  'contact',
  'report',
  'stats',
  'analytics',
  'login',
  'logout',
  'about',
  'help',
  'docs',
  'null',
  'undefined',
]);

/**
 * Cryptographically-secure short code. `randomInt` is rejection-sampled by Node,
 * so unlike `Math.random() * len` this has no modulo bias across the alphabet.
 */
export function generateShortCode(length: number = env.PARAMLEN): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase());
}

/** Opaque, URL-safe token used for admin refresh tokens. */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

let dummyHash: string | undefined;

/**
 * A real bcrypt hash, of a value nobody knows, for the login path to compare
 * against when the email matches no account. Verifying it costs the same as
 * verifying a genuine one, so an attacker cannot tell the two apart by timing.
 *
 * It has to be *generated*, never a hand-written literal: bcryptjs validates
 * the hash shape first and returns immediately if it is malformed. The literal
 * previously used here was 65 characters instead of 60, so the "equalising"
 * comparison finished in 0.04 ms against 265 ms for a real account, a 6800x
 * difference that enumerated every admin address in one request each.
 *
 * Computed lazily. At cost 12 this takes ~250 ms, and the redirect path imports
 * this module too, so it must not land on every cold start.
 */
export function dummyPasswordHash(): string {
  if (dummyHash === undefined) {
    dummyHash = bcrypt.hashSync(generateOpaqueToken(32), BCRYPT_ROUNDS);
    if (dummyHash.length !== 60) {
      throw new Error(`bcrypt returned a ${dummyHash.length}-character hash; the login timing guard is broken`);
    }
  }
  return dummyHash;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Constant-time string comparison that does not leak length through timing. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = createHash('sha256').update(a).digest();
  const bufB = createHash('sha256').update(b).digest();
  return timingSafeEqual(bufA, bufB);
}
