import { NextResponse } from 'next/server';
import { adminRequest, clearSession, crossOriginRejection, isSameOrigin, writeSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated pass-through to the admin API.
 *
 * The browser calls `/api/admin/proxy/<path>` on its own origin; this handler
 * attaches the bearer token from the httpOnly cookie, and persists any token
 * that got rotated during the call (a Server Component could not do that).
 *
 * Only `/api/v1/admin/**` is reachable, so the proxy cannot be turned into an
 * open relay to the rest of the API or to arbitrary hosts.
 */

type Params = { params: Promise<{ path: string[] }> };

async function handle(request: Request, { params }: Params, method: string) {
  // Only unsafe methods need the check: a cross-origin GET is sent by the
  // browser but its response is unreadable without CORS headers, which this
  // route never sets.
  if (method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json(crossOriginRejection(), { status: 403 });
  }

  const { path } = await params;

  const segments = path.filter((segment) => segment !== '..' && segment !== '.');
  if (segments.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing path' } },
      { status: 400 },
    );
  }

  const search = new URL(request.url).search;
  const target = `/api/v1/admin/${segments.map(encodeURIComponent).join('/')}${search}`;

  const init: RequestInit = { method };
  if (method !== 'GET' && method !== 'DELETE') {
    const raw = await request.text();
    if (raw) {
      init.body = raw;
      init.headers = { 'Content-Type': 'application/json' };
    }
  }

  const result = await adminRequest(target, init);

  // Cookie writes must happen before the response object is created, the
  // request-scoped cookie store is applied to whatever the handler returns.
  if (result.refreshed) {
    await writeSession(result.refreshed);
  } else if (result.status === 401) {
    // The refresh token is gone or rejected, clear the stale cookies so the
    // UI stops retrying and sends the operator back to the sign-in page.
    await clearSession();
  }

  const response = NextResponse.json(result.body, { status: result.status });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const GET = (request: Request, ctx: Params) => handle(request, ctx, 'GET');
export const POST = (request: Request, ctx: Params) => handle(request, ctx, 'POST');
export const PATCH = (request: Request, ctx: Params) => handle(request, ctx, 'PATCH');
export const PUT = (request: Request, ctx: Params) => handle(request, ctx, 'PUT');
export const DELETE = (request: Request, ctx: Params) => handle(request, ctx, 'DELETE');
