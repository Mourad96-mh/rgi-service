import { Suspense } from 'react';
import { t } from '@/locales/fr';
import { AdminLoading } from '@/components/admin/AdminState';
import { ProductsView } from './view';

export const metadata = { title: t.admin.productsTitle };

/**
 * Filters, sort and pagination used to arrive as `searchParams`. A static export has no
 * request to read them from, so the view reads them with `useSearchParams()` — which has
 * to sit inside a Suspense boundary to prerender.
 */
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<AdminLoading rows={4} />}>
      <ProductsView />
    </Suspense>
  );
}
