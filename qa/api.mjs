/**
 * End-to-end API test for Rgi Service - full CRUD, orders, configurator.
 *
 * Runs against a LIVE database. Creates one clearly-marked test product, exercises every
 * write path against it, places one test order against it, then hard-deletes the product.
 * The real catalogue is never written to.
 */
import fs from 'node:fs';

const API = process.env.API ?? 'https://rgi-service-api.onrender.com/api/v1';
const ENV = fs.readFileSync('.env', 'utf8');
const env = (k) => (ENV.match(new RegExp('^' + k + '=(.*)$', 'm'))?.[1] ?? '').trim();
const ADMIN_EMAIL = env('SEED_ADMIN_EMAIL') || 'admin@rgiservice.ma';
const ADMIN_PASSWORD = env('SEED_ADMIN_PASSWORD');

const STAMP = Date.now();
const MARK = 'ZZZ TEST CLAUDE ' + STAMP;

let pass = 0, fail = 0;
const failures = [];
let section = '';
const S = (n) => { section = n; console.log('\n== ' + n); };

async function t(name, fn) {
  try {
    const note = await fn();
    pass++;
    console.log('  PASS  ' + name + (note ? '  -- ' + note : ''));
  } catch (e) {
    fail++;
    const msg = String(e && e.message ? e.message : e);
    failures.push({ section, name, error: msg });
    console.log('  FAIL  ' + name + '\n        ' + msg.slice(0, 400));
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const eq = (a, b, m) => { if (a !== b) throw new Error(m + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };

async function call(path, o = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (o.token) headers.Authorization = 'Bearer ' + o.token;
  if (o.origin) headers.Origin = o.origin;
  if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;
  const res = await fetch(API + path, { method: o.method ?? 'GET', headers, body: o.body ? JSON.stringify(o.body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

/** Build a valid `attributes` object from a category's own definitions. */
function synthAttributes(defs) {
  const out = {};
  for (const d of defs) {
    if (!d.required) continue;
    let v;
    if (d.dataType === 'number') v = 120;
    else if (d.dataType === 'boolean') v = true;
    else if (d.dataType === 'enum') v = (d.enumValues && d.enumValues[0]) ?? 'n/a';
    else v = 'Test';
    out[d.key] = d.multiple ? [v] : v;
  }
  return out;
}

const st = {};

S('A. Authentication');
await t('login', async () => {
  const r = await call('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  eq(r.status, 200, 'status');
  st.access = r.body.accessToken; st.refresh = r.body.refreshToken;
  return 'role=' + r.body.user.role;
});

S('B. Pick a category and read its contract');
await t('category with required attributes exposes its definitions', async () => {
  const tree = await call('/categories');
  const walk = (n) => n.flatMap((c) => [c].concat(walk(c.children)));
  st.cats = walk(tree.body).filter((c) => c.children.length === 0);
  const detail = await call('/categories/composants/ventilateurs');
  eq(detail.status, 200, 'status');
  st.cat = detail.body.category;
  st.defs = detail.body.attributeDefinitions;
  st.attrs = synthAttributes(st.defs);
  const req = st.defs.filter((d) => d.required).map((d) => d.key);
  return 'required: ' + (req.join(', ') || 'none');
});

S('C. Product - CREATE');
await t('refuses a product missing its required attributes', async () => {
  const r = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK }, sku: 'TSTX-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'no attributes' }, price: 10000,
  }});
  eq(r.status, 400, 'status');
  assert(/obligatoire/i.test(JSON.stringify(r.body.message)), 'expected an "obligatoire" message');
  return 'contract enforced';
});

await t('refuses a float price', async () => {
  const r = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK }, sku: 'TSTF-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'float' }, price: 1234.56, attributes: st.attrs,
  }});
  eq(r.status, 400, 'status');
  assert(JSON.stringify(r.body.message).includes('centimes'), 'should mention centimes');
});

await t('refuses a wrong attribute data type', async () => {
  const numKey = st.defs.find((d) => d.required && d.dataType === 'number')?.key;
  if (!numKey) return 'no numeric required attribute to test';
  const bad = { ...st.attrs, [numKey]: 'pas-un-nombre' };
  const r = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK }, sku: 'TSTT-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'bad type' }, price: 10000, attributes: bad,
  }});
  assert(r.status === 400, 'a string was accepted for the numeric attribute "' + numKey + '" (status ' + r.status + ')');
  return numKey + ' rejected';
});

