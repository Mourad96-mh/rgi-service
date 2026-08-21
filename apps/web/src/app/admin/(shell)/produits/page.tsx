import Link from 'next/link';
import Image from 'next/image';
import type { Paginated, Product, ProductStatus } from '@rgi/types';
import { t } from '@/locales/fr';
import { price, primaryImage } from '@/lib/format';
import { adminFetch } from '@/lib/admin/session';
import { ProductFilters } from '@/components/admin/ProductFilters';
import { StockCell } from '@/components/admin/StockCell';

export const metadata = { title: t.admin.productsTitle };

const STATUS_LABEL: Record<ProductStatus, string> = {
  active: t.admin.fieldStatusActive,
  draft: t.admin.fieldStatusDraft,
  archived: t.admin.fieldStatusArchived,
};

type Search = { q?: string; status?: ProductStatus; page?: string };

export default async function AdminProductsPage({ searchParams }: { searchParams: Search }) {
  const query = new URLSearchParams({ limit: '20' });
  if (searchParams.q) query.set('q', searchParams.q);
  if (searchParams.status) query.set('status', searchParams.status);
  if (searchParams.page) query.set('page', searchParams.page);

  const products = await adminFetch<Paginated<Product>>(`/admin/products?${query.toString()}`);
  const pages = Math.max(1, Math.ceil(products.total / products.limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-bold">{t.admin.productsTitle}</h1>
          <p className="mt-1 text-[13px] text-faint">{products.total} au total</p>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          {t.admin.newProduct}
        </Link>
      </div>

      <ProductFilters current={searchParams} />

      {products.data.length ? (
        <>
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13.5px]">
              <thead className="border-b border-line text-[11.5px] uppercase tracking-[.05em] text-faint">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.admin.fieldName}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.fieldBrand}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.status}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t.admin.price}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.stock}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,.06)]">
                {products.data.map((product) => {
                  const image = primaryImage(product);
                  return (
                    <tr key={product.id} className="transition hover:bg-white/[.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="photo-tile relative h-[42px] w-[42px] shrink-0">
                            {image ? (
                              <Image src={image.url} alt="" fill sizes="42px" className="object-contain p-1" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <Link
                              href={`/admin/produits/${product.id}`}
                              className="block truncate font-semibold transition hover:text-accent2"
                            >
                              {product.name.fr}
                            </Link>
                            <span className="font-mono text-[11px] text-faint">{product.sku}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{product.brand}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`chip ${
                            product.status === 'active'
                              ? 'bg-success/15 text-success'
                              : product.status === 'draft'
                                ? 'bg-warn/15 text-warn'
                                : 'bg-white/[.07] text-faint'
                          }`}
                        >
                          {STATUS_LABEL[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {price(product.effectivePrice)}
                      </td>
                      <td className="px-4 py-3">
                        <StockCell
                          id={product.id}
                          stock={product.stock}
                          threshold={product.lowStockThreshold}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Pagination">
              {Array.from({ length: pages }, (_, index) => index + 1).map((page) => {
                const params = new URLSearchParams(
                  Object.entries(searchParams).filter(([, value]) => value) as [string, string][],
                );
                params.set('page', String(page));
                const active = page === products.page;
                return (
                  <Link
                    key={page}
                    href={`/admin/produits?${params.toString()}`}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                      active ? 'border-accent2 text-text' : 'border-line text-muted hover:text-text'
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </>
      ) : (
        <p className="surface-card p-8 text-center text-[13.5px] text-muted">
          {t.admin.productsEmpty}
        </p>
      )}
    </div>
  );
}
