import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = {
  title: 'Commande',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="wrap py-12">
      <h1 className="mb-8 font-display text-[clamp(26px,4.5vw,36px)] font-bold">
        {t.checkout.title}
      </h1>
      <CheckoutForm />
    </div>
  );
}
