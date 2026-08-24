// These were server actions. The dashboard now ships inside the static export, where no
// server exists to run one, so they are ordinary async functions that the client
// components already importing them call directly against the API. See lib/admin/session.
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
 * A category added here does not reach the shop on its own. The storefront header is built
 * from this tree at build time, and rgiservice.ma is a static export — so the change is
 * live in the dashboard immediately and on the shop only after the next build and upload
 * (DEPLOY_HOSTINGER.md §1). That is the cost the static target was accepted with.
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
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Suppression impossible.',
    };
  }
}
