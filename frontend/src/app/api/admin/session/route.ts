import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/config';
import { adminRequest, clearSession, writeSession, type SessionTokens } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST, sign in.
 *
 * Credentials are forwarded to the API; the returned tokens are stored in
 * httpOnly cookies and never sent to the browser, so only the admin profile
 * comes back in the response body.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${SERVER_API_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Preserve the real client IP so login rate limiting and the audit log
        // record the operator, not the Vercel edge.
        ...forwardClientHeaders(request),
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch (error) {
    // An unreachable API must not surface as an opaque 500 on the login screen.
    console.error(
      `[shorty] cannot reach the API at ${SERVER_API_URL}, ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_UNREACHABLE',
          message:
            `Could not reach the Shorty API at ${SERVER_API_URL}. ` +
            'Check that the API is running and that NEXT_PUBLIC_API_URL (or API_URL) points at it.',
        },
      },
      { status: 503 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as
    | { success: true; data: SessionTokens }
    | { success: false; error: { code: string; message: string } }
    | null;

  if (!upstream.ok || !payload || payload.success === false) {
    return NextResponse.json(
      payload ?? { success: false, error: { code: 'INTERNAL', message: 'Sign-in failed. Please try again.' } },
      { status: upstream.status || 500 },
    );
  }

  await writeSession(payload.data);

  return NextResponse.json({ success: true, data: { admin: payload.data.admin } });
}

/** DELETE, sign out. Revokes the session upstream, then drops the cookies. */
export async function DELETE() {
  await adminRequest('/api/v1/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
  await clearSession();
  return NextResponse.json({ success: true, data: { signedOut: true } });
}

function forwardClientHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of ['x-forwarded-for', 'x-vercel-forwarded-for', 'cf-connecting-ip', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}
