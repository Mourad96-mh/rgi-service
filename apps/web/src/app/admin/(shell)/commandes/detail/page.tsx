import { Suspense } from 'react';
import { t } from '@/locales/fr';
import { AdminLoading } from '@/components/admin/AdminState';
import { OrderDetailView } from './view';

export const metadata = { title: t.admin.orderDetail };

/**
 * Was `/admin/commandes/[id]`. An order id cannot be a path segment in a static export —
 * there is no file at `/admin/commandes/<unknown-id>/` and no server to invent one — so it
 * travels in the query string, the same trick the storefront already uses for order
 * confirmations and shared builds (`lib/routes.ts`).
 */
export default function AdminOrderPage() {
  return (
    <Suspense fallback={<AdminLoading rows={3} />}>
      <OrderDetailView />
    </Suspense>
  );
}
