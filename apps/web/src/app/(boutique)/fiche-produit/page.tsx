import type { Metadata } from 'next';
import { LiveProductView } from './view';

/**
 * The client-rendered stand-in for a product page that does not exist as a file yet.
 *
 * It is never linked and never navigated to directly — `public/.htaccess` rewrites any
 * unmatched `/produit/<slug>/` onto this file, keeping the visitor's URL intact.
 *
 * `noindex` is deliberate and load-bearing. This shell is one file answering to many URLs,
 * so its metadata cannot describe the product it happens to be showing; letting Google
 * index it would put a page titled "Produit" in the results for every new item. The real
 * page — with its own title, description, canonical and JSON-LD — appears at the next
 * build, and that is the one that gets indexed.
 */
export const metadata: Metadata = {
  title: 'Produit',
  robots: { index: false, follow: true },
};

export default function LiveProductPage() {
  return <LiveProductView />;
}
