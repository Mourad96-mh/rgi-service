/**
 * Shared by the server page and the client listing.
 *
 * It lives in its own module with no `'use client'` directive on purpose. When a server
 * component imports a value from a client module, Next hands back a client *reference*
 * rather than the value itself — so importing this from `./listing` silently turned 24
 * into `[object Object]`, and the space in that string made every catalogue URL invalid.
 * A neutral module is imported normally by both sides.
 */
export const PAGE_SIZE = 24;
