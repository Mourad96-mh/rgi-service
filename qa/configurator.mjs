/** Configurator deep test - the compatibility engine is the highest-risk code here. */
const API = process.env.API ?? 'https://rgi-service-api.onrender.com/api/v1';

let pass = 0, fail = 0;
const failures = [];
async function t(name, fn) {
  try { const n = await fn(); pass++; console.log('  PASS  ' + name + (n ? '  -- ' + n : '')); }
  catch (e) { fail++; const m = String(e.message ?? e); failures.push(name + ': ' + m); console.log('  FAIL  ' + name + '\n        ' + m.slice(0, 400)); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

async function call(path, o = {}) {
  const res = await fetch(API + path, {
    method: o.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const parts = async (slot, selection = {}) =>
  (await call('/configurator/parts?slot=' + slot + '&selection=' + encodeURIComponent(JSON.stringify(selection)))).body;
const validate = async (selection) => (await call('/configurator/validate', { method: 'POST', body: { selection } })).body;

console.log('== Configurator');

const st = {};

await t('an empty build is invalid and names every missing slot', async () => {
  const v = await validate({});
  assert(v.isValid === false, 'empty build reported valid');
  assert(Array.isArray(v.missingSlots) && v.missingSlots.length >= 6, 'missingSlots not reported');
  st.required = v.missingSlots;
  return v.missingSlots.join(', ');
});

await t('picking a case narrows the compatible motherboards', async () => {
  const all = await parts('motherboard', {});
  const cases = await parts('case', {});
  assert(cases.parts.length > 0, 'no cases');
  st.case = cases.parts[0];
  const narrowed = await parts('motherboard', { case: st.case.id });
  assert(narrowed.parts.length <= all.parts.length, 'selection widened the list');
  return st.case.name.fr.slice(0, 32) + ': ' + all.parts.length + ' -> ' + narrowed.parts.length +
    ' (' + (narrowed.incompatibleCount ?? 0) + ' filtered out)';
});

await t('CPU list respects the chosen motherboard socket', async () => {
  const mb = (await parts('motherboard', { case: st.case.id })).parts[0];
  assert(mb, 'no motherboard for this case');
  st.mb = mb;
  const all = await parts('cpu', {});
  const narrowed = await parts('cpu', { case: st.case.id, motherboard: mb.id });
  st.cpu = narrowed.parts[0];
  assert(st.cpu, 'no compatible CPU');
  return 'all ' + all.parts.length + ' -> compatible ' + narrowed.parts.length;
});

await t('a deliberately mismatched CPU is reported as a violation', async () => {
  const all = (await parts('cpu', {})).parts;
  const compatible = new Set((await parts('cpu', { case: st.case.id, motherboard: st.mb.id })).parts.map((p) => p.id));
  const bad = all.find((p) => !compatible.has(p.id));
  if (!bad) return 'SKIPPED - every CPU fits this motherboard, no mismatch available';
  const v = await validate({ case: st.case.id, motherboard: st.mb.id, cpu: bad.id });
  assert(v.isValid === false, 'an incompatible CPU produced a valid build');
  assert(Array.isArray(v.violations) && v.violations.length > 0, 'no violation reported for the mismatch');
  return bad.name.fr.slice(0, 30) + ' -> ' + JSON.stringify(v.violations[0]).slice(0, 150);
});

await t('a full compatible build validates and prices with the discount', async () => {
  const sel = { case: st.case.id, motherboard: st.mb.id, cpu: st.cpu.id };
  for (const slot of ['ram', 'storage', 'psu']) {
    const p = (await parts(slot, sel)).parts[0];
    assert(p, 'no compatible ' + slot);
    sel[slot] = p.id;
  }
  const v = await validate(sel);
  st.selection = sel;
  assert(v.isValid === true, 'complete build invalid: ' + JSON.stringify(v.violations ?? v.missingSlots).slice(0, 250));
  assert(Number.isInteger(v.subtotal) && Number.isInteger(v.total), 'prices are not integers');
  assert(v.total < v.subtotal, 'the configurator discount was not applied');
  const expected = Math.round(v.subtotal * (1 - v.discountPct / 100));
  assert(Math.abs(v.total - expected) <= 1, 'discount maths off: total=' + v.total + ' expected~' + expected);
  return v.subtotal + ' -> ' + v.total + ' (-' + v.discountPct + '%), ' + v.estimatedWattage + 'W, PSU>=' + v.recommendedPsuWattage + 'W';
});

await t('an underpowered PSU is caught', async () => {
  const psus = (await parts('psu', st.selection)).parts;
  const all = (await parts('psu', {})).parts;
  const rejected = all.filter((p) => !psus.some((q) => q.id === p.id));
  if (!rejected.length) return 'SKIPPED - every PSU in the catalogue powers this build';
  const v = await validate({ ...st.selection, psu: rejected[0].id });
  assert(v.isValid === false, 'an underpowered PSU produced a valid build');
  return rejected.length + ' PSU(s) correctly excluded';
});

await t('a saved build round-trips through its share id', async () => {
  const r = await call('/configurator/builds', { method: 'POST', body: { selection: st.selection, name: 'QA build' } });
  assert(r.status === 201 || r.status === 200, 'save failed: ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  const shareId = r.body.shareId;
  assert(shareId, 'no shareId returned');
  const back = await call('/configurator/builds/' + shareId);
  assert(back.status === 200, 'fetch failed: ' + back.status);
  assert(back.body.items.length === Object.keys(st.selection).length, 'item count changed on round-trip');
  return shareId + ' -> ' + back.body.items.length + ' parts, total ' + back.body.total;
});

await t('an unknown share id returns 404', async () => {
  const r = await call('/configurator/builds/does-not-exist-at-all');
  assert(r.status === 404, 'status ' + r.status);
});

console.log('\npassed: ' + pass + '   failed: ' + fail);
if (failures.length) console.log(failures.join('\n'));
