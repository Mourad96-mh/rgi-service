import type {
  AttributeDefinition,
  Build,
  BuildEvaluation,
  CartLineDto,
  CartValidationResult,
  CheckoutQuote,
  CreateOrderDto,
  Order,
  ShippingMethod,
  Category,
  CategoryNode,
  Product,
  ProductListResponse,
  ProductSummary,
  SlotDefinition,
  SlotId,
} from '@rgi/types';
import { API_URL } from './env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & {
  /** Seconds before Next revalidates the cached response. 0 disables caching. */
  revalidate?: number;
};

/**
 * The one place the storefront talks to the API. Every error surfaces the French message
 * the API already produced (API_SPEC.md §Cross-cutting), so pages never invent copy.
 */
/**
 * Statuses worth trying again: the API throttles at 120 requests/minute, and a static
 * build asks for the whole catalogue at once — far more than that in a single burst.
 * Without this the build would quietly bake « catalogue indisponible » into the HTML of
 * every page unlucky enough to come after the limit.
 */
const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const MAX_WAIT_MS = 70_000; // one throttle window plus a margin

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate = 60, ...init } = options;

  let res!: Response;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      next: revalidate > 0 ? { revalidate } : undefined,
      cache: revalidate > 0 ? undefined : 'no-store',
    });

    if (!RETRY_STATUSES.has(res.status) || attempt >= MAX_ATTEMPTS) break;

    // The throttler says exactly how long its window has left; trust it over a guess.
    const retryAfter = Number(res.headers.get('Retry-After'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, MAX_WAIT_MS)
      : Math.min(2 ** attempt * 500, MAX_WAIT_MS);
    await sleep(wait);
  }

  if (!res.ok) {
    let message = 'Le service est momentanément indisponible. Réessayez dans un instant.';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    } catch {
      // keep the generic French message
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

/** Same as `apiFetch` but returns `null` instead of throwing on 404 / a dead API. */
export async function apiFetchOrNull<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch {
    return null;
  }
}

export const api = {
  categories: () => apiFetch<CategoryNode[]>('/categories', { revalidate: 300 }),

  category: (slug: string) =>
    apiFetch<{ category: Category; attributeDefinitions: AttributeDefinition[] }>(
      `/categories/${slug}`,
      { revalidate: 300 },
    ),

  products: (query: string) =>
    apiFetch<ProductListResponse>(`/products${query ? `?${query}` : ''}`, {
      revalidate: 60,
    }),

  product: (slug: string) => apiFetch<Product>(`/products/${slug}`, { revalidate: 60 }),

  search: (q: string, limit = 8) =>
    apiFetch<ProductSummary[]>(
      `/products/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { revalidate: 0 },
    ),

  configuratorSlots: () =>
    apiFetch<{ slots: SlotDefinition[]; discountPct: number }>('/configurator/slots', {
      revalidate: 3600,
    }),

  configuratorParts: (
    slot: SlotId,
    selection: Record<string, string | string[]>,
    inStockOnly = false,
  ) =>
    apiFetch<{ parts: ProductSummary[]; incompatibleCount: number }>(
      `/configurator/parts?slot=${slot}&selection=${encodeURIComponent(
        JSON.stringify(selection),
      )}${inStockOnly ? '&inStock=true' : ''}`,
      { revalidate: 0 },
    ),

  validateBuild: (selection: Record<string, string | string[]>) =>
    apiFetch<BuildEvaluation>('/configurator/validate', {
      method: 'POST',
      body: JSON.stringify({ selection }),
      revalidate: 0,
    }),

  saveBuild: (selection: Record<string, string | string[]>, name?: string) =>
    apiFetch<Build>('/configurator/builds', {
      method: 'POST',
      body: JSON.stringify({ selection, name }),
      revalidate: 0,
    }),

  build: (shareId: string) =>
    apiFetch<Build>(`/configurator/builds/${shareId}`, { revalidate: 0 }),

  validateCart: (items: CartLineDto[]) =>
    apiFetch<CartValidationResult>('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items }),
      revalidate: 0,
    }),

  checkoutQuote: (
    items: CartLineDto[],
    shipping: { method: ShippingMethod; city?: string; zone?: string },
  ) =>
    apiFetch<CheckoutQuote>('/checkout/quote', {
      method: 'POST',
      body: JSON.stringify({ items, shipping }),
      revalidate: 0,
    }),

  /**
   * The idempotency key makes a double-submit — impatient click, flaky 3G — return the
   * first order instead of placing a second one (API_SPEC.md §Cross-cutting).
   */
  createOrder: (dto: CreateOrderDto, idempotencyKey: string) =>
    apiFetch<Order & { publicToken?: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: { 'Idempotency-Key': idempotencyKey },
      revalidate: 0,
    }),

  order: (orderNumber: string, token?: string) =>
    apiFetch<Order>(
      `/orders/${orderNumber}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
      { revalidate: 0 },
    ),
};
