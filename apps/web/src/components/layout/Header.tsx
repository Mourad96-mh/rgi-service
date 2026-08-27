import Link from 'next/link';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { BoltIcon, UserIcon } from '@/components/ui/Icons';
import { CartBadge } from '@/components/cart/CartBadge';
import { SearchField } from './SearchField';
import { MobileNav } from './MobileNav';
import { Logo } from '@/components/brand/Logo';

/**
 * Sticky, blurred header with the Rgi Service logo, the search field, the account and
 * cart icons, and a second row of categories where the configurator is highlighted with
 * its −5% badge (DESIGN_SYSTEM.md §5).
 */
export function Header({ categories }: { categories: CategoryNode[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/[.72] backdrop-blur-[18px]">
      <div className="wrap">
        {/* 64 px on phones — a 72 px bar costs a tenth of a small screen's height and the
            row has nothing in it that needs the extra 8 px. */}
        <div className="flex h-16 items-center gap-2 sm:h-[72px] sm:gap-4 lg:gap-6">
          <div className="flex min-w-0 flex-1 items-center">
            {/* The mark carries aria-label="RGI" and "Service" is real text, so the link
                announces "RGI Service" without an aria-label of its own. */}
            <Link href={routes.home} className="shrink-0">
              <Logo />
            </Link>
          </div>

          <SearchField />

          {/* Below `sm` the row carries four 44 px targets; the gap tightens rather than
              letting the last one push past the gutter on a 320 px screen. */}
          <div className="flex flex-1 items-center justify-end gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
            <Link href={routes.account} aria-label={t.common.account} className="icobtn">
              <UserIcon />
            </Link>
            <CartBadge />
            <MobileNav categories={categories} />
          </div>
        </div>

        {/*
         * The category list is client-managed, so its length is unknown at build time. It
         * wraps onto a second line instead of overflowing the header — `min-h` keeps the
         * 46 px mockup rhythm for the common case where everything fits on one row.
         */}
        <nav className="hidden min-h-[46px] flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-line py-2 text-[13.5px] font-medium text-muted lg:flex xl:gap-x-6">
          <Link href={routes.configurator} className="flex items-center gap-1.5 whitespace-nowrap font-bold">
            <BoltIcon className="h-4 w-4 text-accent2" />
            <span className="grad-text">{t.nav.configurator}</span>
            <span className="rounded-md bg-accent3 px-[7px] py-[2px] text-[10px] font-bold text-white">
              {t.nav.configuratorBadge}
            </span>
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={routes.category(category.slug)}
              className="whitespace-nowrap transition hover:text-text"
            >
              {category.name.fr}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function AnnounceBar() {
  return (
    // The sentence is long enough to run to three lines on a 320 px phone; a step down in
    // size and a tighter leading keeps it to two without truncating the promise.
    <div className="border-b border-line bg-[linear-gradient(90deg,rgba(109,75,255,.10),rgba(14,165,196,.07))] px-4 py-[9px] text-center text-[12px] leading-snug text-muted sm:text-[13px]">
      🚚 {t.announce.text}
    </div>
  );
}
