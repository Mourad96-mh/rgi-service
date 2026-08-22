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
    <div className="wrap py-8 sm:py-12">
      <h1 className="t-h1 mb-6 font-display font-bold sm:mb-8">
        {t.cart.title}
      </h1>
      <CartView />
    </div>
  );
}
