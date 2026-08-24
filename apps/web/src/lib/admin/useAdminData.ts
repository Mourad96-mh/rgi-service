'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminApiError, SessionExpiredError } from './session';

export interface AdminData<T> {
  data: T | null;
  error: string | null;
  /** True only on the first load, so a refresh after a save does not blank the screen. */
  loading: boolean;
  reload: () => void;
}

/**
 * Load admin data in the browser.
 *
 * Every dashboard page used to be a server component that awaited `adminFetch` before
 * rendering. In a static export there is no server render, so the page ships as HTML with
 * no data in it and asks the API once it is on screen — this hook is that pattern, in one
 * place, so ten pages do not each grow their own copy of it.
 *
 * `reload` is what replaces `revalidatePath`: a mutation component calls it when it
 * succeeds and the page re-asks the API. Nothing is cached between pages, which is the
 * right default here — staff act on stock and orders that other people are changing too.
 *
 * A `SessionExpiredError` is deliberately swallowed: `adminFetch` has already sent the
 * browser to the login by the time it is thrown, and showing "Session expirée" for the
 * split second before the page unloads only looks like a bug.
 */
export function useAdminData<T>(load: () => Promise<T>, deps: unknown[] = []): AdminData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // The loader closes over props that change on every render; a ref keeps it out of the
  // effect's dependency list so the page does not fetch in a loop.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;

    loadRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled || cause instanceof SessionExpiredError) return;
        setError(
          cause instanceof AdminApiError ? cause.message : 'Le service est momentanément indisponible.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { data, error, loading, reload };
}
