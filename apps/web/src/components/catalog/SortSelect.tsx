'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { t } from '@/locales/fr';

const OPTIONS = [
  { value: '', label: t.category.sortNewest },
  { value: 'price_asc', label: t.category.sortPriceAsc },
  { value: 'price_desc', label: t.category.sortPriceDesc },
  { value: 'popular', label: t.category.sortPopular },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('sort') ?? '';

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">{t.category.sort}</span>
      <select
        value={current}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) params.set('sort', event.target.value);
          else params.delete('sort');
          params.delete('page');
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="rounded-sm2 border border-line bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
