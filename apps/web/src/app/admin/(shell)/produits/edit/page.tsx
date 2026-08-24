import { Suspense } from 'react';
import { t } from '@/locales/fr';
import { AdminLoading } from '@/components/admin/AdminState';
import { EditProductView } from './view';

export const metadata = { title: t.admin.editProductTitle };

/** Was `/admin/produits/[id]` — see the note on `commandes/detail` for why it moved. */
export default function EditProductPage() {
  return (
    <Suspense fallback={<AdminLoading rows={3} />}>
      <EditProductView />
    </Suspense>
  );
}
