import { describe, expect, it } from 'vitest';
import type { Part, Rule, Selection, SlotId } from '@rgi/types';
import { applyDiscountPct, formatMad } from '@rgi/types';
import {
  compatiblePartsForSlot,
  DEFAULT_RULES,
  estimateWattage,
  evaluateBuild,
  recommendPsuWattage,
} from '../src';
import * as f from './fixtures';

const rules = DEFAULT_RULES;

/** Ids of the `error` violations of a selection — the assertion most tests make. */
function errors(sel: Selection): string[] {
  return evaluateBuild(sel, rules)
    .violations.filter((v) => v.severity === 'error')
    .map((v) => v.ruleId);
}

function warnings(sel: Selection): string[] {
  return evaluateBuild(sel, rules)
    .violations.filter((v) => v.severity === 'warning')
    .map((v) => v.ruleId);
}

describe('a complete, sane build', () => {
  it('is valid with no violations at all', () => {
    const res = evaluateBuild(f.validAm5Build, rules);
    expect(res.violations).toEqual([]);
    expect(res.missingSlots).toEqual([]);
    expect(res.isValid).toBe(true);
  });
});

describe('each compatibility rule: one passing case, one failing case', () => {
  it('cpu_mobo_socket — an AM5 CPU refuses an LGA1700 board', () => {
    expect(errors({ ...f.validAm5Build, motherboard: f.moboAm5Atx })).not.toContain(
      'cpu_mobo_socket',
    );
    const sel = { ...f.validAm5Build, motherboard: f.moboLga1700Atx };
    expect(errors(sel)).toContain('cpu_mobo_socket');
  });

  it('cooler_socket — a cooler that only mounts on AM4 is rejected on AM5', () => {
    expect(errors(f.validAm5Build)).not.toContain('cooler_socket');
    const sel = { ...f.validAm5Build, cooler: f.coolerAm4Only };
    expect(errors(sel)).toContain('cooler_socket');
  });

  it('ram_type — DDR4 memory is rejected on a DDR5 board', () => {
    expect(errors(f.validAm5Build)).not.toContain('ram_type');
    const sel = { ...f.validAm5Build, ram: [f.ramDdr4_32] };
    expect(errors(sel)).toContain('ram_type');
  });

  it('ram_slots — 6 modules do not fit in 4 slots', () => {
    expect(errors({ ...f.validAm5Build, ram: [f.ramDdr5_32, f.ramDdr5_32] })).not.toContain(
      'ram_slots',
    );
    const sel = { ...f.validAm5Build, ram: [f.ramDdr5_32, f.ramDdr5_32, f.ramDdr5_32] };
    expect(errors(sel)).toContain('ram_slots');
  });

  it('ram_capacity — 256 Go exceeds a 192 Go board maximum', () => {
    expect(errors({ ...f.validAm5Build, ram: [f.ramDdr5_128] })).not.toContain('ram_capacity');
    const sel = { ...f.validAm5Build, ram: [f.ramDdr5_128, f.ramDdr5_128] };
    expect(errors(sel)).toContain('ram_capacity');
  });

  it('mobo_case_form — an ATX board does not go into an ITX case', () => {
    expect(errors(f.validAm5Build)).not.toContain('mobo_case_form');
    const sel = { ...f.validAm5Build, case: f.caseItx };
    expect(errors(sel)).toContain('mobo_case_form');
  });

  it('gpu_length — a 340 mm card does not fit a 330 mm case', () => {
    expect(errors({ ...f.validAm5Build, gpu: f.gpuRtx4080 })).not.toContain('gpu_length');
    const sel = { ...f.validAm5Build, case: f.caseItx, gpu: f.gpuRtx4080 };
    expect(errors(sel)).toContain('gpu_length');
  });

  it('cooler_height — a 165 mm tower does not fit under a 155 mm panel', () => {
    expect(errors({ ...f.validAm5Build, cooler: f.coolerTallAir })).not.toContain('cooler_height');
    const sel = { ...f.validAm5Build, case: f.caseItx, cooler: f.coolerTallAir };
    expect(errors(sel)).toContain('cooler_height');
  });

  it('psu_form — an ATX PSU does not fit an SFX-only case', () => {
    expect(errors(f.validAm5Build)).not.toContain('psu_form');
    const sel = { ...f.validAm5Build, case: f.caseItx };
    expect(errors(sel)).toContain('psu_form');
  });

  it('psu_wattage — a 650 W unit cannot feed a 5090 build', () => {
    expect(errors(f.validAm5Build)).not.toContain('psu_wattage');
    const sel = { ...f.validAm5Build, gpu: f.gpuRtx5090, psu: f.psu650Atx };
    expect(errors(sel)).toContain('psu_wattage');
  });

  it('psu_recommended — below the GPU maker recommendation is a WARNING, not an error', () => {
    const sel = { ...f.validAm5Build, gpu: f.gpuRtx4080, psu: f.psu850Atx };
    expect(warnings(sel)).not.toContain('psu_recommended');

    const weak = { ...f.validAm5Build, gpu: f.gpuRtx4080, psu: f.psu650Atx };
    const res = evaluateBuild(weak, rules);
    const v = res.violations.find((x) => x.ruleId === 'psu_recommended');
    expect(v?.severity).toBe('warning');
  });

  it('radiator_fit — a 360 radiator in a 240-only case warns but does not block', () => {
    expect(warnings({ ...f.validAm5Build, cooler: f.coolerAio360 })).not.toContain('radiator_fit');
    const sel = { ...f.validAm5Build, case: f.caseItx, cooler: f.coolerAio360, psu: f.psu750Sfx };
    expect(warnings(sel)).toContain('radiator_fit');
  });
});

