import type { AuthResponse } from '@rgi/types';
import { API_URL } from '@/lib/env';

/**
 * The mechanics every browser-held session in this app needs: storage that survives
 * Safari's private mode, a single-flight refresh, and a fetch that retries once after
 * renewing the token.
 *
 * **Why a factory and not a module of functions:** there are two independent sessions on
 * one origin — a customer's and a member of staff's — and they must not share storage keys
 * or a refresh queue. A staff member browsing the shop while signed into the dashboard has
 * both at once; one clobbering the other would silently sign them out.
 *
 * The token lives in `localStorage` because the storefront is a static export with no
 * server to set an httpOnly cookie (DEPLOY_HOSTINGER.md). What that costs is written out in
 * full at the top of `lib/admin/session.ts` and applies here identically, with a smaller
 * blast radius: a stolen customer token reads that customer's own orders, and the API is
 * still the only thing that decides what anyone may do.
 *
 * TODO(refactor): `lib/admin/session.ts` predates this and still carries its own copy of
 * the same mechanics. It should be migrated onto this core — deliberately not in the same
 * change as a new customer-facing feature, because it is deployed staff auth and deserves
 * its own commit and its own verification.
 */

export interface SessionKeys {
  access: string;
  refresh: string;
  user: string;
}

/** An API refusal that already carries a French message worth showing the user. */
export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/** Thrown when the session is definitively gone; callers show a signed-out state. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expirée.');
    this.name = 'SessionExpiredError';
  }
}

/** French message out of an API error body, whatever shape it took. */
async function messageOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (!body.message) return fallback;
    return Array.isArray(body.message) ? body.message.join(' ') : body.message;
  } catch {
    return fallback;
  }
}

export function createSession(keys: SessionKeys) {
  /** `typeof window` guards exist because Next prerenders these pages at build time. */
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

  /**
   * Subscribers are how React learns the session changed. The snapshot is the raw stored
   * JSON, which is a stable string between writes — `useSyncExternalStore` compares it by
   * value, so an unchanged session never re-renders.
   */
  const listeners = new Set<() => void>();
  function notify(): void {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // Another tab signing in or out is the same event as this one doing it.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === keys.user) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  function setSession(auth: AuthResponse): void {
    write(keys.access, auth.accessToken);
    write(keys.refresh, auth.refreshToken);
    write(keys.user, JSON.stringify(auth.user));
    notify();
  }

  /**
   * Update only the cached user, leaving both tokens alone.
   *
   * Separate from `setSession` because the two are not interchangeable: `/auth/me` and a
   * profile edit return a `User` and no tokens, and putting that through `setSession`
   * would write an empty refresh token and end the session on the next renewal.
   */
  function setUser(user: unknown): void {
    write(keys.user, JSON.stringify(user));
    notify();
  }

  function clearSession(): void {
    remove(keys.access);
    remove(keys.refresh);
    remove(keys.user);
    notify();
  }

  /**
   * Single-flight refresh.
   *
   * The API rotates refresh tokens and treats a reused one as theft — it kills the whole
   * session. An account page fires several requests at once, so two of them hitting a
   * just-expired access token would refresh twice with the same token and sign the
   * customer out. Everyone waits on the same promise instead.
   */
  let inFlight: Promise<string | null> | null = null;

  function refreshAccess(): Promise<string | null> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const token = read(keys.refresh);
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
        write(keys.access, tokens.accessToken);
        write(keys.refresh, tokens.refreshToken);
        return tokens.accessToken;
      } catch {
        return null;
      } finally {
        // Cleared in a microtask so everyone who awaited this promise sees the same result
        // before the next request is allowed to start a fresh refresh.
        queueMicrotask(() => {
          inFlight = null;
        });
      }
    })();

    return inFlight;
  }

  /**
   * Fetch the API as the signed-in user. A 401 is retried exactly once, after a refresh;
   * if that fails the session is cleared and `SessionExpiredError` is thrown.
   */
  async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    let token = read(keys.access);
    if (!token) {
      token = await refreshAccess();
      if (!token) {
        clearSession();
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
        throw new SessionExpiredError();
      }
      res = await send(fresh);
      if (res.status === 401) {
        clearSession();
        throw new SessionExpiredError();
      }
    }

    if (!res.ok) {
      throw new AuthApiError(
        res.status,
        await messageOf(res, 'Le service est momentanément indisponible.'),
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Exchange credentials for a session. `path` is `/auth/login` or `/auth/register`. */
  async function authenticate(path: string, body: unknown): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new AuthApiError(res.status, await messageOf(res, 'Connexion impossible.'));
    }
    return (await res.json()) as AuthResponse;
  }

  /** End the session here and kill the stored refresh hash on the API too. */
  async function logout(): Promise<void> {
    const token = read(keys.access);
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }).catch(() => undefined);
    }
    clearSession();
  }

  return {
    accessToken: () => read(keys.access),
    hasSession: () => Boolean(read(keys.refresh)),
    rawUser: () => read(keys.user),
    subscribe,
    setSession,
    setUser,
    clearSession,
    authFetch,
    authenticate,
    logout,
  };
}
