'use client';

import { useState, useTransition } from 'react';
import { t } from '@/locales/fr';
import { setStock } from '@/app/admin/(shell)/produits/actions';

/** Inline stock correction — the most common thing staff need to change in a hurry. */
export function StockCell({
  id,
  stock,
  threshold,
}: {
  id: string;
  stock: number;
  threshold: number;
}) {
  const [value, setValue] = useState(String(stock));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== String(stock);
  const low = stock <= threshold;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={t.admin.stock}
        className={`w-[76px] rounded-md border bg-bg2 px-2 py-1.5 text-[13px] ${
          low ? 'border-warn text-warn' : 'border-line'
        }`}
      />
      {dirty ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setStock(id, Number(value));
              if (!result.ok) setError(result.message ?? t.common.error);
            });
          }}
          className="rounded-md bg-grad px-2.5 py-1.5 text-[11.5px] font-semibold text-bg disabled:opacity-50"
        >
          {t.admin.adjustStock}
        </button>
      ) : null}
      {error ? <span className="text-[11px] text-accent3">{error}</span> : null}
    </div>
  );
}
