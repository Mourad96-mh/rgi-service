import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = {
  title: 'Commande',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="wrap py-8 sm:py-12">
      <h1 className="t-h1 mb-6 font-display font-bold sm:mb-8">
        {t.checkout.title}
      </h1>
      <CheckoutForm />
    </div>
  );
}
