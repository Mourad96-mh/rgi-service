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
    <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
      <span className="hidden shrink-0 sm:inline">{t.category.sort}</span>
      {/*
        `text-base` under `sm` for the same reason as `.field`: iOS Safari zooms the whole
        page in when a focused control's text is under 16 px. The width is capped so the
        longest option ("Prix décroissant") cannot push the result count off a 320 px row.
      */}
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
        className="min-h-[44px] w-full min-w-0 max-w-[180px] rounded-sm2 border border-line bg-surface
          px-3 py-2 text-base text-text focus:border-accent focus:outline-none sm:min-h-0
          sm:max-w-none sm:text-sm"
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
