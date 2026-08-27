// These were server actions. The dashboard now ships inside the static export, where no
// server exists to run one, so they are ordinary async functions that the client
// components already importing them call directly against the API. See lib/admin/session.
import type { Product, ProductUsage } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface SaveResult {
  ok: boolean;
  message?: string;
  id?: string;
}

/** Everything the form sends; prices arrive already converted to centimes. */
export interface ProductPayload {
  name: { fr: string };
  slug?: string;
  sku: string;
  brand: string;
  category: string;
  description: { fr: string };
  price: number;
  compareAtPrice?: number;
  /**
   * A time-boxed promo price. `null` is not the same as absent on a PATCH: absent means
   * "leave the promotion alone", `null` is what actually removes one. The API maps `null`
   * to clearing the field.
   */
  flashDeal?: { price: number; startsAt: string; endsAt: string } | null;
  stock: number;
  lowStockThreshold: number;
  isConfiguratorPart: boolean;
  status: 'active' | 'draft' | 'archived';
  attributes: Record<string, unknown>;
  images: { url: string; publicId: string; alt?: string; isPrimary: boolean; order: number }[];
  metaTitle?: { fr: string };
  metaDescription?: { fr: string };
}

/**
 * Create or update. The API re-validates every attribute against the category's
 * definitions (required fields, types, strict enum values), so a typo that would break
 * the configurator is refused here rather than silently stored — the message it returns is
 * what the form shows.
 */
export async function saveProduct(
  payload: ProductPayload,
  id?: string,
): Promise<SaveResult> {
  try {
    const product = await adminFetch<Product>(
      id ? `/products/${id}` : '/products',
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
    );
    return { ok: true, id: product.id };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Enregistrement impossible.',
    };
  }
}

/**
 * Remove a product from the shop.
 *
 * `DELETE /products/:id` **archives**: the row stays in MongoDB, so an order placed last
 * month still resolves the product it contains, and the change is undone by setting the
 * status back to "En ligne" on the product's own page. A hard delete would leave those
 * order lines pointing at nothing.
 */
export async function archiveProduct(id: string): Promise<SaveResult> {
  try {
    await adminFetch<void>(`/products/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Archivage impossible.',
    };
  }
}

/**
 * What the product is referenced by, so the delete button can tell the truth *before*
 * staff commit to anything: a product that has been ordered can only ever be archived.
 */
export async function fetchProductUsage(id: string): Promise<ProductUsage | null> {
  try {
    return await adminFetch<ProductUsage>(`/admin/products/${id}/usage`);
  } catch {
    return null;
  }
}

/**
 * Destroy the record for good — the "delete" half of what the Produits section owns.
 *
 * Distinct from `archiveProduct` on purpose. Archiving retires a product that has a past;
 * this is for a product that has none — a duplicate or a typo created minutes ago. The API
 * re-checks that for itself and refuses otherwise, so a stale "deletable" answer in the
 * browser cannot destroy an ordered product.
 */
export async function deleteProductForever(id: string): Promise<SaveResult> {
  try {
    await adminFetch<void>(`/admin/products/${id}/permanent`, { method: 'DELETE' });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Suppression impossible.',
    };
  }
}
