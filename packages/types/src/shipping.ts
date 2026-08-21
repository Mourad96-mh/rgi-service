import type { Centimes } from './common';
import type { ShippingMethod } from './order';

/**
 * Delivery zones and costs.
 *
 * `PROJECT_SPEC.md` promises "livraison 48h partout au Maroc" but never prices it, so this
 * is a first, explicit rule set — kept as data in one place so the client's real tariff is
 * a one-file change (and can move to the admin later).
 * TODO(spec): confirm zones, costs and the free-delivery threshold with the client.
 */
export interface ShippingZone {
  id: string;
  labelFr: string;
  cost: Centimes;
  etaFr: string;
  /** Cities that resolve to this zone, lowercase and unaccented for matching. */
  cities: string[];
}

export const FREE_DELIVERY_THRESHOLD: Centimes = 300_000; // 3 000,00 MAD

const AXE_CASA_RABAT: ShippingZone = {
  id: 'axe-casa-rabat',
  labelFr: 'Casablanca · Rabat · Salé · Témara · Mohammedia · Kénitra',
  cost: 4_000,
  etaFr: 'Livraison sous 24 à 48 h',
  cities: ['casablanca', 'rabat', 'sale', 'temara', 'mohammedia', 'kenitra', 'bouskoura'],
};

const GRANDES_VILLES: ShippingZone = {
  id: 'grandes-villes',
  labelFr: 'Marrakech · Tanger · Fès · Agadir · Meknès · Oujda · Tétouan',
  cost: 5_000,
  etaFr: 'Livraison sous 48 h',
  cities: ['marrakech', 'tanger', 'fes', 'agadir', 'meknes', 'oujda', 'tetouan'],
};

/** Anything that does not match a named zone falls here. */
export const DEFAULT_ZONE: ShippingZone = {
  id: 'reste-du-maroc',
  labelFr: 'Reste du Maroc',
  cost: 7_000,
  etaFr: 'Livraison sous 48 à 72 h',
  cities: [],
};

export const SHIPPING_ZONES: ShippingZone[] = [AXE_CASA_RABAT, GRANDES_VILLES, DEFAULT_ZONE];


export const PICKUP_ZONE_ID = 'retrait';

/** Fold accents and case so "Témara", "temara" and "TEMARA" all match. */
export function normalizeCity(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function zoneForCity(city: string | undefined): ShippingZone {
  const needle = normalizeCity(city ?? '');
  return SHIPPING_ZONES.find((zone) => zone.cities.includes(needle)) ?? DEFAULT_ZONE;
}

export function zoneById(id: string | undefined): ShippingZone | undefined {
  return SHIPPING_ZONES.find((zone) => zone.id === id);
}

/**
 * Shipping cost for a basket. Free above the threshold, and always free when the customer
 * collects in store. Integer centimes only (CLAUDE.md §6).
 */
export function shippingCost(
  subtotal: Centimes,
  method: ShippingMethod,
  zone: ShippingZone,
): Centimes {
  if (method === 'pickup') return 0;
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return zone.cost;
}
