import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL } from '@/lib/env';
import { ACCESS_COOKIE } from '@/lib/admin/session';

/**
 * Destroys a Cloudinary asset on behalf of the signed-in staff member.
 *
 * POST, not DELETE, and the id travels in the body: a Cloudinary public id contains
 * slashes, and putting it in the path here would mean escaping it correctly through two
 * hops. The API still enforces that the id sits inside this project's folder.
 */
export async function POST(request: Request) {
  const token = cookies().get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Session expirée.' }, { status: 401 });
  }

  const { publicId } = (await request.json().catch(() => ({}))) as { publicId?: string };
  if (!publicId) {
    return NextResponse.json({ message: 'Image manquante.' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/media/${publicId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(' ')
      : (body.message ?? "Suppression impossible.");
    return NextResponse.json({ message }, { status: res.status });
  }

  return NextResponse.json(body);
}
