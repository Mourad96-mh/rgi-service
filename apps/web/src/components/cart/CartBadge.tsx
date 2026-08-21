'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { cartCount, useCart } from '@/store/cart';
import { CartIcon } from '@/components/ui/Icons';

/**
 * Header cart link with the article count. The count only appears after mount: it lives in
 * localStorage, so rendering it on the server would guarantee a hydration mismatch.
 */
export function CartBadge() {
  const lines = useCart((state) => state.lines);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? cartCount(lines) : 0;

  return (
    <Link href={routes.cart} aria-label={t.common.cart} className="icobtn relative">
      <CartIcon />
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-accent3 px-1 text-[10.5px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
