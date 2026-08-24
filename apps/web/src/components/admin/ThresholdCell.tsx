'use client';

import { useState, useTransition } from 'react';
import { t } from '@/locales/fr';
import { setThreshold } from '@/app/admin/(shell)/stock/actions';

/**
 * The per-product alert threshold, edited in place next to the quantity it governs.
 *
 * It sits here rather than on the product form because a threshold is only meaningful
 * beside the current stock: staff set it while looking at how fast something is moving,
 * not while writing a description.
 */
export function ThresholdCell({
  id,
  threshold,
  onDone,
}: {
  id: string;
  threshold: number;
  onDone?: () => void;
}) {
  const [value, setValue] = useState(String(threshold));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== String(threshold);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 16 px and a 44 px box on touch — anything smaller and iOS zooms the whole page in
          on focus; the compact table sizing returns from `sm` up. */}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={t.admin.stockThreshold}
        className="w-[92px] rounded-md border border-line bg-bg2 px-3 py-2.5 text-base sm:w-[76px] sm:px-2 sm:py-1.5 sm:text-[13px]"
      />
      {dirty ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setThreshold(id, Number(value));
              if (result.ok) onDone?.();
              else setError(result.message ?? t.common.error);
            });
          }}
          className="inline-flex min-h-[44px] items-center rounded-md bg-grad px-3.5 text-[13px] font-semibold text-bg disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
        >
          {t.admin.save}
        </button>
      ) : null}
      {error ? <span className="text-[11px] text-accent3">{error}</span> : null}
    </div>
  );
}
