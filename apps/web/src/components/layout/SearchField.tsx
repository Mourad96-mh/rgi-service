'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { SearchIcon } from '@/components/ui/Icons';

/** Header search. Submits to the search page; live suggestions come later. */
export function SearchField() {
  const router = useRouter();
  const [value, setValue] = useState('');

  return (
    <form
      role="search"
      className="hidden w-full max-w-[440px] items-center gap-2.5 rounded-sm2 border border-line bg-surface px-[15px] py-[11px] focus-within:border-accent md:flex"
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        if (term) router.push(routes.search(term));
      }}
    >
      <SearchIcon className="h-[18px] w-[18px] shrink-0 text-faint" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t.common.search}
        aria-label={t.common.search}
        className="w-full bg-transparent text-sm text-text placeholder:text-faint focus:outline-none"
      />
    </form>
  );
}