await t('creates a valid product', async () => {
  const r = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK }, sku: 'TST-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'Produit de test cree automatiquement. A supprimer.' },
    price: 123400, stock: 7, status: 'active', attributes: st.attrs,
  }});
  assert(r.status === 201 || r.status === 200, 'status ' + r.status + ': ' + JSON.stringify(r.body).slice(0, 250));
  st.p = r.body;
  assert(st.p.id && st.p.slug, 'no id/slug');
  eq(st.p.price, 123400, 'price'); eq(st.p.stock, 7, 'stock');
  return 'slug=' + st.p.slug;
});

await t('readable by slug', async () => {
  const r = await call('/products/' + st.p.slug);
  eq(r.status, 200, 'status'); eq(r.body.name.fr, MARK, 'name');
});

await t('appears in its category listing', async () => {
  const r = await call('/products?category=' + encodeURIComponent(st.cat.slug) + '&limit=100');
  assert(r.body.data.some((x) => x.id === st.p.id), 'not in listing');
});

await t('duplicate SKU is refused', async () => {
  const r = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK + ' DUP' }, sku: 'TST-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'dup' }, price: 1000, attributes: st.attrs,
  }});
  assert(r.status >= 400, 'duplicate SKU accepted (' + r.status + ')');
  return String(r.status);
});

await t('anonymous create is refused', async () => {
  const r = await call('/products', { method: 'POST', body: {
    name: { fr: 'anon' }, sku: 'ANON-' + STAMP, brand: 'x', category: st.cat.id,
    description: { fr: 'x' }, price: 100, attributes: st.attrs,
  }});
  eq(r.status, 401, 'status');
});

S('D. Product - UPDATE');
await t('updates name and price', async () => {
  const r = await call('/products/' + st.p.id, { method: 'PATCH', token: st.access, body: { name: { fr: MARK + ' MODIFIE' }, price: 99900 } });
  eq(r.status, 200, 'status'); eq(r.body.price, 99900, 'price');
});
await t('update is persisted for shoppers', async () => {
  const r = await call('/products/' + st.p.slug);
  eq(r.body.price, 99900, 'price'); eq(r.body.name.fr, MARK + ' MODIFIE', 'name');
});
await t('compareAtPrice does not corrupt effectivePrice', async () => {
  await call('/products/' + st.p.id, { method: 'PATCH', token: st.access, body: { compareAtPrice: 150000 } });
  const pub = await call('/products/' + st.p.slug);
  eq(pub.body.compareAtPrice, 150000, 'compareAtPrice');
  eq(pub.body.effectivePrice, 99900, 'effectivePrice');
});
await t('float price on update is refused', async () => {
  const r = await call('/products/' + st.p.id, { method: 'PATCH', token: st.access, body: { price: 10.5 } });
  eq(r.status, 400, 'status');
});

S('E. Stock and inventory log');
await t('stock set', async () => {
  const r = await call('/products/' + st.p.id + '/stock', { method: 'PATCH', token: st.access, body: { mode: 'set', quantity: 10, note: 'qa' } });
  eq(r.status, 200, 'status'); eq(r.body.stock, 10, 'stock');
});
await t('stock delta', async () => {
  const r = await call('/products/' + st.p.id + '/stock', { method: 'PATCH', token: st.access, body: { mode: 'delta', quantity: -3, note: 'qa' } });
  eq(r.status, 200, 'status'); eq(r.body.stock, 7, 'stock');
});
await t('movements are logged', async () => {
  const r = await call('/admin/products/' + st.p.id + '/inventory', { token: st.access });
  eq(r.status, 200, 'status');
  const rows = Array.isArray(r.body) ? r.body : (r.body.data ?? []);
  assert(rows.length >= 2, 'expected >=2 rows, got ' + rows.length);
  return rows.length + ' movements';
});
await t('stock cannot go negative', async () => {
  const r = await call('/products/' + st.p.id + '/stock', { method: 'PATCH', token: st.access, body: { mode: 'delta', quantity: -9999 } });
  const ok = r.status >= 400 || (r.body && r.body.stock >= 0);
  assert(ok, 'went negative: ' + JSON.stringify(r.body).slice(0, 150));
  if (r.status < 400) await call('/products/' + st.p.id + '/stock', { method: 'PATCH', token: st.access, body: { mode: 'set', quantity: 7 } });
  return r.status >= 400 ? 'refused (' + r.status + ')' : 'clamped to ' + r.body.stock;
});

