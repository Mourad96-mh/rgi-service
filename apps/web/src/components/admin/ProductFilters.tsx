'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ProductStatus } from '@rgi/types';
import { t } from '@/locales/fr';

const STATUSES: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: t.admin.fieldStatusActive },
  { value: 'draft', label: t.admin.fieldStatusDraft },
  { value: 'archived', label: t.admin.fieldStatusArchived },
];

export function ProductFilters({
  current,
}: {
  current: { q?: string; status?: ProductStatus };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(current.q ?? '');

  function apply(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.push(`/admin/produits?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: term.trim() || undefined });
        }}
        className="min-w-[240px] flex-1"
      >
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-faint">{t.common.search}</span>
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t.admin.productSearch}
            className="field"
          />
        </label>
      </form>

      <label className="block">
        <span className="mb-1.5 block text-[12px] text-faint">{t.admin.status}</span>
        <select
          value={current.status ?? ''}
          onChange={(event) => apply({ status: event.target.value || undefined })}
          className="field min-w-[150px]"
        >
          <option value="">{t.admin.filterAll}</option>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
