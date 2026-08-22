import Link from 'next/link';
import Image from 'next/image';
import type { Paginated, Product, ProductStatus } from '@rgi/types';
import { t } from '@/locales/fr';
import { price, primaryImage } from '@/lib/format';
import { adminFetch } from '@/lib/admin/session';
import { ProductFilters } from '@/components/admin/ProductFilters';
import { ArchiveProductButton } from '@/components/admin/ArchiveProductButton';
import { DeleteProductButton } from '@/components/admin/DeleteProductButton';

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
        <div className="min-w-0">
          <h1 className="t-h1 font-display font-bold">{t.admin.productsTitle}</h1>
          {/* Naming the boundary is half of keeping it: staff who came here to fix a
              quantity are told where that lives instead of finding an input that is
              missing. */}
          <p className="mt-1 max-w-[62ch] text-[13px] text-faint">{t.admin.productsSubtitle}</p>
          <p className="mt-1 text-[13px] text-faint">{products.total} au total</p>
        </div>
        <div className="flex w-full flex-col gap-2 xs:w-auto xs:flex-row xs:items-center">
          <Link href="/admin/stock" className="btn btn-ghost w-full xs:w-auto">
            {t.admin.manageStock}
          </Link>
          <Link href="/admin/produits/nouveau" className="btn btn-primary w-full xs:w-auto">
            {t.admin.newProduct}
          </Link>
        </div>
      </div>

      <ProductFilters current={searchParams} />

      {products.data.length ? (
        <>
          {/*
           * Below `lg` the table becomes one card per product. Six columns on a 390 px
           * screen means scrolling sideways to read a single stock figure, so the same
           * cells are stacked and labelled instead — the actions are the very same
           * components the table rows use.
           */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {products.data.map((product) => {
              const image = primaryImage(product);
              return (
                <li key={product.id} className="surface-card flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="photo-tile relative h-[48px] w-[48px] shrink-0">
                      {image ? (
                        <Image src={image.url} alt="" fill sizes="48px" className="object-contain p-1" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/admin/produits/${product.id}`}
                        className="block font-semibold leading-snug transition hover:text-accent2"
                      >
                        {product.name.fr}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[11px] text-faint">
                        {product.sku}
                      </span>
                    </span>
                    <StatusChip status={product.status} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-[.05em] text-faint">
                        {t.admin.fieldBrand}
                      </dt>
                      <dd className="truncate text-muted">{product.brand}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-[.05em] text-faint">
                        {t.admin.price}
                      </dt>
                      <dd className="font-semibold">{price(product.effectivePrice)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-[.05em] text-faint">
                        {t.admin.stock}
                      </dt>
                      <dd>
                        <StockReadout
                          stock={product.stock}
                          threshold={product.lowStockThreshold}
                        />
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-start justify-end gap-2 border-t border-line pt-3">
                    <ArchiveProductButton
                      id={product.id}
                      name={product.name.fr}
                      archived={product.status === 'archived'}
                    />
                    <DeleteProductButton id={product.id} name={product.name.fr} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="surface-card hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-left text-[13.5px]">
              <thead className="border-b border-line text-[11.5px] uppercase tracking-[.05em] text-faint">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.admin.fieldName}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.fieldBrand}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.status}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t.admin.price}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.stock}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t.admin.actions}</th>
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
                        <StatusChip status={product.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {price(product.effectivePrice)}
                      </td>
                      <td className="px-4 py-3">
                        <StockReadout
                          stock={product.stock}
                          threshold={product.lowStockThreshold}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          <ArchiveProductButton
                            id={product.id}
                            name={product.name.fr}
                            archived={product.status === 'archived'}
                          />
                          <DeleteProductButton id={product.id} name={product.name.fr} />
                        </div>
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
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border px-3 text-[13px] sm:min-h-[34px] sm:min-w-0 sm:py-1.5 sm:text-[12.5px] ${
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
        <p className="surface-card p-6 text-center text-[13.5px] text-muted sm:p-8">
          {t.admin.productsEmpty}
        </p>
      )}
    </div>
  );
}

/**
 * Stock as a *fact about the product*, not a control.
 *
 * The figure belongs here — it is part of reading a product's row — but editing it is the
 * Stock section's job, so this is a link, not an input. That is the whole separation in
 * one component.
 */
function StockReadout({ stock, threshold }: { stock: number; threshold: number }) {
  const tone =
    stock === 0 ? 'text-accent3' : stock <= threshold ? 'text-warn' : 'text-muted';
  return (
    <Link
      href="/admin/stock"
      className={`inline-flex min-h-[44px] items-center gap-1.5 font-semibold transition hover:text-accent2 sm:min-h-0 ${tone}`}
      title={t.admin.manageStock}
    >
      {stock}
      {stock <= threshold ? (
        <span className="text-[11px] font-medium">
          ({stock === 0 ? t.admin.stockOut : t.admin.stockLow})
        </span>
      ) : null}
    </Link>
  );
}

/** The same status chip in the phone card and in the desktop table row. */
function StatusChip({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`chip shrink-0 ${
        status === 'active'
          ? 'bg-success/15 text-success'
          : status === 'draft'
            ? 'bg-warn/15 text-warn'
            : 'bg-white/[.07] text-faint'
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
