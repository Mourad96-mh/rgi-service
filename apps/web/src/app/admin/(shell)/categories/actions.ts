'use server';

import { revalidatePath } from 'next/cache';
import type { Category } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface CategoryResult {
  ok: boolean;
  message?: string;
}

export interface CategoryPayload {
  name: { fr: string };
  slug?: string;
  parent?: string | null;
  type: string;
  componentType?: string;
  order?: number;
  isActive?: boolean;
}

/**
 * The category tree is the spine of the whole shop: it decides the storefront menus, the
 * `/composants/cartes-graphiques/` URLs the SEO strategy depends on, and — through
 * `componentType` — which technical characteristics a product in it is asked for.
 *
 * `revalidatePath('/', 'layout')` is not over-caution: the storefront header is built from
 * this tree in `(boutique)/layout.tsx`, so a category added here has to invalidate every
 * cached storefront page, not just the admin one.
 */
export async function saveCategory(
  payload: CategoryPayload,
  id?: string,
): Promise<CategoryResult> {
  try {
    await adminFetch<Category>(id ? `/categories/${id}` : '/categories', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Enregistrement impossible.',
    };
  }
}

export async function deleteCategory(id: string): Promise<CategoryResult> {
  try {
    await adminFetch<void>(`/categories/${id}`, { method: 'DELETE' });
    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Suppression impossible.',
    };
  }
}