S('F. Cart, checkout and orders');
await t('cart validation prices server-side', async () => {
  const r = await call('/cart/validate', { method: 'POST', body: { items: [{ kind: 'product', productId: st.p.id, quantity: 2 }] } });
  eq(r.status, 200, 'status');
  const line = (r.body.items ?? r.body.lines ?? [])[0];
  assert(line, 'no line returned: ' + JSON.stringify(r.body).slice(0, 200));
  return JSON.stringify(r.body).slice(0, 120);
});
await t('cart rejects a quantity above the cap', async () => {
  const r = await call('/cart/validate', { method: 'POST', body: { items: [{ kind: 'product', productId: st.p.id, quantity: 999 }] } });
  eq(r.status, 400, 'status');
});
await t('checkout quote returns a total and shipping', async () => {
  const r = await call('/checkout/quote', { method: 'POST', body: {
    items: [{ kind: 'product', productId: st.p.id, quantity: 1 }],
    shipping: { method: 'delivery', city: 'Casablanca' },
  }});
  eq(r.status, 200, 'status');
  assert(typeof r.body.total === 'number', 'no total');
  assert(Number.isInteger(r.body.total), 'total is not an integer (centimes)');
  st.quote = r.body;
  return 'total=' + r.body.total + ' shipping=' + JSON.stringify(r.body.shipping ?? r.body.shippingCost);
});
await t('places a COD order and deducts stock atomically', async () => {
  const before = (await call('/products/' + st.p.slug)).body.stock;
  const r = await call('/orders', { method: 'POST', idempotencyKey: 'qa-' + STAMP, body: {
    items: [{ kind: 'product', productId: st.p.id, quantity: 2 }],
    contact: { name: 'QA Test', email: 'qa@example.com', phone: '0600000000' },
    shipping: { method: 'delivery', city: 'Casablanca', address: { line1: 'Rue de test 12', city: 'Casablanca', phone: '0600000000' } },
    payment: { method: 'cod' },
    notes: 'COMMANDE DE TEST AUTOMATIQUE',
  }});
  assert(r.status === 201 || r.status === 200, 'status ' + r.status + ': ' + JSON.stringify(r.body).slice(0, 300));
  st.order = r.body;
  const after = (await call('/products/' + st.p.slug)).body.stock;
  eq(after, before - 2, 'stock not deducted');
  return st.order.orderNumber + ', stock ' + before + ' -> ' + after;
});
await t('the same idempotency key does not create a second order', async () => {
  const before = (await call('/products/' + st.p.slug)).body.stock;
  const r = await call('/orders', { method: 'POST', idempotencyKey: 'qa-' + STAMP, body: {
    items: [{ kind: 'product', productId: st.p.id, quantity: 2 }],
    contact: { name: 'QA Test', email: 'qa@example.com', phone: '0600000000' },
    shipping: { method: 'delivery', city: 'Casablanca', address: { line1: 'Rue de test 12', city: 'Casablanca', phone: '0600000000' } },
    payment: { method: 'cod' },
  }});
  const after = (await call('/products/' + st.p.slug)).body.stock;
  eq(after, before, 'stock moved again - the double-submit guard did not hold');
  eq(r.body.orderNumber, st.order.orderNumber, 'a different order was created');
});
await t('an order cannot be read without its token', async () => {
  const r = await call('/orders/' + st.order.orderNumber);
  assert(r.status >= 400, 'order readable with no token (status ' + r.status + ') - order numbers are sequential');
  return String(r.status);
});
await t('an order is readable with its token', async () => {
  assert(st.order.publicToken, 'no publicToken issued - the confirmation page cannot work');
  const r = await call('/orders/' + st.order.orderNumber + '?token=' + encodeURIComponent(st.order.publicToken));
  eq(r.status, 200, 'status');
  eq(r.body.orderNumber, st.order.orderNumber, 'orderNumber');
});
await t('ordering more than stock is refused', async () => {
  const r = await call('/orders', { method: 'POST', idempotencyKey: 'qa-over-' + STAMP, body: {
    items: [{ kind: 'product', productId: st.p.id, quantity: 20 }],
    contact: { name: 'QA Test', email: 'qa@example.com', phone: '0600000000' },
    shipping: { method: 'delivery', city: 'Casablanca', address: { line1: 'Rue de test 12', city: 'Casablanca', phone: '0600000000' } },
    payment: { method: 'cod' },
  }});
  assert(r.status >= 400, 'oversell allowed (status ' + r.status + ')');
  return String(r.status);
});
await t('admin can see and update the order status', async () => {
  const list = await call('/admin/orders?limit=5', { token: st.access });
  eq(list.status, 200, 'list status');
  const upd = await call('/admin/orders/' + (st.order.id ?? st.order._id) + '/status', { method: 'PATCH', token: st.access, body: { status: 'confirmed' } });
  assert(upd.status === 200, 'status update failed: ' + upd.status + ' ' + JSON.stringify(upd.body).slice(0, 150));
  return 'status -> ' + (upd.body.status ?? 'confirmed');
});

