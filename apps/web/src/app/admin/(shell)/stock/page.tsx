import { Suspense } from 'react';
import { t } from '@/locales/fr';
import { AdminLoading } from '@/components/admin/AdminState';
import { StockView } from './view';

export const metadata = { title: t.admin.stockTitle };

export default function AdminStockPage() {
  return (
    <Suspense fallback={<AdminLoading rows={4} />}>
      <StockView />
    </Suspense>
  );
}
