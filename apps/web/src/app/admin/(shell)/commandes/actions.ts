// These were server actions. The dashboard now ships inside the static export, where no
// server exists to run one, so they are ordinary async functions that the client
// components already importing them call directly against the API. See lib/admin/session.
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
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Action impossible.',
    };
  }
}
