import Link from 'next/link';
import { t } from '@/locales/fr';
import { formCatalog } from '@/lib/admin/catalog';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata = { title: t.admin.newProductTitle };

export default async function NewProductPage() {
  const { categories, definitions, uploadEnabled } = await formCatalog();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/produits" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.productsTitle}
        </Link>
        <h1 className="t-h1 mt-2 font-display font-bold">{t.admin.newProductTitle}</h1>
      </div>
      <ProductForm
        categories={categories}
        definitions={definitions}
        uploadEnabled={uploadEnabled}
      />
    </div>
  );
}
