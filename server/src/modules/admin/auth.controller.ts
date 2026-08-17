import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { adminSessions, adminUsers } from '../../db/schema.js';
import { dummyPasswordHash, generateOpaqueToken, hashPassword, sha256, verifyPassword } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { sendOk } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { currentAdmin } from '../../middleware/auth.js';
import { emailSchema } from '../../middleware/validate.js';
import { recordAudit } from './audit.js';
import { refreshTokenExpiry, signAccessToken } from './tokens.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(200),
    newPassword: z
      .string()
      .min(12, 'Use at least 12 characters')
      .max(200)
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Choose a password you have not used here before',
    path: ['newPassword'],
  });

/* -------------------------------------------------------------------------- */
/*  Login                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Password login.
 *
 * Failures are deliberately indistinguishable, unknown email, wrong password,
 * and deactivated account all return the same 401 with the same wording, so the
 * endpoint cannot be used to enumerate valid admin addresses.
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const genericFailure = AppError.unauthorized('Incorrect email or password');

  // Warm the comparison hash before branching, so the one-off cost of deriving
  // it lands on whichever request happens to be first rather than only ever on
  // the unknown-account path, where it would itself be a timing signal.
  dummyPasswordHash();

  const [account] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  if (!account) {
    // Spend comparable time so a missing account is not detectably faster.
    await verifyPassword(password, dummyPasswordHash());
    await recordAudit({
      actor: null,
      action: 'admin.login_failed',
      entity: 'admin',
      entityId: email,
      meta: { reason: 'unknown_account' },
      client: req.client,
    });
    throw genericFailure;
  }

  if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
    // Same 401 and same wording as every other failure, and the same bcrypt
    // cost before it. A distinct 423 (or an early, hash-free return) would
    // confirm the address belongs to a real admin, which is precisely what the
    // generic failure exists to prevent. The lock is still enforced; the caller
    // simply is not told that it is the reason.
    await verifyPassword(password, account.passwordHash);
    await recordAudit({
      actor: { id: account.id, email: account.email },
      action: 'admin.login_failed',
      entity: 'admin',
      entityId: account.id,
      meta: { reason: 'locked', lockedUntil: account.lockedUntil.toISOString() },
      client: req.client,
    });
    logger.warn({ adminId: account.id, ip: req.client.ip }, 'login attempt on locked admin account');
    throw genericFailure;
  }

  const passwordOk = await verifyPassword(password, account.passwordHash);

  if (!passwordOk) {
    const attempts = account.failedAttempts + 1;
    const shouldLock = attempts >= env.ADMIN_MAX_FAILED_LOGINS;

    await db
      .update(adminUsers)
      .set({
        failedAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + env.ADMIN_LOCKOUT_MINUTES * 60_000) : null,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, account.id));

    await recordAudit({
      actor: { id: account.id, email: account.email },
      action: 'admin.login_failed',
      entity: 'admin',
      entityId: account.id,
      meta: { attempts, locked: shouldLock },
      client: req.client,
    });

    logger.warn({ adminId: account.id, attempts, ip: req.client.ip }, 'failed admin login');
    throw genericFailure;
  }

  if (account.isActive !== 1) {
    await recordAudit({
      actor: { id: account.id, email: account.email },
      action: 'admin.login_failed',
      entity: 'admin',
      entityId: account.id,
      meta: { reason: 'inactive' },
      client: req.client,
    });
    throw genericFailure;
  }

  const now = new Date();
  await db
    .update(adminUsers)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now, lastLoginIp: req.client.ip, updatedAt: now })
    .where(eq(adminUsers.id, account.id));

  const session = await issueSession(account.id, req);
  const access = await signAccessToken({
    adminId: account.id,
    email: account.email,
    role: account.role,
    tokenVersion: account.tokenVersion,
  });

  await recordAudit({
    actor: { id: account.id, email: account.email },
    action: 'admin.login',
    entity: 'admin',
    entityId: account.id,
    client: req.client,
  });

  return sendOk(res, {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.expiresAt,
    admin: { id: account.id, email: account.email, name: account.name, role: account.role },
  });
}

/* -------------------------------------------------------------------------- */
/*  Refresh                                                                   */
/* -------------------------------------------------------------------------- */

