import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { env } from '../../config/env.js';
import type { AdminRole } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

/**
 * Short-lived access tokens (JWT, HS256) plus long-lived opaque refresh tokens
 * stored hashed in `shorty_admin_session`. The access token carries only what a
 * request needs to authorise; anything else is read from the database.
 */

const ISSUER = 'shorty-api';
const AUDIENCE = 'shorty-admin';

const secretKey = new TextEncoder().encode(env.ADMIN_JWT_SECRET);

export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  email: string;
  role: AdminRole;
  /** Mirrors `admin_user.token_version`; bumping it revokes every live token. */
  tv: number;
}

export async function signAccessToken(input: {
  adminId: number;
  email: string;
  role: AdminRole;
  tokenVersion: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + env.ADMIN_ACCESS_TTL_MIN * 60_000);

  const token = await new SignJWT({
    email: input.email,
    role: input.role,
    tv: input.tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(input.adminId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey);

  return { token, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: 5,
    });

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      throw AppError.unauthorized('Malformed session token');
    }

    return payload as AccessTokenClaims;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string }).code;
    if (code === 'ERR_JWT_EXPIRED') throw AppError.unauthorized('Your session has expired. Please sign in again.');
    throw AppError.unauthorized('Invalid or expired session');
  }
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.ADMIN_REFRESH_TTL_DAYS * 24 * 60 * 60_000);
}
