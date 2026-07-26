'use client';

import type { ApiMeta, ApiResponse } from './types';

/**
 * Client for the admin console.
 *
 * Requests go to `/api/admin/proxy/*` on this origin; the Next.js server
 * attaches the bearer token from an httpOnly cookie. No token ever reaches
 * browser-accessible storage.
 */

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues?: { path: string; message: string }[];

  constructor(message: string, code: string, status: number, issues?: { path: string; message: string }[]) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
    if (issues) this.issues = issues;
  }

  /** True when the session is gone and the operator needs to sign in again. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface Paged<T> {
  data: T[];
  meta: ApiMeta;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta?: ApiMeta }> {
  const response = await fetch(`/api/admin/proxy/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Fall through to the generic error below.
  }

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new AdminApiError(
      error?.message ?? `Request failed (${response.status})`,
      error?.code ?? 'INTERNAL',
      response.status,
      error?.issues,
    );
  }

  const result: { data: T; meta?: ApiMeta } = { data: payload.data };
  if (payload.meta) result.meta = payload.meta;
  return result;
}

function withQuery(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const adminApi = {
  get: <T>(path: string, params?: Record<string, unknown>) => call<T>(withQuery(path, params)),

  post: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),

  patch: <T>(path: string, body: unknown) => call<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) => call<T>(path, { method: 'DELETE' }),
};

/* -------------------------------------------------------------------------- */
/*  Session                                                                   */
/* -------------------------------------------------------------------------- */

import type { AdminProfile } from './types';

export async function signIn(email: string, password: string): Promise<AdminProfile> {
  const response = await fetch('/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<{ admin: AdminProfile }> | null;

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new AdminApiError(
      error?.message ?? 'Sign-in failed. Please try again.',
      error?.code ?? 'INTERNAL',
      response.status,
      error?.issues,
    );
  }

  return payload.data.admin;
}

export async function signOut(): Promise<void> {
  await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
}
