import type { AuthResponse, User } from '@rgi/types';
import { hasAtLeastRole } from '@rgi/types';
import { API_URL } from '@/lib/env';

/**
 * The staff session, held in the browser.
 *
 * This used to be a pair of **httpOnly cookies** read by `middleware.ts` and a set of
 * route handlers, which is the stronger design and the one ADMIN_DASHBOARD.md §1 asks for:
 * the JWT never reached client JavaScript, and no admin HTML rendered before the server
 * had checked the session. It needed a Node server to do any of that.
 *
 * The dashboard now ships inside the static export on Hostinger, which runs no server at
 * all (DEPLOY_HOSTINGER.md), so there is nothing left to read a cookie. The token moves to
 * `localStorage` and travels as `Authorization: Bearer`, the same way CHUN WAH and mat-den
 * do it.
 *
 * **What that costs, stated plainly:** a token in `localStorage` is readable by any script
 * running on this origin, so an XSS anywhere on rgiservice.ma can steal a staff session —
 * an httpOnly cookie could not be stolen that way. Two things limit the blast radius, and
 * neither is a substitute for knowing this:
 *   - the access token lasts 15 minutes, and `clearSession()` on any failed refresh means
 *     a stolen one dies with the refresh token it was rotated from;
 *   - **the real gate is the API.** Every admin route is behind `@Roles('staff')` or
 *     `@Roles('admin')` on NestJS. The guard below decides what staff *see*, never what
 *     they may *do* — a forged localStorage entry gets 401s and an empty screen.
 */

const ACCESS_KEY = 'rgi_admin_at';
const REFRESH_KEY = 'rgi_admin_rt';
const STAFF_KEY = 'rgi_admin_staff';

/** `typeof window` guards exist because Next still prerenders these pages at build time. */
function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Safari in private mode throws on access rather than returning null.
    return null;
  }
}

function write(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing useful to do: the session simply will not survive a reload.
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function accessToken(): string | null {
  return read(ACCESS_KEY);
}

export function refreshToken(): string | null {
  return read(REFRESH_KEY);
}

/**
 * The signed-in staff member as of the last successful check.
 *
 * Cached so the shell can paint its own header without waiting for `/auth/me`. It is a
 * convenience, never a credential — `requireStaff()` re-asks the API on every page load.
 */
export function cachedStaff(): User | null {
  const raw = read(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(auth: AuthResponse): void {
  write(ACCESS_KEY, auth.accessToken);
  write(REFRESH_KEY, auth.refreshToken);
  write(STAFF_KEY, JSON.stringify(auth.user));
}

export function clearSession(): void {
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
  remove(STAFF_KEY);
}

export function hasSession(): boolean {
  return Boolean(refreshToken());
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

/** Thrown when the session is gone. Callers let it bubble; the shell sends staff to login. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expirée.');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Send staff back to the login, remembering where they were.
 *
 * A full assignment rather than `router.replace`: this is called from `adminFetch`, which
 * is not a React component and has no router, and a hard navigation also guarantees no
 * half-rendered page keeps polling with a dead token.
 */
export function toLogin(): void {
  if (typeof window === 'undefined') return;
  const here = window.location.pathname + window.location.search;
  const next = here.startsWith('/admin') && !here.startsWith('/admin/login') ? here : '';
  window.location.replace(`/admin/login/${next ? `?suivant=${encodeURIComponent(next)}` : ''}`);
}

/**
 * Single-flight refresh.
 *
 * The API rotates refresh tokens and treats a reused one as theft — it kills the whole
 * session. A dashboard page fires several requests at once (`/admin/stats` and
 * `/admin/orders` on the home page alone), so two of them hitting a just-expired access
 * token would refresh twice with the same token and log staff out. Everyone waits on the
 * same promise instead.
 */
let inFlight: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const token = refreshToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
      write(ACCESS_KEY, tokens.accessToken);
      write(REFRESH_KEY, tokens.refreshToken);
      return tokens.accessToken;
    } catch {
      return null;
    } finally {
      // Cleared in a microtask so callers that awaited this promise all see the same result
      // before the next request is allowed to start a fresh refresh.
      queueMicrotask(() => {
        inFlight = null;
      });
    }
  })();

  return inFlight;
}

/**
 * Fetch the API as the signed-in member of staff.
 *
 * A 401 is retried exactly once, after a refresh. If the refresh fails the session is
 * cleared and `SessionExpiredError` is thrown — the shell turns that into a redirect, so
 * a mutation component never has to know about login.
 */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = accessToken();
  if (!token) {
    token = await refreshAccess();
    if (!token) {
      clearSession();
      toLogin();
      throw new SessionExpiredError();
    }
  }

  const send = (bearer: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

  let res = await send(token);

  if (res.status === 401) {
    const fresh = await refreshAccess();
    if (!fresh) {
      clearSession();
      toLogin();
      throw new SessionExpiredError();
    }
    res = await send(fresh);
    if (res.status === 401) {
      clearSession();
      toLogin();
      throw new SessionExpiredError();
    }
  }

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

/**
 * Confirm with the API who is signed in, and refuse a customer account.
 *
 * The shell calls this before rendering anything. It is a fresh `/auth/me` on every load
 * rather than a read of `cachedStaff()` on purpose: role changes and revoked sessions have
 * to take effect without staff clearing their browser storage.
 */
export async function requireStaff(): Promise<User> {
  const user = await adminFetch<User>('/auth/me');
  if (!hasAtLeastRole(user.role, 'staff')) {
    clearSession();
    toLogin();
    throw new SessionExpiredError();
  }
  write(STAFF_KEY, JSON.stringify(user));
  return user;
}

/**
 * Exchange credentials for a session.
 *
 * A customer account is refused here rather than at the first admin request — the API
 * would refuse it too, but "ce compte n'a pas accès" is a far clearer answer than a
 * dashboard full of 403s.
 */
export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(error.message)
      ? error.message.join(' ')
      : (error.message ?? 'Connexion impossible.');
    throw new AdminApiError(res.status, message);
  }

  const auth = (await res.json()) as AuthResponse;
  if (!hasAtLeastRole(auth.user.role, 'staff')) {
    throw new AdminApiError(403, 'Ce compte n’a pas accès à l’administration.');
  }

  setSession(auth);
  return auth.user;
}

/** End the session here and kill the stored refresh hash on the API too. */
export async function logout(): Promise<void> {
  const token = accessToken();
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => undefined);
  }
  clearSession();
}
