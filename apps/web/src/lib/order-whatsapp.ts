import type { Order } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from './format';
import { whatsappUrl } from './contact';

/**
 * The order, written out as the WhatsApp message the customer sends to the shop.
 *
 * This is a `wa.me` link, so the message leaves the *customer's* account and only arrives
 * once they press Send — it is a convenience on top of the order, never the record of it.
 * The order itself is already in the database before this link is ever rendered, so a
 * customer who closes the tab costs the shop a notification, not a sale.
 *
 * Written for the person receiving it: they have to ring the customer back to confirm a
 * cash-on-delivery order and then pick the parts, so the phone number, the address and
 * every component of a configured PC are all in the body. `*asterisks*` are WhatsApp's
 * bold — they make the number and the total findable while scrolling a chat.
 */
export function orderWhatsappMessage(order: Order): string {
  const wa = t.order.wa;
  const lines: string[] = [wa.intro(order.orderNumber), ''];

  lines.push(`${wa.customer} : ${order.contact.name}`);
  lines.push(`${wa.phone} : ${order.contact.phone}`);
  lines.push(`${wa.email} : ${order.contact.email}`);

  const address = order.shipping.address;
  if (order.shipping.method === 'pickup') {
    lines.push(`${t.cart.shipping} : ${t.checkout.methodPickup}`);
  } else if (address) {
    // `line2` is a floor or an apartment, and the postal code belongs against the city
    // ("Casablanca 20250"), the way it is written on an envelope here. Empty parts are
    // dropped so the address never reads as "12 rue X, , Casablanca" to whoever types it
    // into a delivery app.
    const cityLine = [address.city, address.postalCode].filter(Boolean).join(' ');
    const parts = [address.line1, address.line2, cityLine].filter(Boolean);
    lines.push(`${t.checkout.methodDelivery} : ${parts.join(', ')}`);
  }

  lines.push('', `${wa.items} :`);
  for (const item of order.items) {
    lines.push(`• ${item.quantity} × ${item.name} — ${price(item.lineTotal)}`);
    if (item.build?.items.length) {
      for (const part of item.build.items) {
        lines.push(`   ↳ ${part.name ?? wa.parts}`);
      }
    }
  }

  lines.push('');
  lines.push(`${t.cart.subtotal} : ${price(order.subtotal)}`);
  lines.push(
    `${t.cart.shipping} : ${
      order.shipping.cost === 0 ? t.cart.shippingFree : price(order.shipping.cost)
    }`,
  );
  lines.push(`*${t.cart.total} : ${price(order.total)}*`);
  lines.push(
    `${wa.payment} : ${order.payment.method === 'cod' ? t.checkout.cod : t.checkout.cmi}`,
  );

  if (order.notes?.trim()) lines.push('', `${wa.note} : ${order.notes.trim()}`);

  return lines.join('\n');
}

/** The `wa.me` link for one order, pre-filled and encoded by `whatsappUrl`. */
export function orderWhatsappUrl(order: Order): string {
  return whatsappUrl(orderWhatsappMessage(order));
}
