import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL } from '@/lib/env';
import { ACCESS_COOKIE } from '@/lib/admin/session';

/**
 * Hands the admin browser a Cloudinary upload signature.
 *
 * The uploader is a client component, but the staff JWT lives in an **httpOnly** cookie it
 * cannot read — so it cannot call the API itself. This same-origin handler reads the
 * cookie server-side and forwards the request. The Cloudinary secret stays on the API and
 * the JWT stays out of client JavaScript.
 */
export async function POST() {
  const token = cookies().get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Session expirée.' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/media/sign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(' ')
      : (body.message ?? "Impossible de préparer l'envoi.");
    return NextResponse.json({ message }, { status: res.status });
  }

  return NextResponse.json(body);
}
