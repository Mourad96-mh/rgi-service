'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { OrderStatus, PaymentStatus } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL_FR) as OrderStatus[];
const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABEL_FR) as PaymentStatus[];

/** Filters live in the URL, so a filtered list can be bookmarked or shared with a colleague. */
export function OrderFilters({
  current,
}: {
  current: { status?: OrderStatus; payment?: PaymentStatus; q?: string };
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
    router.push(`/admin/commandes?${next.toString()}`);
  }

  return (
    // Full-width stacked fields on a phone; the row only forms once the search box and
    // the two selects fit side by side.
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: term.trim() || undefined });
        }}
        role="search"
        className="w-full sm:min-w-[240px] sm:flex-1"
      >
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-faint">{t.common.search}</span>
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t.admin.search}
            className="field"
          />
        </label>
      </form>

      <Select
        label={t.admin.orderStatus}
        value={current.status ?? ''}
        onChange={(value) => apply({ status: value || undefined })}
        options={ORDER_STATUSES.map((status) => ({
          value: status,
          label: ORDER_STATUS_LABEL_FR[status],
        }))}
      />

      <Select
        label={t.admin.paymentStatus}
        value={current.payment ?? ''}
        onChange={(value) => apply({ payment: value || undefined })}
        options={PAYMENT_STATUSES.map((status) => ({
          value: status,
          label: PAYMENT_STATUS_LABEL_FR[status],
        }))}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block w-full sm:w-auto sm:flex-1 md:flex-none">
      <span className="mb-1.5 block text-[12px] text-faint">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field sm:min-w-[150px]"
      >
        <option value="">{t.admin.filterAll}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
