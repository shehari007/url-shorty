import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (and the exported function
 * from `middleware` to `proxy`). It runs on the Node.js runtime; the edge
 * runtime is not supported here.
 *
 * This is a cheap first gate only. It checks that a session cookie exists so
 * signed-out visitors are bounced to the login page without a round trip. The
 * real authorisation happens server-side on every admin API call.
 */

const SESSION_COOKIE = 'shorty_admin_rt';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL('/admin/login', request.url);
  const target = `${pathname}${search}`;
  if (target !== '/admin') loginUrl.searchParams.set('next', target);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
