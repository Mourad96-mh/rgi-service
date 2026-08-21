import type { Centimes, Localized, ProductSummary } from '@rgi/types';
import { formatMad } from '@rgi/types';

/** `1 234,00 MAD` — the shared helper, re-exported so components import one thing. */
export const price = (centimes: Centimes) => formatMad(centimes);

/** French text of a localized field (Arabic ships later). */
export const localized = (value: Localized | undefined) => value?.fr ?? '';

/** Whole-percent discount between two prices, for the "-15%" tag. */
export function discountPct(now: Centimes, was?: Centimes): number | null {
  if (!was || was <= now) return null;
  return Math.round(((was - now) / was) * 100);
}

/** The primary image of a product, or the first one. */
export function primaryImage(product: Pick<ProductSummary, 'images'>) {
  return product.images.find((i) => i.isPrimary) ?? product.images[0];
}

/**
 * The two or three attributes worth showing on a card, per component type. A GPU card
 * that says "16 Go · 320 mm · 304 W" tells the customer more than a paragraph.
 */
const CARD_SPECS: Record<string, string[]> = {
  cpu: ['socket', 'cores', 'tdp_watts'],
  motherboard: ['socket', 'form_factor', 'ram_type'],
  ram: ['capacity_gb', 'ram_type', 'speed_mhz'],
  gpu: ['vram_gb', 'length_mm', 'tdp_watts'],
  psu: ['wattage', 'efficiency'],
  case: ['form_factors_supported', 'max_gpu_length_mm'],
  cooler: ['type', 'height_mm', 'tdp_watts'],
  storage: ['interface', 'capacity_gb'],
  fan: ['size_mm', 'rgb'],
  prebuilt: ['cpu', 'gpu', 'ram_gb'],
  workstation: ['cpu', 'gpu', 'ram_gb'],
  laptop: ['cpu', 'gpu', 'screen_inches'],
  monitor: ['screen_inches', 'resolution', 'refresh_hz'],
  peripheral: ['peripheral_type', 'connection'],
  console: ['brand_family', 'storage_gb'],
};

const UNITS: Record<string, string> = {
  capacity_gb: ' Go',
  vram_gb: ' Go',
  ram_gb: ' Go',
  storage_gb: ' Go',
  max_ram_gb: ' Go',
  length_mm: ' mm',
  height_mm: ' mm',
  max_gpu_length_mm: ' mm',
  size_mm: ' mm',
  tdp_watts: ' W',
  wattage: ' W',
  speed_mhz: ' MHz',
  refresh_hz: ' Hz',
  screen_inches: '"',
  cores: ' cœurs',
};

const BOOLEAN_LABELS: Record<string, [string, string]> = {
  rgb: ['RGB', 'Sans RGB'],
  wifi: ['Wi-Fi', 'Sans Wi-Fi'],
  modular: ['Modulaire', 'Non modulaire'],
  curved: ['Incurvé', 'Plat'],
  integrated_graphics: ['iGPU', 'Sans iGPU'],
};

function formatValue(key: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return value.join(' / ');
  if (typeof value === 'boolean') {
    const labels = BOOLEAN_LABELS[key];
    if (!labels) return value ? 'Oui' : 'Non';
    return value ? labels[0] : labels[1];
  }
  return `${String(value)}${UNITS[key] ?? ''}`;
}

export function cardSpecs(product: Pick<ProductSummary, 'categoryType' | 'attributes'>) {
  const keys = CARD_SPECS[product.categoryType] ?? Object.keys(product.attributes).slice(0, 3);
  return keys
    .map((key) => formatValue(key, product.attributes[key]))
    .filter((v): v is string => Boolean(v))
    .slice(0, 3);
}

export { formatValue as formatAttributeValue };
