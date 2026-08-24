import { Suspense } from 'react';
import { t } from '@/locales/fr';
import { AdminLoading } from '@/components/admin/AdminState';
import { OrdersView } from './view';

export const metadata = { title: t.admin.ordersTitle };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminLoading rows={4} />}>
      <OrdersView />
    </Suspense>
  );
}
