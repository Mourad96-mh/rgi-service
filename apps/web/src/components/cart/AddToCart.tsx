'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProductSummary } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { useCart } from '@/store/cart';
import { CartIcon, CheckIcon } from '@/components/ui/Icons';

/** Full-width button for the product page. */
export function AddToCartButton({
  product,
  quantity = 1,
}: {
  product: ProductSummary;
  quantity?: number;
}) {
  const add = useCart((state) => state.addProduct);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  return (
    <>
      <button
        type="button"
        disabled={soldOut}
        onClick={() => {
          add(product, quantity);
          setAdded(true);
        }}
        className="btn btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CartIcon />
        {t.common.addToCart}
      </button>

      {added ? (
        <p role="status" className="mt-3 flex w-full flex-wrap items-center gap-2 text-[13px] text-success">
          <CheckIcon className="h-4 w-4" />
          {t.cart.added}
          <Link href={routes.cart} className="font-semibold text-accent2 hover:underline">
            {t.cart.viewCart}
          </Link>
        </p>
      ) : null}
    </>
  );
}

/** The small cart button on a product card in a grid. */
export function AddToCartIconButton({ product }: { product: ProductSummary }) {
  const add = useCart((state) => state.addProduct);
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      aria-label={added ? t.cart.added : t.common.addToCart}
      disabled={product.stock <= 0}
      onClick={() => {
        add(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2000);
      }}
      className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-grad text-bg shadow-glow transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
    >
      {added ? <CheckIcon /> : <CartIcon />}
    </button>
  );
}
