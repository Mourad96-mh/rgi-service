'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@rgi/types';
import { t } from '@/locales/fr';

/**
 * One entry per job (ADMIN_DASHBOARD.md).
 *
 * The split is deliberate: a link that manages two things is a link nobody can hand to a
 * new member of staff with one sentence of explanation. "Produits" owns the product
 * *record*; the quantity of that product on the shelf is a different job and lives in
 * "Stock", which is why the products table shows a stock figure but no stock input.
 *
 * `adminOnly` mirrors the API, it does not replace it: `/categories` and
 * `/attribute-definitions` are `@Roles('admin')` on the server, so hiding the links only
 * spares a staff member a 403 they could do nothing about.
 */
const LINKS: { href: string; label: string; exact?: boolean; adminOnly?: boolean }[] = [
  { href: '/admin', label: t.admin.navHome, exact: true },
  { href: '/admin/commandes', label: t.admin.navOrders },
  { href: '/admin/produits', label: t.admin.navProducts },
  { href: '/admin/stock', label: t.admin.navStock },
  { href: '/admin/categories', label: t.admin.navCategories, adminOnly: true },
  { href: '/admin/attributs', label: t.admin.navAttributes, adminOnly: true },
  { href: '/admin/carrousel', label: t.admin.navHero },
];

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.adminOnly || role === 'admin');

  return (
    <nav className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 pb-2.5 lg:flex-col lg:overflow-visible lg:pb-0">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-sm2 px-3.5 py-2.5 text-[13.5px] font-medium transition ${
              active ? 'bg-white/[.07] text-text' : 'text-muted hover:bg-white/[.04] hover:text-text'
            }`}
          >
            {link.label}
          </Link>
        );
      })}

      {/* The phone shell has no room for a separate link column, so the way back to the
          storefront rides at the end of the same scroller instead of below it. */}
      <Link
        href="/"
        className="whitespace-nowrap rounded-sm2 px-3.5 py-2.5 text-[13.5px] font-medium text-faint transition hover:text-text lg:hidden"
      >
        ← {t.admin.backToShop}
      </Link>
    </nav>
  );
}
