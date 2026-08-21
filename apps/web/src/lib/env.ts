/** Public runtime configuration. Server code may read more; the browser only sees these. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const SITE_NAME = 'Rgi Service';
