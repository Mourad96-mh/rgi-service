import Image from 'next/image';
import Link from 'next/link';
import type { ProductSummary } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { cardSpecs, discountPct, price, primaryImage } from '@/lib/format';
import { HeartIcon } from '@/components/ui/Icons';
import { AddToCartIconButton } from '@/components/cart/AddToCart';

/**
 * THE product card — listings, carousels, related products and the configurator picker
 * all use this one component (DESIGN_SYSTEM.md §5), so the catalog reads as one system.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const image = primaryImage(product);
  const off = discountPct(product.effectivePrice, product.compareAtPrice);
  const specs = cardSpecs(product);
  const href = routes.product(product.slug);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-1 hover:border-line2 hover:shadow-soft">
      <div className="photo-tile-flat relative grid aspect-[4/3] place-items-center">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name.fr}
            fill
            sizes="(max-width:640px) 92vw, (max-width:1280px) 46vw, (max-width:1760px) 30vw, 23vw"
            className="object-contain p-4 sm:p-6"
          />
        ) : (
          <span aria-hidden className="text-[clamp(40px,11vw,56px)] opacity-30 grayscale">
            🖥️
          </span>
        )}

        {off !== null ? (
          <span className="chip absolute left-2.5 top-2.5 z-10 bg-accent3 text-white sm:left-3 sm:top-3">
            -{off}%
          </span>
        ) : null}

        {/* `z-10` keeps the badge and this button above the full-tile link overlay below —
            without it the link, being the later positioned sibling, swallows the tap. */}
        <button
          type="button"
          aria-label={t.common.favorites}
          className="absolute right-2.5 top-2.5 z-10 grid h-11 w-11 place-items-center rounded-[9px] border border-line2 bg-surface/85 text-muted backdrop-blur transition hover:text-accent3 sm:right-3 sm:top-3 sm:h-[34px] sm:w-[34px]"
        >
          <HeartIcon className="h-4 w-4" />
        </button>

        <Link href={href} className="absolute inset-0" aria-label={product.name.fr} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5 sm:gap-[9px] sm:p-4">
        <span className="truncate text-[11.5px] font-semibold uppercase tracking-[.05em] text-faint">
          {product.brand}
        </span>

        {/* Model names run to eight words. Two lines then an ellipsis keeps every card in
            a row the same height whatever the catalogue throws at it. */}
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-[1.35] sm:text-[14.5px]">
          <Link href={href} className="transition hover:text-accent2">
            {product.name.fr}
          </Link>
        </h3>

        {specs.length ? (
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {specs.map((spec) => (
              <span key={spec} className="spec-pill">
                {spec}
              </span>
            ))}
          </div>
        ) : null}

        <StockLine stock={product.stock} />

        {/* `flex-wrap` + a min width on the price column: at 320 px a five-digit price and
            the 44 px cart button would otherwise squeeze each other. */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-2">
          <div className="min-w-0">
            {product.compareAtPrice ? (
              <div className="text-xs text-faint line-through">{price(product.compareAtPrice)}</div>
            ) : null}
            <div className="grad-text font-display text-[17px] font-bold sm:text-[19px]">
              {price(product.effectivePrice)}
            </div>
          </div>
          <AddToCartIconButton product={product} />
        </div>
      </div>
    </article>
  );
}

/** Stock state never relies on colour alone — icon + label too (DESIGN_SYSTEM.md §8). */
export function StockLine({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-faint">
        <span className="h-[7px] w-[7px] rounded-full bg-faint" aria-hidden />
        {t.common.outOfStock}
      </span>
    );
  }
  const low = stock <= 3;
  return (
    <span
      className={`flex items-center gap-1.5 text-[11.5px] font-semibold ${low ? 'text-warn' : 'text-success'}`}
    >
      <span
        aria-hidden
        className={`h-[7px] w-[7px] rounded-full ${low ? 'bg-warn' : 'bg-success'}`}
      />
      {low ? t.common.lowStock : t.common.inStock}
    </span>
  );
}
