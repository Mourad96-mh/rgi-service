'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { BoltIcon, CloseIcon, MenuIcon } from '@/components/ui/Icons';

/**
 * Category drawer for phones and tablets (DESIGN_SYSTEM.md §1: nav → drawer).
 *
 * The drawer is rendered through a **portal into `document.body`**, and that is not
 * decoration: the header sets `backdrop-blur`, and any `backdrop-filter` makes an element
 * a containing block for its `position: fixed` descendants. Rendered in place, the
 * drawer's `fixed inset-0` resolved against the 72 px-tall header instead of the viewport,
 * so the menu was clipped to a 72 px sliver with 796 px of links unreachable inside it.
 */
export function MobileNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Lock the page behind the drawer, and put focus somewhere useful inside it.
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      // Send focus back to the burger, or it lands on <body> and keyboard users lose place.
      triggerRef.current?.focus();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icobtn lg:hidden"
        aria-label={t.common.menu}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[60] lg:hidden">
              <button
                type="button"
                aria-label={t.common.close}
                className="absolute inset-0 h-full w-full bg-bg/80 backdrop-blur-sm"
                onClick={close}
              />

              <nav
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={t.common.menu}
                className="absolute right-0 top-0 flex h-full w-[min(320px,85vw)] flex-col overflow-y-auto overscroll-contain border-l border-line bg-bg2 outline-none"
              >
                {/* A visible close control: the backdrop strip is only ~70 px wide on a
                    390 px phone, which is a poor tap target for dismissing the menu. */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg2 px-5 py-3.5">
                  <span className="font-display text-[15px] font-bold">{t.common.menu}</span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t.common.close}
                    className="icobtn"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="flex flex-col gap-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <Link
                    href={routes.configurator}
                    onClick={close}
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
                        onClick={close}
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
                              onClick={close}
                              className="py-1.5 pl-3 text-sm text-muted transition hover:text-text"
                            >
                              {child.name.fr}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