/**
 * `radiator_fit` shipped as `includes` — set membership against a number — so it only
 * stayed silent when the two figures matched exactly. Against the live catalogue that
 * warned on most builds, valid ones included, and a warning that fires almost always is a
 * warning nobody reads. These are the four shapes the real data actually produces.
 */
describe('radiator_fit is a fit, not an exact match', () => {
  it('does not warn when the radiator is smaller than the case allows (360 in 367)', () => {
    const sel = { ...f.validAm5Build, case: f.caseRadiator367, cooler: f.coolerAio360 };
    expect(warnings(sel)).not.toContain('radiator_fit');
  });

  it('does not warn when radiator and case are exactly equal (360 in 360)', () => {
    const sel = { ...f.validAm5Build, case: f.caseAtx, cooler: f.coolerAio360 };
    expect(warnings(sel)).not.toContain('radiator_fit');
  });

  it('still warns when the radiator is genuinely too long (360 in 240)', () => {
    const sel = { ...f.validAm5Build, case: f.caseItx, cooler: f.coolerAio360, psu: f.psu750Sfx };
    expect(warnings(sel)).toContain('radiator_fit');
  });

  it('stays silent for an air cooler whose radiator_mm is really a fan size', () => {
    const sel = { ...f.validAm5Build, case: f.caseRadiator367, cooler: f.coolerAirWithFanSize };
    expect(warnings(sel)).not.toContain('radiator_fit');
  });

  it('stays silent for an air cooler with no radiator at all', () => {
    const sel = { ...f.validAm5Build, cooler: f.coolerTallAir, case: f.caseAtx };
    expect(warnings(sel)).not.toContain('radiator_fit');
  });

  it('carries the rule’s French message and the slots to highlight', () => {
    const sel = { ...f.validAm5Build, motherboard: f.moboLga1700Atx };
    const v = evaluateBuild(sel, rules).violations.find((x) => x.ruleId === 'cpu_mobo_socket');
    expect(v?.messageFr).toContain('socket');
    expect(v?.slots).toEqual(expect.arrayContaining<SlotId>(['cpu', 'motherboard']));
  });
});

describe('psu_wattage boundary around the 0.8 factor', () => {
  const mkPsu = (wattage: number): Part => ({
    id: `psu-${wattage}`,
    categoryType: 'psu',
    price: 100000,
    stock: 5,
    attributes: { wattage, form_factor: 'ATX', efficiency: '80+ Gold' },
  });
  const cpu100: Part = {
    id: 'cpu-100',
    categoryType: 'cpu',
    price: 200000,
    stock: 5,
    attributes: { socket: 'AM5', tdp_watts: 100, integrated_graphics: false, includes_cooler: false },
  };
  const gpu300: Part = {
    id: 'gpu-300',
    categoryType: 'gpu',
    price: 900000,
    stock: 5,
    attributes: {
      chipset: 'TEST',
      length_mm: 300,
      tdp_watts: 300,
      recommended_psu_watts: 0,
    },
  };
  // draw = 100 (cpu) + 300 (gpu) + 100 (base) = 500 W  →  needs wattage * 0.8 >= 500
  const base = { ...f.validAm5Build, cpu: cpu100, gpu: gpu300 };

  it('estimates the draw as CPU + GPU + the 100 W system allowance', () => {
    expect(estimateWattage(base)).toBe(500);
  });

  it('passes exactly at the limit (625 W × 0.8 = 500)', () => {
    expect(errors({ ...base, psu: mkPsu(625) })).not.toContain('psu_wattage');
  });

  it('fails one watt under the limit (624 W × 0.8 = 499.2)', () => {
    expect(errors({ ...base, psu: mkPsu(624) })).toContain('psu_wattage');
  });

  it('recommends a real, purchasable wattage above the draw', () => {
    expect(recommendPsuWattage(base)).toBe(650);
  });

  it('never recommends less than the GPU maker asks for', () => {
    const sel = { ...f.validAm5Build, cpu: f.cpuRyzen7600, gpu: f.gpuRtx4080 };
    // draw = 65 + 320 + 100 = 485 → 485/0.8 = 607 → 650, but the 4080 asks for 850
    expect(recommendPsuWattage(sel)).toBe(850);
  });
});

