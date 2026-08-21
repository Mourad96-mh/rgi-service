import type { Centimes } from './common';

/** MAD → centimes. Rounds to the nearest centime; never trust float arithmetic. */
export function toCentimes(mad: number): Centimes {
  return Math.round(mad * 100);
}

/** centimes → MAD as a float. Display only — never store or compute with the result. */
export function toMad(centimes: Centimes): number {
  return centimes / 100;
}

/**
 * Format centimes the Moroccan French way: `1 234,00 MAD`
 * (narrow-no-break space as thousands separator, comma as decimal separator).
 */
export function formatMad(centimes: Centimes): string {
  const sign = centimes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(centimes));
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return `${sign}${grouped},${String(cents).padStart(2, '0')} MAD`;
}

/** Apply a whole-percent discount to centimes, rounding to the nearest centime. */
export function applyDiscountPct(centimes: Centimes, pct: number): Centimes {
  return Math.round((centimes * (100 - pct)) / 100);
}
