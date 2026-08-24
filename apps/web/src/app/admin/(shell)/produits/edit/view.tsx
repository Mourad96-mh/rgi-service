'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AttributeDefinition, Category, Product } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { adminFetch, AdminApiError } from '@/lib/admin/session';
import { formCatalog } from '@/lib/admin/catalog';
import { useAdminData } from '@/lib/admin/useAdminData';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { ProductForm } from '@/components/admin/ProductForm';

interface Data {
  product: Product | null;
  categories: Category[];
  definitions: Record<string, AttributeDefinition[]>;
  uploadEnabled: boolean;
}

export function EditProductView() {
  const id = useSearchParams().get('id');

  const { data, error, loading, reload } = useAdminData<Data>(async () => {
    // The catalogue is fetched alongside the product rather than after it: the form needs
    // both before it can render a single field, so two round trips in series would show
    // staff a skeleton for twice as long.
    const [product, catalog] = await Promise.all([
      (async () => {
        if (!id) return null;
        try {
          return await adminFetch<Product>(`/admin/products/${id}`);
        } catch (cause) {
          if (cause instanceof AdminApiError && cause.status === 404) return null;
          throw cause;
        }
      })(),
      formCatalog(),
    ]);
    return { product, ...catalog };
  }, [id]);

  if (loading) return <AdminLoading rows={3} />;
  if (error || !data) return <AdminError message={error} onRetry={reload} />;

  const { product, categories, definitions, uploadEnabled } = data;

  if (!product) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/produits" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.productsTitle}
        </Link>
        <AdminError message={t.admin.productNotFound} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/produits" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.productsTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="t-h1 min-w-0 font-display font-bold">{product.name.fr}</h1>
          {product.status === 'active' ? (
            <Link
              href={routes.product(product.slug)}
              target="_blank"
              className="text-[12.5px] text-accent2 hover:underline"
            >
              {t.admin.backToShop} ↗
            </Link>
          ) : null}
        </div>
        <p className="truncate font-mono text-[12px] text-faint">{product.sku}</p>
      </div>

      <ProductForm
        categories={categories}
        definitions={definitions}
        product={product}
        uploadEnabled={uploadEnabled}
      />
    </div>
  );
}
