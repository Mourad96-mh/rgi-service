'use client';

import { useState } from 'react';
import type { Product } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { AddToCartButton } from '@/components/cart/AddToCart';

/** Quantity stepper + add to cart. */
export function BuyBox({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { stock } = product;
  const max = Math.max(1, Math.min(stock, 10));
  const soldOut = stock <= 0;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-sm2 border border-line bg-surface p-1">
          <QtyButton label={t.product.decrease} onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={soldOut || quantity <= 1}>
            −
          </QtyButton>
          <span aria-live="polite" className="min-w-[2.5rem] text-center text-sm font-semibold">
            {quantity}
          </span>
          <QtyButton label={t.product.increase} onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={soldOut || quantity >= max}>
            +
          </QtyButton>
        </div>

        <AddToCartButton product={product} quantity={quantity} />
      </div>

      {quantity > 1 && !soldOut ? (
        <p className="mt-3 text-sm text-muted">
          {t.product.total} :{' '}
          <span className="font-display text-[17px] font-bold text-text">
            {price(product.effectivePrice * quantity)}
          </span>
        </p>
      ) : null}

    </div>
  );
}

function QtyButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-[9px] text-lg font-bold text-muted transition hover:bg-white/[.06] hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}
