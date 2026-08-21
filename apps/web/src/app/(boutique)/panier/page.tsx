import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { CartView } from '@/components/cart/CartView';

/** The basket lives in the browser, so this page is not for crawlers. */
export const metadata: Metadata = {
  title: 'Panier',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="wrap py-12">
      <h1 className="mb-8 font-display text-[clamp(26px,4.5vw,36px)] font-bold">
        {t.cart.title}
      </h1>
      <CartView />
    </div>
  );
}
