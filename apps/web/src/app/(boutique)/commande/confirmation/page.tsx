import { Suspense } from 'react';
import type { Metadata } from 'next';
import { OrderConfirmation } from './confirmation';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="wrap py-12 sm:py-16">
          <div className="surface-card h-40 animate-pulse" />
        </div>
      }
    >
      <OrderConfirmation />
    </Suspense>
  );
}
