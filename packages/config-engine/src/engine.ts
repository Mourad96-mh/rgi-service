import type {
  AttributeValue,
  BuildEvaluation,
  Centimes,
  Part,
  Rule,
  RuleOperand,
  RuleType,
  Selection,
  SlotId,
  Violation,
} from '@rgi/types';
import {
  applyDiscountPct,
  BASE_SYSTEM_WATTS,
  CONFIGURATOR_DISCOUNT_PCT,
  isConstOperand,
  PSU_HEADROOM_FACTOR,
  SLOTS,
} from '@rgi/types';

/**
 * The compatibility engine.
 *
 * Pure by contract: no DB, no HTTP, no framework imports, no `Date.now()`. Rules arrive as
 * data. The storefront runs it for live UX; the API re-runs the exact same code before a
 * build is priced, carted or ordered (CONFIGURATOR_ENGINE.md — "never trust the client").
 */

/** Float slack so `factor` multiplication (e.g. 650 * 0.8) can't create a phantom failure. */
const EPSILON = 1e-9;

// ─────────────────────────── selection helpers ───────────────────────────

/** Every part currently in a slot, single or multi, as a flat array. */
export function partsIn(sel: Selection, slot: SlotId | string): Part[] {
  const v = sel[slot];
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}

/** Returns a new selection with `part` placed in `slot` (appended, for multi slots). */
export function withPart(sel: Selection, slot: SlotId, part: Part): Selection {
  const def = SLOTS.find((s) => s.id === slot);
  if (def?.multi) {
    return { ...sel, [slot]: [...partsIn(sel, slot), part] };
  }
  return { ...sel, [slot]: part };
}

function num(v: AttributeValue | undefined): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Case- and whitespace-insensitive compare, so "am5" matches "AM5". */
function normStr(v: AttributeValue | number | string): string {
  return String(v).trim().toUpperCase();
}

// ─────────────────────────── rule evaluation ───────────────────────────

/**
 * Resolve the right-hand operand. `undefined` means "not evaluable yet" — the slot it
 * points at is empty, or the attribute is missing — and the rule is skipped, never failed.
 */
function resolveRight(operand: RuleOperand, sel: Selection): AttributeValue | undefined {
  if (isConstOperand(operand)) return operand.const;
  const parts = partsIn(sel, operand.slot);
  const first = parts[0];
  if (!first) return undefined;
  return first.attributes[operand.attr];
}

function satisfies(type: RuleType, left: AttributeValue, right: AttributeValue): boolean {
  switch (type) {
    case 'match':
      return normStr(left) === normStr(right);
    case 'includes': {
      const list = Array.isArray(right) ? right : [right];
      return list.some((x) => normStr(x) === normStr(left));
    }
    case 'gte': {
      const l = num(left);
      const r = num(right);
      if (l === undefined || r === undefined) return true;
      return l + EPSILON >= r;
    }
    case 'lte':
    case 'fits': {
      const l = num(left);
      const r = num(right);
      if (l === undefined || r === undefined) return true;
      return l <= r + EPSILON;
    }
    default:
      return true;
  }
}

function slotsTouched(rule: Rule, sel: Selection): SlotId[] {
  const out = new Set<SlotId>();
  if (rule.type === 'sum_lte') {
    for (const s of rule.sumSlots ?? [rule.left.slot]) {
      if (partsIn(sel, s).length > 0) out.add(s);
    }
  } else {
    out.add(rule.left.slot);
  }
  if (!isConstOperand(rule.right)) out.add(rule.right.slot);
  return [...out];
}

function toViolation(rule: Rule, sel: Selection): Violation {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    messageFr: rule.messageFr,
    slots: slotsTouched(rule, sel),
  };
}

function evaluateSumRule(rule: Rule, sel: Selection): Violation | null {
  const slots = rule.sumSlots ?? [rule.left.slot];
  const attr = rule.sumAttr ?? rule.left.attr;

  let sum = 0;
  let sawValue = false;
  for (const slot of slots) {
    for (const part of partsIn(sel, slot)) {
      const n = num(part.attributes[attr]);
      if (n !== undefined) {
        sum += n;
        sawValue = true;
      }
    }
  }
  if (!sawValue) return null;

  const right = resolveRight(rule.right, sel);
  if (right === undefined) return null;
  const limit = num(right);
  if (limit === undefined) return null;

  const total = sum + (rule.baseAllowance ?? 0);
  const threshold = limit * (rule.factor ?? 1);
  return total > threshold + EPSILON ? toViolation(rule, sel) : null;
}

/** Evaluate one rule against a selection. `null` = satisfied, or not evaluable yet. */
export function evaluateRule(rule: Rule, sel: Selection): Violation | null {
  if (!rule.isActive) return null;
  if (rule.type === 'sum_lte') return evaluateSumRule(rule, sel);

  const leftParts = partsIn(sel, rule.left.slot);
  if (leftParts.length === 0) return null;

  const right = resolveRight(rule.right, sel);
  if (right === undefined) return null;

  for (const part of leftParts) {
    const left = part.attributes[rule.left.attr];
    if (left === undefined || left === null || left === '') continue;
    if (!satisfies(rule.type, left, right)) return toViolation(rule, sel);
  }
  return null;
}

