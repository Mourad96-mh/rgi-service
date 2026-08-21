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
  build: (shareId: string) => `/configurateur-pc/${shareId}`,
  cart: '/panier',
  checkout: '/commande',
  orderConfirmation: (orderNumber: string) => `/commande/confirmation/${orderNumber}`,
  account: '/compte',
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
