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
