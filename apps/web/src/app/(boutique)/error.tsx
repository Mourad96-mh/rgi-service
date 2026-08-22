'use client';

import { useEffect } from 'react';
import { t } from '@/locales/fr';

/** Errors are surfaced to the user in French (CLAUDE.md §7), never as a blank screen. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap grid min-h-[50vh] place-items-center py-16 text-center sm:py-20">
      <div className="max-w-md">
        <h1 className="t-h1 font-display font-bold">{t.common.error}</h1>
        <p className="mt-3 text-muted">{t.common.apiDown}</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-7">
          Réessayer
        </button>
      </div>
    </div>
  );
}
