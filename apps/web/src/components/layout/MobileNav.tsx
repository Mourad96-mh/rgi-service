'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { BoltIcon, MenuIcon } from '@/components/ui/Icons';

/** Category drawer for phones and tablets (DESIGN_SYSTEM.md §1: nav → drawer). */
export function MobileNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icobtn lg:hidden"
        aria-label={t.common.menu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={t.common.close}
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-[min(320px,85vw)] flex-col gap-1 overflow-y-auto border-l border-line bg-bg2 p-6">
            <Link
              href={routes.configurator}
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center gap-2 rounded-sm2 border border-line2 bg-white/[.04] px-4 py-3 font-semibold"
            >
              <BoltIcon className="h-4 w-4 text-accent2" />
              <span className="grad-text">{t.nav.configurator}</span>
              <span className="ml-auto rounded-md bg-accent3 px-2 py-0.5 text-[10px] font-bold text-white">
                {t.nav.configuratorBadge}
              </span>
            </Link>

            {categories.map((category) => (
              <div key={category.id} className="border-b border-line py-2 last:border-0">
                <Link
                  href={routes.category(category.slug)}
                  onClick={() => setOpen(false)}
                  className="block py-1.5 font-semibold"
                >
                  {category.name.fr}
                </Link>
                {category.children.length > 0 ? (
                  <div className="flex flex-col">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={routes.category(child.slug)}
                        onClick={() => setOpen(false)}
                        className="py-1.5 pl-3 text-sm text-muted transition hover:text-text"
                      >
                        {child.name.fr}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
