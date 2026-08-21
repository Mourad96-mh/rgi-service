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
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
            className="object-contain p-6"
          />
        ) : (
          <span aria-hidden className="text-[56px] opacity-30 grayscale">
            🖥️
          </span>
        )}

        {off !== null ? (
          <span className="chip absolute left-3 top-3 bg-accent3 text-white">-{off}%</span>
        ) : null}

        <button
          type="button"
          aria-label={t.common.favorites}
          className="absolute right-3 top-3 grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-black/10 bg-white/80 text-[#5b6178] backdrop-blur transition hover:text-bg"
        >
          <HeartIcon className="h-4 w-4" />
        </button>

        <Link href={href} className="absolute inset-0" aria-label={product.name.fr} />
      </div>

      <div className="flex flex-1 flex-col gap-[9px] p-4">
        <span className="text-[11.5px] font-semibold uppercase tracking-[.05em] text-faint">
          {product.brand}
        </span>

        <h3 className="text-[14.5px] font-semibold leading-[1.35]">
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

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {product.compareAtPrice ? (
              <div className="text-xs text-faint line-through">{price(product.compareAtPrice)}</div>
            ) : null}
            <div className="grad-text font-display text-[19px] font-bold">
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
        className={`h-[7px] w-[7px] rounded-full ${low ? 'bg-warn shadow-[0_0_8px_#fbbf24]' : 'bg-success shadow-[0_0_8px_#34d399]'}`}
      />
      {low ? t.common.lowStock : t.common.inStock}
    </span>
  );
}
