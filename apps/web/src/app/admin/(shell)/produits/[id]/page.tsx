import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Product } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { adminFetch, AdminApiError } from '@/lib/admin/session';
import { formCatalog } from '@/lib/admin/catalog';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata = { title: t.admin.editProductTitle };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  let product: Product;
  try {
    product = await adminFetch<Product>(`/admin/products/${params.id}`);
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    throw error;
  }
  const { categories, definitions, uploadEnabled } = await formCatalog();

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
