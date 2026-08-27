/**
 * URL builders — one place, so a route change never leaves a dead link behind.
 *
 * Categories keep the nested, keyword-rich paths SEO_STRATEGY.md §1 asks for
 * (`/composants/cartes-graphiques/`). Products live at a flat `/produit/<slug>`:
 * FOLDER_STRUCTURE.md specifies that path, and a single, category-independent product URL
 * means one canonical per product even when a product is reachable from several
 * categories. The hierarchy is still expressed to Google through the breadcrumbs and the
 * `BreadcrumbList` JSON-LD on the product page.
 */
export const routes = {
  home: '/',
  category: (slug: string) => `/${slug}`,
  product: (slug: string) => `/produit/${slug}`,
  configurator: '/configurateur-pc',
  /**
   * A shared build and an order confirmation both identify one record that cannot exist at
   * build time, so neither can be a path segment: a static export has no server to resolve
   * `/configurateur-pc/<unknown-id>`, and there is no file at that path. The id travels in
   * the query string instead, where the client reads it. Both pages are `noindex`, so
   * nothing is lost to search.
   */
  build: (shareId: string) => `/configurateur-pc/partage?id=${encodeURIComponent(shareId)}`,
  cart: '/panier',
  checkout: '/commande',
  orderConfirmation: (orderNumber: string, token?: string) => {
    const search = new URLSearchParams({ commande: orderNumber });
    // Order numbers are sequential, so the number alone must never be enough to read one.
    if (token) search.set('token', token);
    return `/commande/confirmation?${search.toString()}`;
  },
  account: '/compte',
  promotions: '/promotions',
  search: (q: string) => `/recherche?q=${encodeURIComponent(q)}`,
};

/** Turn the current listing query into a URL, dropping empty values. */
export function listingUrl(
  categorySlug: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    } else {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `/${categorySlug}?${qs}` : `/${categorySlug}`;
}
