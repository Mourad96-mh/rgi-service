// These were server actions. The dashboard now ships inside the static export, where no
// server exists to run one, so they are ordinary async functions that the client
// components already importing them call directly against the API. See lib/admin/session.
import type { InventoryMovement, Product } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface StockResult {
  ok: boolean;
  message?: string;
}

/**
 * Quantity corrections live here rather than with the product form on purpose: changing
 * how many units sit on the shelf is a different job from editing the product record, and
 * the API agrees — it is a separate endpoint that writes an `inventorylogs` row, so every
 * correction is auditable (DATA_MODEL.md §8).
 */
export async function setStock(id: string, quantity: number): Promise<StockResult> {
  try {
    await adminFetch<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ mode: 'set', quantity }),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Mise à jour impossible.',
    };
  }
}

/**
 * The alert threshold — the number under which a product counts as "stock faible".
 *
 * It is per-product because a motherboard staff keep two of and a thermal paste they keep
 * fifty of should not warn at the same moment. Unlike the quantity this is an edit to the
 * product record, so it goes through the ordinary product endpoint.
 */
export async function setThreshold(id: string, threshold: number): Promise<StockResult> {
  try {
    await adminFetch<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lowStockThreshold: threshold }),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Mise à jour impossible.',
    };
  }
}

/** Recent movements for one product — the history panel behind each row. */
export async function fetchMovements(id: string): Promise<InventoryMovement[]> {
  try {
    return await adminFetch<InventoryMovement[]>(`/admin/products/${id}/inventory`);
  } catch {
    return [];
  }
}
