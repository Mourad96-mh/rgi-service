'use server';

import { revalidatePath } from 'next/cache';
import type { Order, OrderStatus, PaymentStatus } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Status changes go through the API, which owns the transition rules and the restock on
 * cancellation — the dashboard only asks. Errors come back as the API's French message.
 */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  try {
    await adminFetch<Order>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    revalidatePath(`/admin/commandes/${id}`);
    revalidatePath('/admin/commandes');
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Action impossible.',
    };
  }
}

export async function setPaymentStatus(
  id: string,
  status: PaymentStatus,
): Promise<ActionResult> {
  try {
    await adminFetch<Order>(`/admin/orders/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    revalidatePath(`/admin/commandes/${id}`);
    revalidatePath('/admin/commandes');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Action impossible.',
    };
  }
}
