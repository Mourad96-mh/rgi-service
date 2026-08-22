'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { SearchIcon } from '@/components/ui/Icons';

/**
 * Search. Submits to the search page; live suggestions come later.
 *
 * Two renderings of the same form, because the header row physically cannot hold a usable
 * search field next to the logo and four tap targets on a phone:
 *
 * - `header` — the wide field in the header bar, from `md` up.
 * - `drawer` — a full-width row at the top of the `MobileNav` panel, which is where phone
 *   and small-tablet visitors reach search. Without it they had no search at all.
 *
 * The input is `text-base` in the drawer on purpose: iOS Safari force-zooms the page when
 * a focused input is under 16 px, and the visitor is then stranded on a zoomed layout.
 */
export function SearchField({
  variant = 'header',
  autoFocus = false,
  onSubmitted,
}: {
  variant?: 'header' | 'drawer';
  /** Set when the drawer was opened *by* the search button, so the field takes focus. */
  autoFocus?: boolean;
  /** Lets the drawer close itself once the visitor has submitted a term. */
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const drawer = variant === 'drawer';

  return (
    <form
      role="search"
      className={`w-full items-center gap-2.5 rounded-sm2 border border-line bg-surface px-[15px] focus-within:border-accent ${
        drawer ? 'flex py-3' : 'hidden max-w-[440px] py-[11px] md:flex'
      }`}
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        if (!term) return;
        router.push(routes.search(term));
        onSubmitted?.();
      }}
    >
      {drawer ? (
        // In the drawer the magnifier is the submit control, not decoration: a soft
        // keyboard's "go" key is easy to miss and there is room here for a real target.
        <button
          type="submit"
          aria-label={t.common.search}
          className="-my-3 -ml-[15px] grid h-11 w-11 shrink-0 place-items-center text-faint transition hover:text-text"
        >
          <SearchIcon className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-faint" />
      )}
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t.common.search}
        aria-label={t.common.search}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- only when the visitor tapped
        // the search button to open the drawer, i.e. focus follows their own intent.
        autoFocus={autoFocus}
        className={`w-full min-w-0 bg-transparent text-text placeholder:text-faint focus:outline-none ${
          drawer ? 'text-base' : 'text-sm'
        }`}
      />
    </form>
  );
}
