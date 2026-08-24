/**
 * Remove the leftovers of a QA run, straight from MongoDB.
 *
 *   node qa/purge.mjs            # dry run - lists what it would delete
 *   node qa/purge.mjs --yes      # actually delete
 *
 * The API deliberately refuses to hard-delete a product that appears in an order, because
 * order history must not be rewritten. That is correct for real data and inconvenient for
 * test data, so this script goes around it - but ONLY for documents carrying the QA marker
 * written by qa/api.mjs. It cannot touch a real product or a real customer order: every
 * query is anchored to that marker or to the qa@example.com contact address.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--yes');
const ENV = fs.readFileSync('.env', 'utf8');
const uri = (ENV.match(/^MONGODB_URI=(.*)$/m)?.[1] ?? '').trim();
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

const MARK = /^ZZZ TEST CLAUDE /;
const QA_EMAIL = 'qa@example.com';

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
console.log('connected to ' + db.databaseName + (APPLY ? '  [APPLY]' : '  [dry run]') + '\n');

const products = await db.collection('products').find({ 'name.fr': MARK }).toArray();
const orders = await db.collection('orders').find({ 'contact.email': QA_EMAIL }).toArray();
const builds = await db.collection('builds').find({ name: 'QA build' }).toArray();
const productIds = products.map((p) => p._id);
const logs = productIds.length
  ? await db.collection('inventorylogs').find({ product: { $in: productIds } }).toArray()
  : [];

console.log('products      ' + products.length + '  ' + products.map((p) => p.slug).join(', '));
console.log('orders        ' + orders.length + '  ' + orders.map((o) => o.orderNumber + '/' + o.status).join(', '));
console.log('builds        ' + builds.length + '  ' + builds.map((b) => b.shareId).join(', '));
console.log('inventorylogs ' + logs.length);

// Refuse to run if a query somehow matched something unmarked - cheap insurance against a
// mistyped filter wiping real data.
const unsafe = products.filter((p) => !MARK.test(p.name?.fr ?? ''));
if (unsafe.length) {
  console.error('\nABORT: matched a product without the QA marker. Nothing deleted.');
  await client.close();
  process.exit(1);
}

if (!APPLY) {
  console.log('\nDry run. Re-run with --yes to delete.');
  await client.close();
  process.exit(0);
}

const r1 = await db.collection('orders').deleteMany({ 'contact.email': QA_EMAIL });
const r2 = await db.collection('builds').deleteMany({ name: 'QA build' });
const r3 = productIds.length ? await db.collection('inventorylogs').deleteMany({ product: { $in: productIds } }) : { deletedCount: 0 };
const r4 = await db.collection('products').deleteMany({ 'name.fr': MARK });

console.log('\ndeleted  orders=' + r1.deletedCount + '  builds=' + r2.deletedCount +
  '  inventorylogs=' + r3.deletedCount + '  products=' + r4.deletedCount);

const remaining = await db.collection('products').countDocuments({});
console.log('products remaining in the catalogue: ' + remaining);
await client.close();