async function issueSession(adminId: number, req: Request) {
  const refreshToken = generateOpaqueToken(32);
  const expiresAt = refreshTokenExpiry();

  await db.insert(adminSessions).values({
    adminId,
    refreshTokenHash: sha256(refreshToken),
    userAgent: req.client.userAgent.slice(0, 255),
    ip: req.client.ip,
    expiresAt,
    createdAt: new Date(),
  });

  // Opportunistic cleanup so the table does not grow without bound.
  void db
    .delete(adminSessions)
    .where(lt(adminSessions.expiresAt, new Date()))
    .catch(() => undefined);

  return { refreshToken, expiresAt };
}

/**
 * Exchanges a refresh token for a new access token, rotating the refresh token
 * in the process. A used token is revoked immediately, so replaying a stolen
 * one after the legitimate client has refreshed simply fails.
 */
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  const tokenHash = sha256(refreshToken);

  const [session] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.refreshTokenHash, tokenHash),
        isNull(adminSessions.revokedAt),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) throw AppError.unauthorized('Your session has expired. Please sign in again.');

  const [account] = await db.select().from(adminUsers).where(eq(adminUsers.id, session.adminId)).limit(1);
  if (!account || account.isActive !== 1) {
    throw AppError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  await db.update(adminSessions).set({ revokedAt: new Date() }).where(eq(adminSessions.id, session.id));
  const rotated = await issueSession(account.id, req);

  const access = await signAccessToken({
    adminId: account.id,
    email: account.email,
    role: account.role,
    tokenVersion: account.tokenVersion,
  });

  return sendOk(res, {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken: rotated.refreshToken,
    refreshTokenExpiresAt: rotated.expiresAt,
    admin: { id: account.id, email: account.email, name: account.name, role: account.role },
  });
}

/* -------------------------------------------------------------------------- */
/*  Logout / profile                                                          */
/* -------------------------------------------------------------------------- */

export async function logout(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;

  if (refreshToken) {
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(adminSessions.refreshTokenHash, sha256(refreshToken)));
  } else {
    // No token supplied, end every session for this admin. Bump the token
    // version alongside it: revoking the refresh rows alone would leave the
    // access token issued with them valid for the rest of its TTL, so a
    // "sign out everywhere" would not actually sign anyone out for 30 minutes.
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminSessions.adminId, admin.id), isNull(adminSessions.revokedAt)));

    await db
      .update(adminUsers)
      .set({ tokenVersion: sql`${adminUsers.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(adminUsers.id, admin.id));
  }

  await recordAudit({ actor: admin, action: 'admin.logout', entity: 'admin', entityId: admin.id, client: req.client });
  return sendOk(res, { signedOut: true });
}

export async function me(req: Request, res: Response) {
  const admin = currentAdmin(req);

  const [account] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      lastLoginAt: adminUsers.lastLoginAt,
      lastLoginIp: adminUsers.lastLoginIp,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, admin.id))
    .limit(1);

  if (!account) throw AppError.unauthorized('Account no longer exists');
  return sendOk(res, account);
}

/** Changing a password bumps `tokenVersion`, invalidating every other device. */
export async function changePassword(req: Request, res: Response) {
  const admin = currentAdmin(req);
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

  const [account] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id)).limit(1);
  if (!account) throw AppError.unauthorized('Account no longer exists');

  const ok = await verifyPassword(currentPassword, account.passwordHash);
  if (!ok) throw AppError.badRequest('Your current password is not correct');

  await db
    .update(adminUsers)
    .set({
      passwordHash: await hashPassword(newPassword),
      tokenVersion: sql`${adminUsers.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, admin.id));

  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.adminId, admin.id), isNull(adminSessions.revokedAt)));

  await recordAudit({
    actor: admin,
    action: 'admin.password_changed',
    entity: 'admin',
    entityId: admin.id,
    client: req.client,
  });

  return sendOk(res, { changed: true, message: 'Password updated. Please sign in again.' });
}