/** All rule violations for a selection, errors first, then in rule order. */
export function ruleViolations(sel: Selection, rules: Rule[]): Violation[] {
  const out: Violation[] = [];
  for (const rule of rules) {
    const v = evaluateRule(rule, sel);
    if (v) out.push(v);
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

// ───────────────────────── structural completeness ─────────────────────────

/**
 * Presence rules that the six data operators cannot express, because they are conditional
 * on *another* part's attribute rather than a comparison between two values:
 *   - a cooler is only optional when the CPU ships with one (`includes_cooler`),
 *   - a GPU is only optional when the CPU has integrated graphics.
 * They live in code (not the rules collection) because they are part of what a build *is*.
 */
function structuralViolations(sel: Selection): Violation[] {
  const out: Violation[] = [];
  const cpu = partsIn(sel, 'cpu')[0];
  if (!cpu) return out;

  if (partsIn(sel, 'cooler').length === 0 && cpu.attributes['includes_cooler'] !== true) {
    out.push({
      ruleId: 'cooler_required',
      severity: 'error',
      messageFr:
        'Ce processeur n’est pas livré avec un ventirad : ajoutez un système de refroidissement.',
      slots: ['cooler', 'cpu'],
    });
  }

  if (partsIn(sel, 'gpu').length === 0 && cpu.attributes['integrated_graphics'] !== true) {
    out.push({
      ruleId: 'gpu_required',
      severity: 'error',
      messageFr:
        'Ce processeur n’a pas de carte graphique intégrée : ajoutez une carte graphique pour avoir une sortie vidéo.',
      slots: ['gpu', 'cpu'],
    });
  }

  return out;
}

/** Required slots (per SLOTS) that are still empty. */
export function missingSlots(sel: Selection): SlotId[] {
  return SLOTS.filter((s) => s.required && partsIn(sel, s.id).length === 0).map((s) => s.id);
}

// ─────────────────────────── pricing & power ───────────────────────────

function allParts(sel: Selection): Part[] {
  return SLOTS.flatMap((s) => partsIn(sel, s.id));
}

/** Sum of the effective prices of every selected part, in centimes. */
export function buildSubtotal(sel: Selection): Centimes {
  return allParts(sel).reduce((sum, p) => sum + Math.round(p.price), 0);
}

/**
 * Estimated draw: CPU + GPU TDP plus a flat allowance for the board, drives and fans.
 * Deliberately conservative — it is what sizes the PSU.
 */
export function estimateWattage(sel: Selection): number {
  let watts = BASE_SYSTEM_WATTS;
  for (const slot of ['cpu', 'gpu'] as SlotId[]) {
    for (const part of partsIn(sel, slot)) {
      watts += num(part.attributes['tdp_watts']) ?? 0;
    }
  }
  return Math.round(watts);
}

/** Round up to a wattage a PSU is actually sold in. */
function roundUpTo50(w: number): number {
  return Math.ceil(w / 50) * 50;
}

/**
 * What we tell the customer to buy: the estimated draw plus 20% headroom, but never less
 * than the GPU maker's own recommendation.
 */
export function recommendPsuWattage(sel: Selection): number {
  const fromDraw = roundUpTo50(estimateWattage(sel) / PSU_HEADROOM_FACTOR);
  const gpu = partsIn(sel, 'gpu')[0];
  const fromGpu = gpu ? (num(gpu.attributes['recommended_psu_watts']) ?? 0) : 0;
  return Math.max(fromDraw, roundUpTo50(fromGpu));
}

// ─────────────────────────── public API ───────────────────────────

/**
 * Evaluate a whole build: compatibility, completeness, price and power.
 * `isValid` is true only when there is no `error` violation AND no required slot is empty.
 */
export function evaluateBuild(sel: Selection, rules: Rule[]): BuildEvaluation {
  const violations = [...ruleViolations(sel, rules), ...structuralViolations(sel)].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1,
  );
  const missing = missingSlots(sel);
  const subtotal = buildSubtotal(sel);
  const discountPct = CONFIGURATOR_DISCOUNT_PCT;

  return {
    isValid: violations.every((v) => v.severity !== 'error') && missing.length === 0,
    violations,
    missingSlots: missing,
    subtotal,
    discountPct,
    total: applyDiscountPct(subtotal, discountPct),
    estimatedWattage: estimateWattage(sel),
    recommendedPsuWattage: recommendPsuWattage(sel),
  };
}

/** Does this rule read or write the given slot? Used to evaluate only what matters. */
function ruleTouchesSlot(rule: Rule, slot: SlotId): boolean {
  if (rule.left.slot === slot) return true;
  if (!isConstOperand(rule.right) && rule.right.slot === slot) return true;
  return (rule.sumSlots ?? []).includes(slot);
}

/** The violations a candidate part would introduce if placed in `slot` right now. */
export function violationsForCandidate(
  slot: SlotId,
  candidate: Part,
  sel: Selection,
  rules: Rule[],
): Violation[] {
  const trial = withPart(sel, slot, candidate);
  const relevant = rules.filter((r) => r.isActive && ruleTouchesSlot(r, slot));
  const out: Violation[] = [];
  for (const rule of relevant) {
    const v = evaluateRule(rule, trial);
    if (v) out.push(v);
  }
  return out;
}

export interface CompatiblePartsOptions {
  /** Drop parts with no stock instead of returning them (UI may prefer to grey them out). */
  requireStock?: boolean;
}

/**
 * The parts still choosable for a slot given what is already selected — this is what makes
 * the builder feel intelligent. A candidate is kept when it introduces no `error`
 * violation. Warnings never exclude a part; it stays selectable with a caution note.
 */
export function compatiblePartsForSlot(
  slot: SlotId,
  candidates: Part[],
  sel: Selection,
  rules: Rule[],
  options: CompatiblePartsOptions = {},
): Part[] {
  return candidates.filter((candidate) => {
    if (options.requireStock && candidate.stock <= 0) return false;
    return violationsForCandidate(slot, candidate, sel, rules).every(
      (v) => v.severity !== 'error',
    );
  });
}
