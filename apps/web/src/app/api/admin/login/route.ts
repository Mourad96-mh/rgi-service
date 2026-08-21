import { NextResponse } from 'next/server';
import type { AuthResponse } from '@rgi/types';
import { hasAtLeastRole } from '@rgi/types';
import { API_URL } from '@/lib/env';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/admin/session';

const ACCESS_MAX_AGE = 15 * 60; // matches JWT_ACCESS_TTL
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // matches JWT_REFRESH_TTL

/**
 * Exchanges the staff credentials for tokens and stores them in httpOnly cookies, so the
 * JWT never reaches client JavaScript. A customer account is refused here rather than at
 * the first admin request — the API would refuse it too, but the message is clearer.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(error.message)
      ? error.message.join(' ')
      : (error.message ?? 'Connexion impossible.');
    return NextResponse.json({ message }, { status: res.status });
  }

  const auth = (await res.json()) as AuthResponse;
  if (!hasAtLeastRole(auth.user.role, 'staff')) {
    return NextResponse.json(
      { message: 'Ce compte n’a pas accès à l’administration.' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ ok: true, name: auth.user.name });
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE, auth.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, auth.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
