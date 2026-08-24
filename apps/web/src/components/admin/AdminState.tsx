'use client';

import { t } from '@/locales/fr';

/**
 * The two screens a server-rendered dashboard never needed.
 *
 * Every admin page now fetches after it is on screen, so each one has a moment with no
 * data and a way to have failed. Both are here rather than repeated ten times, so they
 * look the same everywhere and staff learn one shape.
 */

/** Skeletons rather than a spinner: the page keeps its size, so nothing jumps on arrival. */
export function AdminLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={t.common.loading}>
      <div className="h-8 w-56 animate-pulse rounded-md bg-text/[.07]" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="surface-card h-24 animate-pulse" />
      ))}
    </div>
  );
}

/**
 * A failure staff can act on: what went wrong, and a button to try again.
 *
 * The retry matters more here than it would on the shop. The API is on Render's free plan
 * and sleeps after 15 minutes, so the first request of the morning can simply time out —
 * pressing "Réessayer" once is usually the whole fix.
 */
export function AdminError({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="surface-card flex flex-col items-start gap-4 p-6">
      <p role="alert" className="text-[13.5px] text-accent3">
        {message ?? t.admin.loadFailed}
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-ghost">
          {t.admin.retry}
        </button>
      ) : null}
    </div>
  );
}
