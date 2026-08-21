import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@rgi/types';
import { API_URL } from '@/lib/env';

export const ACCESS_COOKIE = 'rgi_at';
export const REFRESH_COOKIE = 'rgi_rt';

/**
 * Server-side access to the admin API.
 *
 * The tokens live in **httpOnly cookies**, never in localStorage: ADMIN_DASHBOARD.md §1
 * requires a server check before any admin data is rendered, and a server component can
 * only do that if it can read the credential itself. The browser never sees the JWT.
 */
export function accessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/** Fetch the API as the signed-in member of staff. 401 sends them back to the login. */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = accessToken();
  if (!token) redirect('/admin/login');

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (res.status === 401) redirect('/admin/login');

  if (!res.ok) {
    let message = 'Le service est momentanément indisponible.';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    } catch {
      // keep the generic French message
    }
    throw new AdminApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** The signed-in member of staff, for the shell header. */
export function currentStaff(): Promise<User> {
  return adminFetch<User>('/auth/me');
}
