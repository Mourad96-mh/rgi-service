import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatMad, type Order } from '@rgi/types';

/**
 * CallMeBot relays one message to one handset that has opted in. It is a free, unofficial
 * bridge: no Meta business account, no per-message cost, no template approval — which is
 * why it is the right tool for "ring the shop when an order lands" and the wrong tool for
 * anything customer-facing. Swapping it for the WhatsApp Cloud API later is a change to
 * `send()` alone; nothing above it knows the transport.
 */
const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php';

/** CallMeBot is a third party on the order path — it gets a short leash, never the request. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * The message travels in a query string, so length is bounded by the URL, not by WhatsApp.
 * A configured PC with a dozen parts overruns it, so the body degrades in two steps rather
 * than being cut mid-word: first the per-part lines go, then the item list is capped.
 */
const MAX_MESSAGE_CHARS = 1200;
const MAX_ITEMS_LISTED = 8;

const PAYMENT_LABEL: Record<Order['payment']['method'], string> = {
  cod: 'Paiement à la livraison',
  cmi: 'Carte bancaire (CMI)',
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  /** One warning per process, not one per order, when the shop never set a key. */
  private warnedDisabled = false;

  constructor(private readonly config: ConfigService) {}

  /** Digits only, no `+` — the form CallMeBot and `wa.me` both expect. */
  private get to(): string {
    return (this.config.get<string>('whatsapp.to') ?? '').replace(/\D/g, '');
  }

  private get apiKey(): string {
    return (this.config.get<string>('whatsapp.callmebotApiKey') ?? '').trim();
  }

  get enabled(): boolean {
    return Boolean(this.to && this.apiKey);
  }

  /**
   * Tell the shop an order just landed. **Never throws and is never awaited by the order**
   * — a relay that is down, slow or rate-limited must cost a notification, not the sale.
   * The order is already committed by the time this runs; the customer's own `wa.me` link
   * on the confirmation page is the second, independent path to the same inbox.
   */
  async notifyNewOrder(order: Order): Promise<void> {
    if (!this.enabled) {
      if (!this.warnedDisabled) {
        this.warnedDisabled = true;
        this.logger.warn(
          'Notification WhatsApp désactivée : SHOP_WHATSAPP_NUMBER ou CALLMEBOT_API_KEY ' +
            'manquant. Les commandes sont enregistrées normalement.',
        );
      }
      return;
    }

    try {
      await this.send(this.formatOrder(order));
      this.logger.log(`Notification WhatsApp envoyée pour ${order.orderNumber}.`);
    } catch (error) {
      // Swallowed on purpose: the caller is fire-and-forget and the order is already saved.
      this.logger.error(
        `Notification WhatsApp échouée pour ${order.orderNumber} : ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  private async send(text: string): Promise<void> {
    const url =
      `${CALLMEBOT_URL}?phone=${encodeURIComponent(this.to)}` +
      `&text=${encodeURIComponent(text)}` +
      `&apikey=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // CallMeBot answers 200 with an HTML error page for a bad key, so the body is the
      // only thing that says *why* — worth carrying into the log.
      const body = await response.text().catch(() => '');
      throw new Error(`CallMeBot ${response.status} ${body.slice(0, 200)}`);
    }
  }

  /**
   * The order, written for the person who has to act on it: ring the customer back to
   * confirm a cash-on-delivery order, then pick the parts off a shelf. Hence the phone
   * number and the full address before the totals, and every component of a build.
   *
   * Pure and exported for tests — nothing here touches the network.
   */
  formatOrder(order: Order): string {
    const detailed = WhatsappService.buildMessage(order, { parts: true, maxItems: Infinity });
    if (detailed.length <= MAX_MESSAGE_CHARS) return detailed;

    const withoutParts = WhatsappService.buildMessage(order, {
      parts: false,
      maxItems: Infinity,
    });
    if (withoutParts.length <= MAX_MESSAGE_CHARS) return withoutParts;

    return WhatsappService.buildMessage(order, { parts: false, maxItems: MAX_ITEMS_LISTED });
  }

  private static buildMessage(
    order: Order,
    options: { parts: boolean; maxItems: number },
  ): string {
    const lines: string[] = [
      `🛒 Nouvelle commande *${order.orderNumber}* — Rgi Service`,
      '',
      `👤 ${order.contact.name}`,
      `📞 ${order.contact.phone}`,
      `📧 ${order.contact.email}`,
    ];

    const address = order.shipping.address;
    if (order.shipping.method === 'pickup') {
      lines.push('🏬 Retrait en magasin');
    } else if (address) {
      // `line2` is a floor or an apartment, and the postal code belongs against the city
      // ("Casablanca 20250"), the way it is written on an envelope here. Empty parts are
      // dropped so the address never reads as "12 rue X, , Casablanca" to whoever types it
      // into a delivery app.
      const cityLine = [address.city, address.postalCode].filter(Boolean).join(' ');
      const parts = [address.line1, address.line2, cityLine].filter(Boolean);
      lines.push(`📍 ${parts.join(', ')}`);
    }

    lines.push('', '📦 Articles :');
    const shown = order.items.slice(0, options.maxItems);
    for (const item of shown) {
      lines.push(`• ${item.quantity} × ${item.name} — ${formatMad(item.lineTotal)}`);
      if (options.parts && item.build?.items.length) {
        for (const part of item.build.items) {
          lines.push(`   ↳ ${part.name ?? 'Composant'}`);
        }
      }
    }
    const hidden = order.items.length - shown.length;
    if (hidden > 0) lines.push(`• … et ${hidden} autre(s) article(s) — voir l'admin`);

    lines.push('');
    if (order.shipping.cost > 0) {
      lines.push(`🚚 Livraison : ${formatMad(order.shipping.cost)}`);
    }
    // For COD the total is the amount the driver collects, so it is labelled as such —
    // that is the number the person reading this on a phone is looking for.
    const totalLabel = order.payment.method === 'cod' ? 'Total à encaisser' : 'Total';
    lines.push(`💰 *${totalLabel} : ${formatMad(order.total)}*`);
    lines.push(`💳 ${PAYMENT_LABEL[order.payment.method]}`);

    if (order.notes?.trim()) lines.push('', `📝 Note : ${order.notes.trim()}`);

    return lines.join('\n');
  }
}
