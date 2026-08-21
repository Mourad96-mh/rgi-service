import type { Centimes } from './common';
import type { SlotId } from './configurator';

/** A saved custom PC configuration (DATA_MODEL.md §4). */
export interface BuildItem {
  slot: SlotId;
  product: string;
  priceAtBuild: Centimes;
  /** snapshot so a shared build still reads correctly if a product is renamed */
  name?: string;
  brand?: string;
  image?: string;
  quantity: number;
}

export interface Build {
  id: string;
  user?: string;
  shareId: string;
  name?: string;
  items: BuildItem[];
  servicesIncluded: boolean;
  discountPct: number;
  subtotal: Centimes;
  total: Centimes;
  estimatedWattage: number;
  isValid: boolean;
  warnings: string[];
  createdAt?: string;
}

/** What the client posts to /configurator/validate — ids only, never prices. */
export interface BuildSelectionDto {
  /** slot → product id (single-slot) or product ids (multi-slot) */
  selection: Partial<Record<SlotId, string | string[]>>;
}

/**
 * The normalized, server-signed build the frontend puts in the cart
 * (CONFIGURATOR_ENGINE.md §5 step 3).
 */
export interface BuildSnapshot {
  items: BuildItem[];
  servicesIncluded: boolean;
  discountPct: number;
  subtotal: Centimes;
  total: Centimes;
  estimatedWattage: number;
}
