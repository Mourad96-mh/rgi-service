/**
 * Cross-cutting primitives.
 *
 * MONEY RULE (CLAUDE.md §6): every amount in this codebase is an INTEGER number of
 * centimes. 1 MAD = 100 centimes. Never a float, never a string, never MAD units.
 */

/** An amount in centimes. Branded so a raw MAD number can't be passed by accident. */
export type Centimes = number;

/** A string localized per site locale. `fr` is always present; `ar` ships later. */
export interface Localized {
  fr: string;
  ar?: string;
}

export type Locale = 'fr' | 'ar';

export const DEFAULT_LOCALE: Locale = 'fr';

/** Shape returned by every paginated list endpoint (API_SPEC.md). */
export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/** Consistent API error shape (API_SPEC.md §Cross-cutting). Messages are French. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export const MAX_PAGE_LIMIT = 100;
