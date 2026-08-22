'use client';

import { useState, useTransition } from 'react';
import { t } from '@/locales/fr';
import { deleteProductForever, fetchProductUsage } from '@/app/admin/(shell)/produits/actions';

/**
 * The "delete" the Produits section owns — destroying the record itself, as opposed to
 * `ArchiveProductButton`, which retires a product that has a past.
 *
 * It asks the API what the product is referenced by *before* asking staff anything. A
 * product that has been ordered, or that sits inside a saved configurator build, can only
 * be archived: destroying it would leave those order lines and shared builds pointing at
 * nothing. In that case this explains why instead of offering a button that would fail.
 *
 * The typed keyword is deliberate friction. Everything else in the dashboard is undoable;
 * this is not, so it should not be reachable by the same reflex that dismisses a confirm.
 */
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const busy = pending || checking;

  async function onClick() {
    setMessage(null);
    setChecking(true);
    const usage = await fetchProductUsage(id);
    setChecking(false);

    if (!usage) {
      setMessage(t.admin.deleteFailed);
      return;
    }

    if (!usage.canDelete) {
      setMessage(t.admin.deleteOnlyArchive);
      return;
    }

    if (!window.confirm(t.admin.deleteConfirm.replace('{name}', name))) return;

    const typed = window.prompt(t.admin.deleteTypeToConfirm);
    if (typed?.trim().toUpperCase() !== t.admin.deleteKeyword) return;

    startTransition(async () => {
      const result = await deleteProductForever(id);
      if (!result.ok) setMessage(result.message ?? t.common.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="inline-flex min-h-[44px] items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent3 hover:text-accent3 disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
      >
        {checking ? t.admin.checkingUsage : pending ? t.admin.deleting : t.admin.delete}
      </button>
      {/* The refusal is a full sentence, not a toast: it explains a rule staff need to
          understand once, and it should stay on screen while they read it. */}
      {message ? (
        <span className="max-w-[34ch] text-left text-[11px] leading-snug text-accent3 sm:text-right">
          {message}
        </span>
      ) : null}
    </div>
  );
}
