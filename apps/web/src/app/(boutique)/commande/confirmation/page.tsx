import { Suspense } from 'react';
import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { OrderConfirmation } from './confirmation';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        // Not a bare skeleton: this is the prerendered HTML, so it is what a customer sees
        // in the moment right after paying, and what a screen reader announces. The heading
        // has to say the order went through.
        <div className="wrap py-12 sm:py-16">
          <h1 className="t-h1 font-display font-bold">{t.order.confirmedTitle}</h1>
          <div className="surface-card mt-6 h-40 animate-pulse" />
        </div>
      }
    >
      <OrderConfirmation />
    </Suspense>
  );
}
