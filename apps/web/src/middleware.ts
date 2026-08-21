import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/admin/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Gate for `/admin/*` (ADMIN_DASHBOARD.md §1): no session, no admin HTML — the check
 * happens before a page renders, not inside it.
 *
 * The access token lasts 15 minutes, which would log staff out constantly, so this also
 * silently rotates it with the refresh token when it has expired. Refresh is skipped for
 * RSC/prefetch requests: the API rotates refresh tokens and treats reuse as theft, so two
 * parallel refreshes would kill the session.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return redirectToLogin(request);

  if (request.cookies.get(ACCESS_COOKIE)) return NextResponse.next();

  const isDocumentRequest =
    !request.headers.get('RSC') && !request.headers.get('Next-Router-Prefetch');
  if (!isDocumentRequest) return NextResponse.next();

  return refresh(request, refreshToken);
}

async function refresh(request: NextRequest, refreshToken: string) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return redirectToLogin(request);

    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
    const response = NextResponse.next();
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = `?suivant=${encodeURIComponent(request.nextUrl.pathname)}`;
  const response = NextResponse.redirect(url);
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
