import { PUBLIC_API_URL } from './config';
import type { ApiResponse } from './types';

/**
 * Browser-side API client for the public endpoints.
 *
 * Errors from the API arrive as `{ success: false, error: {...} }`; they are
 * rethrown as `ApiError` so callers can `catch` uniformly regardless of whether
 * the failure was a network problem or an application-level rejection.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues?: { path: string; message: string }[];

  constructor(message: string, code = 'INTERNAL', status = 500, issues?: { path: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (issues) this.issues = issues;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(path: string, init: RequestInit = {}, baseUrl = PUBLIC_API_URL): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 'TIMEOUT', 408);
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', 'NETWORK', 0);
  } finally {
    clearTimeout(timeout);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response (proxy error page, gateway timeout...).
  }

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new ApiError(
      error?.message ?? `Request failed (${response.status})`,
      error?.code ?? 'INTERNAL',
      response.status,
      error?.issues,
    );
  }

  return payload.data;
}

/* -------------------------------------------------------------------------- */
/*  Public endpoints                                                          */
/* -------------------------------------------------------------------------- */

import type { PublicLink, PublicLinkStats, PublicStatsResponse } from './types';

export const api = {
  createLink: (url: string) =>
    request<PublicLink>('/api/v1/links', { method: 'POST', body: JSON.stringify({ url }) }),

  linkStats: (url: string) =>
    request<PublicLinkStats>('/api/v1/links/stats', { method: 'POST', body: JSON.stringify({ url }) }),

  trackQr: (url: string) =>
    request<{ tracked: boolean }>('/api/v1/links/qr', { method: 'POST', body: JSON.stringify({ url }) }).catch(
      // QR tracking is telemetry. Never surface a failure to the user.
      () => ({ tracked: false }),
    ),

  stats: () => request<PublicStatsResponse>('/api/v1/stats', { method: 'GET' }),

  submitReport: (body: { email: string; url: string; reason: string; detail: string }) =>
    request<{ received: boolean; message: string }>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  submitContact: (body: { fullname: string; email: string; subject?: string; message: string; website?: string }) =>
    request<{ received: boolean; message: string }>('/api/v1/contact', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

/* -------------------------------------------------------------------------- */
/*  Server-side fetch                                                         */
/* -------------------------------------------------------------------------- */

import { SERVER_API_URL } from './config';

/**
 * Server Component data fetch. Returns `null` instead of throwing so a page can
 * still render (with placeholders) when the API is briefly unavailable, an
 * outage should degrade the homepage, not blank it.
 */
export async function fetchFromServer<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      next: { revalidate: revalidateSeconds },
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiResponse<T>;
    return payload.success ? payload.data : null;
  } catch {
    return null;
  }
}
