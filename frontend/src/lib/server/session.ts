import 'server-only';
import { cookies } from 'next/headers';
import { SERVER_API_URL, SITE_URL } from '../config';
import type { AdminProfile } from '../types';

/**
 * Admin session, held entirely in httpOnly cookies on the Next.js server.
 *
 * The browser never sees the access or refresh token: the admin UI talks to
 * `/api/admin/proxy/*` on its own origin, and this module attaches the bearer
 * token server-side. That removes the XSS token-theft surface you get from
 * keeping a JWT in localStorage, and it keeps the API cross-origin-clean.
 */

export const ACCESS_COOKIE = 'shorty_admin_at';
export const REFRESH_COOKIE = 'shorty_admin_rt';

const isProduction = process.env.NODE_ENV === 'production';

const baseCookie = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Same-origin check for state-changing requests.
 *
 * `sameSite: 'lax'` above is a same-*site* control, and site means registrable
 * domain. This product deliberately runs `short.msyb.dev` next to
 * `shorty.msyb.dev`, so any page on any current or future `msyb.dev` subdomain
 * counts as same-site and gets the admin cookies attached on a cross-page
 * `fetch`. The attacker could not read the response, but every write landed:
 * bulk link actions, blocklist edits, and against an owner's browser, creating
 * a new admin account.
 *
 * Browsers always send `Origin` on unsafe methods, and the admin UI is
 * same-origin, so a missing header is a rejection rather than a pass. The host
 * the request actually arrived on is accepted alongside the configured one, so
 * preview deployments keep working when `NEXT_PUBLIC_SITE_URL` names production.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  let configuredHost: string | null = null;
  try {
    configuredHost = new URL(SITE_URL).host;
  } catch {
    configuredHost = null;
  }

  const arrivedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  return originHost === configuredHost || (arrivedHost !== null && originHost === arrivedHost);
}

/** The 403 every cross-site attempt gets, shaped like every other API error. */
export function crossOriginRejection(): { success: false; error: { code: string; message: string } } {
  return {
    success: false,
    error: { code: 'CROSS_ORIGIN', message: 'This request must come from the Shorty admin console.' },
  };
}

export interface SessionTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  admin: AdminProfile;
}

export async function writeSession(tokens: SessionTokens): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookie,
    expires: new Date(tokens.accessTokenExpiresAt),
  });

  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookie,
    // Only ever sent to the session/proxy routes that need it.
    path: '/api/admin',
    expires: new Date(tokens.refreshTokenExpiresAt),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, '', { ...baseCookie, maxAge: 0 });
  store.set(REFRESH_COOKIE, '', { ...baseCookie, path: '/api/admin', maxAge: 0 });
}

export async function readTokens(): Promise<{ accessToken?: string; refreshToken?: string }> {
  const store = await cookies();
  const result: { accessToken?: string; refreshToken?: string } = {};
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (access) result.accessToken = access;
  if (refresh) result.refreshToken = refresh;
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Authenticated calls to the API                                            */
/* -------------------------------------------------------------------------- */

export interface ProxyResult {
  status: number;
  body: unknown;
  /** Set when the access token was silently renewed during this call. */
  refreshed?: SessionTokens;
}

/** Give up rather than hanging a page render on an unresponsive API. */
const API_TIMEOUT_MS = 15_000;

class ApiUnreachableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'ApiUnreachableError';
  }
}

/**
 * Every call to the API goes through here so a transport failure becomes a
 * described result instead of an unhandled throw. Without this, a wrong
 * `NEXT_PUBLIC_API_URL` or a momentarily unreachable API surfaces as a bare
 * Next.js 500 with nothing in it to diagnose.
 */
async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${SERVER_API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiUnreachableError(
      timedOut ? `timed out after ${API_TIMEOUT_MS / 1000}s` : cause,
    );
  }
}

function unreachable(error: ApiUnreachableError): ProxyResult {
  // Log server-side with the resolved URL; that is the fact you actually need.
  console.error(`[shorty] cannot reach the API at ${SERVER_API_URL}, ${error.reason}`);

  return {
    status: 503,
    body: {
      success: false,
      error: {
        code: 'API_UNREACHABLE',
        message:
          `Could not reach the Shorty API at ${SERVER_API_URL}. ` +
          'Check that the API is running and that NEXT_PUBLIC_API_URL (or API_URL) points at it.',
      },
    },
  };
}

async function callApi(path: string, accessToken: string, init: RequestInit): Promise<Response> {
  return apiFetch(path, {
    ...init,
    headers: {
      ...init.headers,
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Performs an authenticated request, transparently refreshing the access token
 * once if the API rejects it. The caller is responsible for persisting
 * `refreshed` tokens, since only a Route Handler can write cookies.
 */
export async function adminRequest(path: string, init: RequestInit = {}): Promise<ProxyResult> {
  const { accessToken, refreshToken } = await readTokens();

  try {
    if (accessToken) {
      const response = await callApi(path, accessToken, init);
      if (response.status !== 401) {
        return { status: response.status, body: await safeJson(response) };
      }
    }

    if (!refreshToken) {
      return {
        status: 401,
        body: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Your session has ended. Please sign in again.' },
        },
      };
    }

    const refreshResponse = await apiFetch('/api/v1/admin/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      return {
        status: 401,
        body: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Your session has ended. Please sign in again.' },
        },
      };
    }

    const refreshPayload = (await refreshResponse.json()) as { success: boolean; data: SessionTokens };
    const tokens = refreshPayload.data;

    const retry = await callApi(path, tokens.accessToken, init);
    return { status: retry.status, body: await safeJson(retry), refreshed: tokens };
  } catch (error) {
    if (error instanceof ApiUnreachableError) return unreachable(error);
    throw error;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: { code: 'INTERNAL', message: `Unexpected response from the API (${response.status})` },
    };
  }
}

/** Convenience for Server Components that only need the signed-in identity. */
export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const result = await adminRequest('/api/v1/admin/auth/me');
  if (result.status !== 200) return null;
  const payload = result.body as { success?: boolean; data?: AdminProfile };
  return payload?.success && payload.data ? payload.data : null;
}
