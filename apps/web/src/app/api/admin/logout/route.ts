import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/env';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/admin/session';

/** Clears the session and kills the stored refresh hash server-side too. */
export async function POST(request: Request) {
  // `/auth/logout` identifies the session from the access token, not from a body.
  const accessToken = request.headers
    .get('cookie')
    ?.split('; ')
    .find((part) => part.startsWith(`${ACCESS_COOKIE}=`))
    ?.slice(ACCESS_COOKIE.length + 1);

  if (accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
