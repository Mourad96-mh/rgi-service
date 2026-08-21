'use server';

import { revalidatePath } from 'next/cache';
import type { Product } from '@rgi/types';
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
    revalidatePath('/admin/produits');
    if (id) revalidatePath(`/admin/produits/${id}`);
    return { ok: true, id: product.id };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Enregistrement impossible.',
    };
  }
}

/** Quick stock correction from the list — writes an `inventorylogs` row via the API. */
export async function setStock(id: string, quantity: number): Promise<SaveResult> {
  try {
    await adminFetch<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ mode: 'set', quantity }),
    });
    revalidatePath('/admin/produits');
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Mise à jour impossible.',
    };
  }
}