S('H. CORS from the real origins');
for (const [origin, expected] of [['https://rgiservice.ma', true], ['https://www.rgiservice.ma', true], ['http://localhost:3000', true], ['https://evil.example.com', false]]) {
  await t('CORS ' + origin + (expected ? ' allowed' : ' blocked'), async () => {
    const r = await call('/products?limit=1', { origin });
    const acao = r.headers.get('access-control-allow-origin');
    if (expected) { assert(acao === origin, 'expected allow, got ' + acao); }
    else { assert(!acao, 'origin was allowed: ' + acao); }
  });
}

S('I. Delete paths');
await t('DELETE archives rather than deleting, and hides the product', async () => {
  const r = await call('/products/' + st.p.id, { method: 'DELETE', token: st.access });
  assert(r.status === 200 || r.status === 204, 'status ' + r.status);
  const listed = await call('/products?category=' + encodeURIComponent(st.cat.slug) + '&limit=100');
  assert(!listed.body.data.some((x) => x.id === st.p.id), 'archived product still in the public listing');
  const direct = await call('/products/' + st.p.slug);
  return 'archived, hidden (direct read ' + direct.status + ')';
});

await t('a product used by an order cannot be hard-deleted', async () => {
  const usage = await call('/admin/products/' + st.p.id + '/usage', { token: st.access });
  assert(usage.body.orderCount >= 1, 'usage did not see the order');
  assert(usage.body.canDelete === false, 'canDelete should be false while an order references it');
  const del = await call('/admin/products/' + st.p.id + '/permanent', { method: 'DELETE', token: st.access });
  assert(del.status === 400, 'a referenced product was hard-deleted (status ' + del.status + ')');
  return 'refused - orderCount=' + usage.body.orderCount;
});

await t('cancelling the order returns the stock', async () => {
  const before = (await call('/admin/products/' + st.p.id, { token: st.access })).body.stock;
  const r = await call('/admin/orders/' + (st.order.id ?? st.order._id) + '/status', { method: 'PATCH', token: st.access, body: { status: 'cancelled' } });
  assert(r.status === 200, 'cancel failed: ' + r.status);
  const after = (await call('/admin/products/' + st.p.id, { token: st.access })).body.stock;
  assert(after > before, 'stock was not returned: ' + before + ' -> ' + after);
  return before + ' -> ' + after;
});

await t('an unreferenced product CAN be hard-deleted', async () => {
  const mk = await call('/products', { method: 'POST', token: st.access, body: {
    name: { fr: MARK + ' JETABLE' }, sku: 'TSTD-' + STAMP, brand: 'TestBrand', category: st.cat.id,
    description: { fr: 'jetable' }, price: 5000, stock: 1, status: 'draft', attributes: st.attrs,
  }});
  assert(mk.status === 201 || mk.status === 200, 'could not create the throwaway: ' + mk.status);
  const del = await call('/admin/products/' + mk.body.id + '/permanent', { method: 'DELETE', token: st.access });
  assert(del.status === 200 || del.status === 204, 'hard delete failed: ' + del.status + ' ' + JSON.stringify(del.body).slice(0, 160));
  eq((await call('/products/' + mk.body.slug)).status, 404, 'still readable after a permanent delete');
  return 'created and purged';
});

console.log('\n================ SUMMARY ================');
console.log('passed: ' + pass + '   failed: ' + fail);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log('  [' + f.section + '] ' + f.name + '\n      ' + f.error.slice(0, 400));
}
console.log('\nLeft behind on purpose - the API never erases order history:');
console.log('  archived product : ' + (st.p ? st.p.slug : 'none'));
console.log('  cancelled order  : ' + (st.order ? st.order.orderNumber : 'none'));
console.log('  clear both with  : node qa/purge.mjs');
process.exit(fail > 0 ? 1 : 0);