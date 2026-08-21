import Link from 'next/link';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { BoltIcon, HeartIcon, UserIcon } from '@/components/ui/Icons';
import { CartBadge } from '@/components/cart/CartBadge';
import { SearchField } from './SearchField';
import { MobileNav } from './MobileNav';
import { Logo } from '@/components/brand/Logo';

/**
 * Sticky, blurred header with the Rgi Service logo, the search field, the account /
 * favourites / cart icons, and a second row of categories where the configurator is
 * highlighted with its −5% badge (DESIGN_SYSTEM.md §5).
 */
export function Header({ categories }: { categories: CategoryNode[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/[.72] backdrop-blur-[18px]">
      <div className="wrap">
        <div className="flex h-[72px] items-center gap-6">
          <div className="flex flex-1 items-center">
            {/* The mark carries aria-label="RGI" and "Service" is real text, so the link
                announces "RGI Service" without an aria-label of its own. */}
            <Link href={routes.home}>
              <Logo />
            </Link>
          </div>

          <SearchField />

          <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
            <Link href={routes.account} aria-label={t.common.account} className="icobtn">
              <UserIcon />
            </Link>
            <Link href="/favoris" aria-label={t.common.favorites} className="icobtn hidden sm:grid">
              <HeartIcon />
            </Link>
            <CartBadge />
            <MobileNav categories={categories} />
          </div>
        </div>

        <nav className="hidden h-[46px] items-center justify-center gap-6 border-t border-line text-[13.5px] font-medium text-muted lg:flex">
          <Link href={routes.configurator} className="flex items-center gap-1.5 font-bold">
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
              className="transition hover:text-text"
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
    <div className="border-b border-line bg-[linear-gradient(90deg,rgba(124,92,255,.16),rgba(34,211,238,.1))] px-4 py-[9px] text-center text-[13px] text-muted">
      🚚 {t.announce.text}
    </div>
  );
}
