'use client';

import Link from 'next/link';
import type { AttributeDefinition, Category } from '@rgi/types';
import { t } from '@/locales/fr';
import { formCatalog } from '@/lib/admin/catalog';
import { useAdminData } from '@/lib/admin/useAdminData';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { ProductForm } from '@/components/admin/ProductForm';

interface Catalog {
  categories: Category[];
  definitions: Record<string, AttributeDefinition[]>;
  uploadEnabled: boolean;
}

export function NewProductView() {
  const { data, error, loading, reload } = useAdminData<Catalog>(() => formCatalog());

  if (loading) return <AdminLoading rows={3} />;
  if (error || !data) return <AdminError message={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/produits" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.productsTitle}
        </Link>
        <h1 className="t-h1 mt-2 font-display font-bold">{t.admin.newProductTitle}</h1>
      </div>
      <ProductForm
        categories={data.categories}
        definitions={data.definitions}
        uploadEnabled={data.uploadEnabled}
      />
    </div>
  );
}
