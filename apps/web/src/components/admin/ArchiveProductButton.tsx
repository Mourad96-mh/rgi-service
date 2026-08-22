'use client';

import { useState, useTransition } from 'react';
import { t } from '@/locales/fr';
import { archiveProduct } from '@/app/admin/(shell)/produits/actions';

/**
 * Take a product off the shop from the list, without opening its form.
 *
 * It archives rather than deletes — the confirm text says so in as many words, because
 * "Supprimer" on a button that does not destroy anything is worse than a longer label.
 * Already-archived products show the state instead of a button, so the action is never
 * offered when it would do nothing.
 */
export function ArchiveProductButton({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (archived) {
    return <span className="text-[11.5px] text-faint">{t.admin.alreadyArchived}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t.admin.archiveConfirm.replace('{name}', name))) return;
          setError(null);
          startTransition(async () => {
            const result = await archiveProduct(id);
            if (!result.ok) setError(result.message ?? t.common.error);
          });
        }}
        className="inline-flex min-h-[44px] items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent3 hover:text-accent3 disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
      >
        {pending ? t.admin.archiving : t.admin.archive}
      </button>
      {error ? <span className="text-[11px] text-accent3">{error}</span> : null}
    </div>
  );
}
