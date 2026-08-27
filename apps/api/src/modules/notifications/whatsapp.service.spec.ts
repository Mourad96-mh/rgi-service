import type { ConfigService } from '@nestjs/config';
import type { Order } from '@rgi/types';
import { WhatsappService } from './whatsapp.service';

/** A ConfigService with only the two keys this service reads. */
function configWith(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const ENABLED = {
  'whatsapp.to': '212661827969',
  'whatsapp.callmebotApiKey': 'test-key',
};

function orderWith(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'RGI-2026-000042',
    contact: { name: 'Nadia Bennani', email: 'nadia@example.ma', phone: '+212612345678' },
    items: [
      {
        kind: 'product',
        product: 'p1',
        name: 'Souris Logitech G502',
        unitPrice: 35_000,
        quantity: 2,
        lineTotal: 70_000,
      },
    ],
    subtotal: 70_000,
    shipping: {
      method: 'delivery',
      cost: 4_000,
      address: {
        line1: '12 rue Ibn Batouta',
        line2: 'Étage 3',
        city: 'Casablanca',
        postalCode: '20250',
        phone: '+212612345678',
        isDefault: true,
      },
    },
    discountTotal: 0,
    total: 74_000,
    payment: { method: 'cod', status: 'pending' },
    status: 'pending',
    statusHistory: [{ status: 'pending', at: '2026-08-27T10:00:00.000Z' }],
    ...overrides,
  };
}

describe('WhatsappService', () => {
  describe('enabled', () => {
    it('is off until both the number and the key are set', () => {
      expect(new WhatsappService(configWith({})).enabled).toBe(false);
      expect(
        new WhatsappService(configWith({ 'whatsapp.to': '212661827969' })).enabled,
      ).toBe(false);
      expect(new WhatsappService(configWith(ENABLED)).enabled).toBe(true);
    });

    it('ignores a number written with spaces and a +', () => {
      const service = new WhatsappService(
        configWith({ ...ENABLED, 'whatsapp.to': '+212 661-827969' }),
      );
      expect(service.enabled).toBe(true);
    });
  });

  describe('formatOrder', () => {
    const service = new WhatsappService(configWith(ENABLED));

    it('carries everything the shop needs to call back and pick the parts', () => {
      const message = service.formatOrder(orderWith({ notes: 'Appeler après 18h' }));

      expect(message).toContain('RGI-2026-000042');
      expect(message).toContain('Nadia Bennani');
      expect(message).toContain('+212612345678');
      expect(message).toContain('12 rue Ibn Batouta, Étage 3, Casablanca 20250');
      expect(message).toContain('2 × Souris Logitech G502');
      expect(message).toContain('Total à encaisser : 740,00 MAD');
      expect(message).toContain('Paiement à la livraison');
      expect(message).toContain('Appeler après 18h');
    });

    it('says "retrait en magasin" instead of printing an absent address', () => {
      const message = service.formatOrder(
        orderWith({ shipping: { method: 'pickup', cost: 0 } }),
      );
      expect(message).toContain('Retrait en magasin');
      expect(message).not.toContain('📍');
      expect(message).not.toContain('🚚');
    });

    it('lists every component of a configured PC', () => {
      const message = service.formatOrder(
        orderWith({
          items: [
            {
              kind: 'build',
              name: 'PC sur mesure',
              unitPrice: 800_000,
              quantity: 1,
              lineTotal: 800_000,
              build: {
                items: [
                  { slot: 'cpu', product: 'c1', priceAtBuild: 200_000, name: 'Ryzen 5 5600', quantity: 1 },
                  { slot: 'gpu', product: 'g1', priceAtBuild: 400_000, name: 'RTX 4060', quantity: 1 },
                ],
                servicesIncluded: true,
                discountPct: 5,
                subtotal: 842_000,
                total: 800_000,
                estimatedWattage: 450,
              },
            },
          ],
        }),
      );

      expect(message).toContain('↳ Ryzen 5 5600');
      expect(message).toContain('↳ RTX 4060');
    });

    it('drops the part lines rather than overrun the URL on a long order', () => {
      const many = Array.from({ length: 40 }, (_, i) => ({
        kind: 'product' as const,
        product: `p${i}`,
        name: `Composant numéro ${i} avec un nom délibérément long`,
        unitPrice: 10_000,
        quantity: 1,
        lineTotal: 10_000,
      }));
      const message = service.formatOrder(orderWith({ items: many }));

      expect(message.length).toBeLessThanOrEqual(1200);
      // The parts that matter survive the trim.
      expect(message).toContain('RGI-2026-000042');
      expect(message).toContain('Total à encaisser');
      expect(message).toContain('autre(s) article(s)');
    });
  });

  describe('notifyNewOrder', () => {
    it('sends nothing, and does not throw, when the key is missing', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      await new WhatsappService(configWith({})).notifyNewOrder(orderWith());
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('never throws when the relay fails — an order must not depend on it', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        new WhatsappService(configWith(ENABLED)).notifyNewOrder(orderWith()),
      ).resolves.toBeUndefined();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });

    it('encodes the message into the CallMeBot query string', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('Message queued', { status: 200 }));

      await new WhatsappService(configWith(ENABLED)).notifyNewOrder(orderWith());

      const url = String(fetchSpy.mock.calls[0]![0]);
      expect(url).toContain('phone=212661827969');
      expect(url).toContain('apikey=test-key');
      expect(url).toContain(encodeURIComponent('RGI-2026-000042'));
      // A raw newline or & would silently truncate the message on the relay's side.
      expect(url).not.toMatch(/\n/);
      fetchSpy.mockRestore();
    });
  });
});
