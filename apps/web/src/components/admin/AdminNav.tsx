'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/locales/fr';

const LINKS = [
  { href: '/admin', label: t.admin.navHome, exact: true },
  { href: '/admin/commandes', label: t.admin.navOrders, exact: false },
  { href: '/admin/produits', label: t.admin.navProducts, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {LINKS.map((link) => {
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
    </nav>
  );
}
