import type { Centimes } from './common';
import type { BuildSnapshot } from './build';
import type { Address } from './user';

export type PaymentMethod = 'cmi' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** Statuses an order can move to from a given status (admin UI + API both use this). */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const ORDER_STATUS_LABEL_FR: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const PAYMENT_STATUS_LABEL_FR: Record<PaymentStatus, string> = {
  pending: 'En attente',
  paid: 'Payée',
  failed: 'Échouée',
  refunded: 'Remboursée',
};

export type ShippingMethod = 'delivery' | 'pickup';

export interface OrderItem {
  kind: 'product' | 'build';
  product?: string;
  build?: BuildSnapshot;
  /** name snapshot — the order must stay readable after the catalog changes */
  name: string;
  image?: string;
  unitPrice: Centimes;
  quantity: number;
  lineTotal: Centimes;
}

export interface Order {
  id: string;
  orderNumber: string;
  user?: string;
  contact: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: Centimes;
  shipping: {
    method: ShippingMethod;
    zone?: string;
    cost: Centimes;
    address?: Address;
  };
  discountTotal: Centimes;
  total: Centimes;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    cmiRef?: string;
  };
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; by?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

/** A cart line as the client describes it: ids and quantities only, never prices. */
export interface CartLineDto {
  kind: 'product' | 'build';
  /** product id, for kind 'product' */
  productId?: string;
  /** slot to product id(s), for kind 'build' */
  buildSelection?: Record<string, string | string[]>;
  quantity: number;
}

/** What the client sends to POST /orders. Prices are recomputed server-side. */
export interface CreateOrderDto {
  contact: { name: string; email: string; phone: string };
  items: CartLineDto[];
  shipping: { method: ShippingMethod; zone?: string; address?: Address };
  payment: { method: PaymentMethod };
  notes?: string;
}

/** Server response of /cart/validate — re-priced and stock-checked. */
export interface CartValidationLine {
  line: CartLineDto;
  name: string;
  image?: string;
  unitPrice: Centimes;
  lineTotal: Centimes;
  available: number;
  /** French problem message, e.g. "Stock insuffisant" or "Configuration incompatible" */
  problem?: string;
}

export interface CartValidationResult {
  lines: CartValidationLine[];
  subtotal: Centimes;
  isValid: boolean;
}

export interface CheckoutQuote {
  subtotal: Centimes;
  shippingCost: Centimes;
  discountTotal: Centimes;
  total: Centimes;
  /** free-delivery threshold reached, etc. — French copy for the UI */
  notes: string[];
}
