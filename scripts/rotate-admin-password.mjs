/**
 * Rotate a staff account's password directly in MongoDB.
 *
 * The seed only ever *creates* the admin — it never touches an existing one — so once the
 * default password is out in the open (this repo is public), the only way to change it is
 * here or through the API.
 *
 *   node scripts/rotate-admin-password.mjs [email] [newPassword]
 *
 * With no arguments it rotates SEED_ADMIN_EMAIL to a freshly generated password and prints
 * it once. Reads MONGODB_URI from .env.
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env reader — no dependency, and it must not expand anything. */
function env() {
  const out = {};
  for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Ambiguity-free alphabet: no O/0, l/1/I. A demo password gets read aloud and retyped. */
function strongPassword(length = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^*-_=+';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const config = env();
const email = (process.argv[2] || config.SEED_ADMIN_EMAIL || 'admin@rgiservice.ma').toLowerCase();
const password = process.argv[3] || strongPassword();

if (!config.MONGODB_URI) throw new Error('MONGODB_URI missing from .env');

await mongoose.connect(config.MONGODB_URI);
const users = mongoose.connection.collection('users');

const user = await users.findOne({ email });
if (!user) {
  await mongoose.disconnect();
  throw new Error(`No user with email ${email}`);
}

const passwordHash = await bcrypt.hash(password, 12);
const result = await users.updateOne(
  { _id: user._id },
  {
    // Clearing the refresh hash kills any session minted with the old password.
    $set: { passwordHash, updatedAt: new Date() },
    $unset: { refreshTokenHash: '' },
  },
);

await mongoose.disconnect();

console.log(`✔ password rotated for ${email} (role: ${user.role})`);
console.log(`  modified: ${result.modifiedCount}`);
console.log(`\n  NEW PASSWORD: ${password}\n`);
console.log('  Store it in your password manager and set SEED_ADMIN_PASSWORD on Render.');
