import { eq } from 'drizzle-orm';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { db } from '../db/index.js';
import { adminUsers, type AdminRole } from '../db/schema.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../modules/admin/tokens.js';

export interface AuthenticatedAdmin {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

/** `owner` implies every `admin` right, which implies every `moderator` right. */
const ROLE_RANK: Record<AdminRole, number> = { moderator: 1, admin: 2, owner: 3 };

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

/**
 * Verifies the access token *and* re-reads the account.
 *
 * The extra query is deliberate: it is what makes deactivating an account or
 * bumping `tokenVersion` take effect immediately rather than whenever the
 * current access token happens to expire.
 */
export const requireAdmin: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearer(req);
    if (!token) throw AppError.unauthorized('Sign in to access this resource');

    const claims = await verifyAccessToken(token);
    const adminId = Number(claims.sub);
    if (!Number.isInteger(adminId) || adminId <= 0) throw AppError.unauthorized('Invalid session');

    const [account] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        tokenVersion: adminUsers.tokenVersion,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);

    if (!account) throw AppError.unauthorized('Account no longer exists');
    if (account.isActive !== 1) throw AppError.forbidden('This account has been deactivated');
    if (account.tokenVersion !== claims.tv) {
      throw AppError.unauthorized('Your session is no longer valid. Please sign in again.');
    }

    req.admin = { id: account.id, email: account.email, name: account.name, role: account.role };
    next();
  },
);

/** Route guard: requires at least the given role. Must run after `requireAdmin`. */
export function requireRole(minimum: AdminRole): RequestHandler {
  return (req, _res, next) => {
    if (!req.admin) return next(AppError.unauthorized('Sign in to access this resource'));
    if (ROLE_RANK[req.admin.role] < ROLE_RANK[minimum]) {
      return next(AppError.forbidden(`This action requires the ${minimum} role`));
    }
    next();
  };
}

export function currentAdmin(req: Request): AuthenticatedAdmin {
  if (!req.admin) throw AppError.unauthorized('Sign in to access this resource');
  return req.admin;
}
