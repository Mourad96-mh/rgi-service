'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { Paginated, Product } from '@rgi/types';
import { t } from '@/locales/fr';
import { primaryImage } from '@/lib/format';
import { adminFetch } from '@/lib/admin/session';
import { useAdminData } from '@/lib/admin/useAdminData';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { StockCell } from '@/components/admin/StockCell';
import { ThresholdCell } from '@/components/admin/ThresholdCell';
import { StockFilters } from '@/components/admin/StockFilters';

/**
 * Inventory, and only inventory.
 *
 * This section exists because quantity was previously edited from inside the product
 * catalogue, which meant the one task staff do most often — and in a hurry — was buried
 * behind a screen built for editing product records. Here there is no price, no
 * description and no SEO: a row is a product, a quantity, and the threshold that decides
 * when it starts shouting. Everything else is a link back to Produits.
 */
export function StockView() {
  const params = useSearchParams();
  const low = params.get('low') === '1';
  const sort = (params.get('sort') as 'recent' | 'stock' | 'name' | null) ?? 'stock';
  const page = params.get('page') ?? undefined;

  const { data, error, loading, reload } = useAdminData<Paginated<Product>>(() => {
    const query = new URLSearchParams({ limit: '30', sort });
    // Archived products are not on sale, so their stock is not a thing anyone needs to fix.
    query.set('status', 'active');
    if (low) query.set('lowStock', 'true');
    if (page) query.set('page', page);
    return adminFetch<Paginated<Product>>(`/admin/products?${query.toString()}`);
  }, [low, sort, page]);

  if (loading) return <AdminLoading rows={4} />;
  if (error || !data) return <AdminError message={error} onRetry={reload} />;

  const products = data;
  const pages = Math.max(1, Math.ceil(products.total / products.limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="t-h1 font-display font-bold">{t.admin.stockTitle}</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] text-faint">{t.admin.stockSubtitle}</p>
      </div>

      <StockFilters low={low} sort={sort} />

      {products.data.length ? (
        <>
          {/* Below `lg` each product is a card: three numbers stacked and labelled beat a
              six-column table scrolled sideways on a phone at the stockroom door. */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {products.data.map((product) => (
              <li key={product.id} className="surface-card flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <Thumb product={product} size={48} />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/admin/produits/edit?id=${product.id}`}
                      className="block font-semibold leading-snug transition hover:text-accent2"
                    >
                      {product.name.fr}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[11px] text-faint">
                      {product.sku}
                    </span>
                  </span>
                  <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                </div>

                <dl className="flex flex-wrap gap-x-6 gap-y-3">
                  <div>
                    <dt className="mb-1.5 text-[11px] uppercase tracking-[.05em] text-faint">
                      {t.admin.stock}
                    </dt>
                    <dd>
                      <StockCell
                        id={product.id}
                        stock={product.stock}
                        threshold={product.lowStockThreshold}
                        onDone={reload}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1.5 text-[11px] uppercase tracking-[.05em] text-faint">
                      {t.admin.stockThreshold}
                    </dt>
                    <dd>
                      <ThresholdCell
                        id={product.id}
                        threshold={product.lowStockThreshold}
                        onDone={reload}
                      />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-line text-[11.5px] uppercase tracking-[.05em] text-faint">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.admin.fieldName}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.status}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.stock}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.stockThreshold}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(16,24,48,.09)]">
                {products.data.map((product) => (
                  <tr key={product.id} className="transition hover:bg-text/[.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb product={product} size={42} />
                        <span className="min-w-0">
                          <Link
                            href={`/admin/produits/edit?id=${product.id}`}
                            className="block truncate font-semibold transition hover:text-accent2"
                          >
                            {product.name.fr}
                          </Link>
                          <span className="font-mono text-[11px] text-faint">{product.sku}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                    </td>
                    <td className="px-4 py-3">
                      <StockCell
                        id={product.id}
                        stock={product.stock}
                        threshold={product.lowStockThreshold}
                        onDone={reload}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ThresholdCell
                        id={product.id}
                        threshold={product.lowStockThreshold}
                        onDone={reload}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Pagination">
              {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => {
                const next = new URLSearchParams();
                if (low) next.set('low', '1');
                next.set('sort', sort);
                next.set('page', String(pageNumber));
                const active = pageNumber === products.page;
                return (
                  <Link
                    key={pageNumber}
                    href={`/admin/stock?${next.toString()}`}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border px-3 text-[13px] sm:min-h-[34px] sm:min-w-0 sm:py-1.5 sm:text-[12.5px] ${
                      active ? 'border-accent2 text-text' : 'border-line text-muted hover:text-text'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </>
      ) : (
        <p className="surface-card p-6 text-center text-[13.5px] text-muted sm:p-8">
          {low ? t.admin.lowStockEmpty : t.admin.stockEmpty}
        </p>
      )}
    </div>
  );
}

function Thumb({ product, size }: { product: Product; size: number }) {
  const image = primaryImage(product);
  return (
    <span
      className="photo-tile relative shrink-0"
      style={{ height: `${size}px`, width: `${size}px` }}
    >
      {image ? (
        <Image src={image.url} alt="" fill sizes={`${size}px`} className="object-contain p-1" />
      ) : null}
    </span>
  );
}

/** Where this product sits against its own threshold, in one glance. */
function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const [label, tone] =
    stock === 0
      ? [t.admin.stockOut, 'bg-accent3/15 text-accent3']
      : stock <= threshold
        ? [t.admin.stockLow, 'bg-warn/15 text-warn']
        : [t.admin.stockOk, 'bg-success/15 text-success'];
  return <span className={`chip shrink-0 ${tone}`}>{label}</span>;
}
