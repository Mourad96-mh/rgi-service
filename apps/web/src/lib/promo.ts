/**
 * The two promo listing queries, in a neutral module of their own.
 *
 * They cannot be exported from `PromoSection.tsx` or `promotions/results.tsx`, which is
 * where they started. Both of those are `'use client'`, and a **server** component that
 * imports a value from a client module receives a client *reference*, not the string. The
 * request became `/products?[object Object]`, the API answered 400, `apiFetchOrNull`
 * swallowed it, and both promo surfaces exported with an empty server-rendered snapshot —
 * invisible in a browser, where the client refetch fills them in a moment later, but not to
 * a crawler or to a visitor without JavaScript. `/promotions/index.html` shipped with zero
 * products in it. Same trap as `PAGE_SIZE` in `[...slug]/constants.ts`; see
 * DEPLOY_HOSTINGER.md.
 *
 * The server render and the browser refetch must ask exactly the same question or the grid
 * would change under the visitor, so each surface's query is defined once, here.
 */

/** The home page row: four deals, cheapest first. */
export const PROMO_QUERY = 'promo=true&limit=4&sort=price_asc';

/** The /promotions page. 100 is the API's hard cap on `limit`; asking for more is a 400. */
export const PROMO_PAGE_QUERY = 'promo=true&limit=100&sort=price_asc';
