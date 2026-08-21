import type { OrderStatus, PaymentStatus } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';

const ORDER_TONE: Record<OrderStatus, string> = {
  pending: 'bg-warn/15 text-warn',
  confirmed: 'bg-accent2/15 text-accent2',
  preparing: 'bg-accent/20 text-accent',
  shipped: 'bg-accent/20 text-accent',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-white/[.07] text-faint',
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  pending: 'bg-warn/15 text-warn',
  paid: 'bg-success/15 text-success',
  failed: 'bg-accent3/15 text-accent3',
  refunded: 'bg-white/[.07] text-faint',
};

/** Status never relies on colour alone — the label is always spelled out. */
export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`chip ${ORDER_TONE[status]}`}>{ORDER_STATUS_LABEL_FR[status]}</span>;
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <span className={`chip ${PAYMENT_TONE[status]}`}>{PAYMENT_STATUS_LABEL_FR[status]}</span>;
}
