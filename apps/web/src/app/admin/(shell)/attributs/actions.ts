'use server';

import { revalidatePath } from 'next/cache';
import type { AttributeDefinition } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface AttributeResult {
  ok: boolean;
  message?: string;
}

export interface AttributePayload {
  categoryType?: string;
  key?: string;
  label: { fr: string };
  dataType?: string;
  unit?: string;
  enumValues?: string[];
  multiple?: boolean;
  required?: boolean;
  filterable?: boolean;
  usedInCompatibility?: boolean;
  order?: number;
}

/**
 * One definition drives three things at once (DATA_MODEL.md §2): the field staff fill in
 * on the product form, the facet on the storefront listing, and the value the configurator
 * reads when deciding whether two parts fit. That is why this screen exists — it is the
 * single source of truth CLAUDE.md asks for ("compatibility is data, not code").
 *
 * `key` and `dataType` are create-only on the API: renaming a key would silently orphan
 * every value already stored on a product, and every compatibility rule referencing it.
 */
export async function saveAttribute(
  payload: AttributePayload,
  id?: string,
): Promise<AttributeResult> {
  try {
    await adminFetch<AttributeDefinition>(
      id ? `/attribute-definitions/${id}` : '/attribute-definitions',
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
    );
    revalidatePath('/admin/attributs');
    // Product forms and storefront facets are both built from these definitions.
    revalidatePath('/admin/produits');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Enregistrement impossible.',
    };
  }
}

export async function deleteAttribute(id: string): Promise<AttributeResult> {
  try {
    await adminFetch<void>(`/attribute-definitions/${id}`, { method: 'DELETE' });
    revalidatePath('/admin/attributs');
    revalidatePath('/admin/produits');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Suppression impossible.',
    };
  }
}
