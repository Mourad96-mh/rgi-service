import type { Centimes } from './common';
import type { Attributes } from './catalog';

/** The build steps. Order here is the order the UI walks the customer through. */
export type SlotId =
  | 'case'
  | 'motherboard'
  | 'cpu'
  | 'cooler'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'fans';

export interface SlotDefinition {
  id: SlotId;
  componentType: string;
  labelFr: string;
  helpFr: string;
  required: boolean;
  /** Slots that accept several parts at once (RAM sticks, drives, fans). */
  multi: boolean;
  maxItems?: number;
  order: number;
}

/**
 * Slot definitions, in selection order (CONFIGURATOR_ENGINE.md §1).
 * `case` first because it constrains everything downstream (form factor, GPU length,
 * cooler height, PSU form factor).
 */
export const SLOTS: SlotDefinition[] = [
  { id: 'case', componentType: 'case', labelFr: 'Boîtier', helpFr: 'Le format du boîtier détermine la carte mère, la longueur de GPU et la hauteur du ventirad.', required: true, multi: false, order: 1 },
  { id: 'motherboard', componentType: 'motherboard', labelFr: 'Carte mère', helpFr: 'Définit le socket CPU et le type de mémoire (DDR4 / DDR5).', required: true, multi: false, order: 2 },
  { id: 'cpu', componentType: 'cpu', labelFr: 'Processeur', helpFr: 'Le socket doit correspondre à celui de la carte mère.', required: true, multi: false, order: 3 },
  { id: 'cooler', componentType: 'cooler', labelFr: 'Refroidissement', helpFr: 'Optionnel si le processeur est livré avec son ventirad.', required: false, multi: false, order: 4 },
  { id: 'ram', componentType: 'ram', labelFr: 'Mémoire RAM', helpFr: 'Le type doit correspondre à la carte mère ; le nombre de barrettes à ses slots.', required: true, multi: true, maxItems: 8, order: 5 },
  { id: 'gpu', componentType: 'gpu', labelFr: 'Carte graphique', helpFr: "Optionnelle si le processeur dispose d'un GPU intégré.", required: false, multi: false, order: 6 },
  { id: 'storage', componentType: 'storage', labelFr: 'Stockage', helpFr: 'SSD NVMe recommandé pour le système.', required: true, multi: true, maxItems: 4, order: 7 },
  { id: 'psu', componentType: 'psu', labelFr: 'Alimentation', helpFr: 'Doit fournir assez de puissance avec 20% de marge.', required: true, multi: false, order: 8 },
  { id: 'fans', componentType: 'fan', labelFr: 'Ventilateurs', helpFr: 'Flux d’air supplémentaire (optionnel).', required: false, multi: true, maxItems: 8, order: 9 },
];

export const SLOT_ORDER: SlotId[] = SLOTS.map((s) => s.id);

/** Minimal projection of a Product the engine needs. Keep it free of DB concerns. */
export interface Part {
  id: string;
  categoryType: string;
  /** effective price, in centimes */
  price: Centimes;
  stock: number;
  attributes: Attributes;
  /** Display-only, carried through so the UI/snapshot can name the part. */
  name?: string;
  brand?: string;
  slug?: string;
  image?: string;
}

export interface Selection {
  [slot: string]: Part | Part[] | undefined;
}

/**
 * The six operators from DATA_MODEL.md §5. `fits` is a readability alias of `lte`
 * (used for physical clearance rules) and behaves identically.
 *
 * "count(RAM modules) <= mobo.ram_slots" needs no extra operator: a RAM product carries
 * a `modules` attribute (a 2x16 GB kit is one product with modules = 2), so the rule is
 * `sum_lte` over `modules`.
 */
export type RuleType = 'match' | 'gte' | 'lte' | 'fits' | 'sum_lte' | 'includes';

export type Severity = 'error' | 'warning';

export interface RuleOperandSlot {
  slot: SlotId;
  attr: string;
}
export interface RuleOperandConst {
  const: number | string;
}
export type RuleOperand = RuleOperandSlot | RuleOperandConst;

export function isConstOperand(o: RuleOperand): o is RuleOperandConst {
  return (o as RuleOperandConst).const !== undefined;
}

/** A compatibility rule — data, never code (CLAUDE.md §6). */
export interface Rule {
  id: string;
  description: string;
  type: RuleType;
  /**
   * The left operand. For `sum_lte` the real left side is the sum described by
   * `sumSlots`/`sumAttr`; `left` then only names a representative slot so the UI knows
   * which step to highlight.
   */
  left: RuleOperandSlot;
  right: RuleOperand;
  /** slots whose `sumAttr` are summed, for `sum_lte` */
  sumSlots?: SlotId[];
  sumAttr?: string;
  /** e.g. 0.8 → require right * 0.8 >= sum (20% PSU headroom) */
  factor?: number;
  /** flat allowance added to a sum, in the attribute's unit (e.g. +100 W for board/drives/fans) */
  baseAllowance?: number;
  severity: Severity;
  messageFr: string;
  isActive: boolean;
}

export interface Violation {
  ruleId: string;
  severity: Severity;
  messageFr: string;
  slots: SlotId[];
}

export interface BuildEvaluation {
  /** true when there are zero `error` violations AND every required slot is filled */
  isValid: boolean;
  violations: Violation[];
  /** slots still empty that must be filled before checkout */
  missingSlots: SlotId[];
  subtotal: Centimes;
  discountPct: number;
  total: Centimes;
  estimatedWattage: number;
  recommendedPsuWattage: number;
}

/** −5% for building in the configurator (CLAUDE.md §1). */
export const CONFIGURATOR_DISCOUNT_PCT = 5;

/** Wattage allowance for motherboard + drives + fans when sizing the PSU. */
export const BASE_SYSTEM_WATTS = 100;

/** PSU headroom factor: require psu.wattage * 0.8 >= estimated draw. */
export const PSU_HEADROOM_FACTOR = 0.8;