describe('the integrated-graphics path', () => {
  it('allows a build with no GPU when the CPU has integrated graphics', () => {
    const { gpu: _gpu, ...noGpu } = f.validAm5Build;
    const res = evaluateBuild(noGpu, rules);
    expect(res.isValid).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it('blocks a build with no GPU when the CPU has none', () => {
    const sel = {
      ...f.validAm5Build,
      case: f.caseAtx,
      motherboard: f.moboLga1700Atx,
      cpu: f.cpuIntel14600kf,
      gpu: undefined,
      psu: f.psu850Atx,
    };
    expect(errors(sel)).toContain('gpu_required');
  });

  it('excludes the missing GPU from the power estimate', () => {
    const { gpu: _gpu, ...noGpu } = f.validAm5Build;
    // 120 W CPU + 100 W base, no GPU
    expect(estimateWattage(noGpu)).toBe(220);
  });
});

describe('the stock-cooler path', () => {
  it('allows no cooler when the CPU ships with one', () => {
    const sel = { ...f.validAm5Build, cpu: f.cpuRyzen7600, cooler: undefined };
    expect(errors(sel)).not.toContain('cooler_required');
  });

  it('requires a cooler when the CPU ships without one', () => {
    const sel = { ...f.validAm5Build, cooler: undefined };
    expect(errors(sel)).toContain('cooler_required');
  });
});

describe('completeness', () => {
  it('an empty selection is invalid and lists every required slot', () => {
    const res = evaluateBuild({}, rules);
    expect(res.isValid).toBe(false);
    expect(res.missingSlots).toEqual(['case', 'motherboard', 'cpu', 'ram', 'storage', 'psu']);
  });

  it('a compatible but unfinished build is still not valid', () => {
    const sel = { case: f.caseAtx, motherboard: f.moboAm5Atx, cpu: f.cpuRyzen7600 };
    const res = evaluateBuild(sel, rules);
    expect(res.violations.filter((v) => v.severity === 'error')).toEqual([]);
    expect(res.isValid).toBe(false);
    expect(res.missingSlots).toContain('psu');
  });

  it('does not judge a rule whose other side is not chosen yet', () => {
    // A CPU alone can never violate the socket rule — there is no board to disagree with.
    expect(errors({ cpu: f.cpuIntel14600kf })).not.toContain('cpu_mobo_socket');
  });
});

describe('compatiblePartsForSlot — the live filtering that makes the builder feel smart', () => {
  const boards = [f.moboAm5Atx, f.moboLga1700Atx, f.moboAm4Ddr4Matx];

  it('offers every board when nothing is chosen', () => {
    expect(compatiblePartsForSlot('motherboard', boards, {}, rules)).toHaveLength(3);
  });

  it('narrows boards to the case form factor', () => {
    const got = compatiblePartsForSlot('motherboard', boards, { case: f.caseItx }, rules);
    expect(got).toEqual([]); // no ITX board in the fixture set
  });

  it('narrows boards to the chosen CPU socket', () => {
    const got = compatiblePartsForSlot('motherboard', boards, { cpu: f.cpuRyzen7800x3d }, rules);
    expect(got.map((b) => b.id)).toEqual([f.moboAm5Atx.id]);
  });

  it('narrows RAM to the board memory type', () => {
    const kits = [f.ramDdr5_32, f.ramDdr4_32];
    const got = compatiblePartsForSlot('ram', kits, { motherboard: f.moboAm5Atx }, rules);
    expect(got.map((r) => r.id)).toEqual([f.ramDdr5_32.id]);
  });

  it('narrows GPUs to what physically fits the case', () => {
    const gpus = [f.gpuRtx4060, f.gpuRtx4080, f.gpuRtx5090];
    expect(compatiblePartsForSlot('gpu', gpus, { case: f.caseAtx }, rules)).toHaveLength(3);
    expect(
      compatiblePartsForSlot('gpu', gpus, { case: f.caseItx }, rules).map((g) => g.id),
    ).toEqual([f.gpuRtx4060.id]);
  });

  it('keeps narrowing as more slots fill', () => {
    const kits = [f.ramDdr5_32, f.ramDdr5_16, f.ramDdr4_32];
    const partial: Selection = { motherboard: f.moboAm5Atx, ram: [f.ramDdr5_128] };
    // 128 Go + 32 Go = 160 Go fits under 192 Go, but 4 + 2 modules exceeds the 4 slots
    const got = compatiblePartsForSlot('ram', kits, partial, rules);
    expect(got.map((r) => r.id)).toEqual([]);
  });

  it('does not exclude a part that only raises a warning', () => {
    const psus = [f.psu650Atx, f.psu850Atx];
    const sel: Selection = { case: f.caseAtx, gpu: f.gpuRtx4080, cpu: f.cpuRyzen7600 };
    const got = compatiblePartsForSlot('psu', psus, sel, rules);
    // the 650 W is under the 4080's recommendation (warning) but has enough real headroom
    expect(got.map((p) => p.id)).toEqual([f.psu650Atx.id, f.psu850Atx.id]);
  });

  it('can drop out-of-stock parts when the caller asks', () => {
    const psus = [f.psu850Atx, f.psuOutOfStock];
    const sel: Selection = { case: f.caseAtx };
    expect(compatiblePartsForSlot('psu', psus, sel, rules)).toHaveLength(2);
    expect(
      compatiblePartsForSlot('psu', psus, sel, rules, { requireStock: true }).map((p) => p.id),
    ).toEqual([f.psu850Atx.id]);
  });

  it('ignores rules an admin has disabled', () => {
    const relaxed: Rule[] = rules.map((r) =>
      r.id === 'cpu_mobo_socket' ? { ...r, isActive: false } : r,
    );
    const got = compatiblePartsForSlot('motherboard', boards, { cpu: f.cpuRyzen7800x3d }, relaxed);
    expect(got.length).toBeGreaterThan(1);
  });
});

describe('editing an earlier slot invalidates a later pick instead of silently dropping it', () => {
  it('flags the now-oversized GPU when the case is swapped for a smaller one', () => {
    const big = { ...f.validAm5Build, gpu: f.gpuRtx4080, psu: f.psu850Atx };
    expect(evaluateBuild(big, rules).isValid).toBe(true);

    const swapped = { ...big, case: f.caseItx };
    const res = evaluateBuild(swapped, rules);
    expect(res.isValid).toBe(false);

    const ids = res.violations.map((v) => v.ruleId);
    expect(ids).toContain('gpu_length'); // 340 mm in a 330 mm case
    expect(ids).toContain('mobo_case_form'); // ATX board in an ITX case
    expect(ids).toContain('psu_form'); // ATX PSU in an SFX case

    // and it names the slots the UI must mark as needing a re-pick
    const gpuViolation = res.violations.find((v) => v.ruleId === 'gpu_length');
    expect(gpuViolation?.slots).toEqual(expect.arrayContaining<SlotId>(['gpu', 'case']));
  });
});

describe('price and discount arithmetic stays in integer centimes', () => {
  it('sums the parts of the reference build exactly', () => {
    const res = evaluateBuild(f.validAm5Build, rules);
    // 1090 + 2390 + 4590 + 690 + 1190 + 3290 + 890 + 890 = 15 020 MAD
    expect(res.subtotal).toBe(1_502_000);
    expect(res.discountPct).toBe(5);
    expect(res.total).toBe(1_426_900);
    expect(Number.isInteger(res.total)).toBe(true);
  });

  it('counts every part of a multi slot', () => {
    const sel = { ...f.validAm5Build, storage: [f.ssd1tb, f.ssd2tb] };
    expect(evaluateBuild(sel, rules).subtotal).toBe(1_502_000 + 169_000);
  });

  it('rounds the discount to a whole centime, never a float', () => {
    expect(applyDiscountPct(1_234_567, 5)).toBe(1_172_839);
    expect(Number.isInteger(applyDiscountPct(999, 5))).toBe(true);
  });

  it('formats totals the Moroccan French way', () => {
    expect(formatMad(1_426_900)).toBe('14 269,00 MAD');
    expect(formatMad(89_000)).toBe('890,00 MAD');
  });

  it('prices an empty build at zero', () => {
    const res = evaluateBuild({}, rules);
    expect(res.subtotal).toBe(0);
    expect(res.total).toBe(0);
  });
});
