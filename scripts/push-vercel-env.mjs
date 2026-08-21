/**
 * Push every variable in an env file to a Vercel project in ONE API call.
 *
 *   VERCEL_TOKEN=xxx node scripts/push-vercel-env.mjs [envFile]
 *
 * The CLI needs three process spawns per variable per environment, which is ~40 npx
 * invocations for this project and takes minutes. The REST API accepts the whole set as
 * a single array with `upsert=true`, so a re-run updates rather than erroring.
 *
 * Reads projectId / orgId from .vercel/project.json (written by `vercel link`).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error('Set VERCEL_TOKEN');

const { projectId, orgId } = JSON.parse(
  readFileSync(`${ROOT}/.vercel/project.json`, 'utf8'),
);

const envFile = process.argv[2] ?? `${ROOT}/vercel-api-env.txt`;
const vars = [];
for (const raw of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!key || !value) continue;
  vars.push({
    key,
    value,
    // All three targets: a preview deployment should behave like production.
    target: ['production', 'preview', 'development'],
    // `encrypted` keeps the value readable in the dashboard; `sensitive` would hide it
    // from you too, which makes later debugging harder.
    type: 'encrypted',
  });
}

console.log(`pushing ${vars.length} variables…`);

const res = await fetch(
  `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true&teamId=${orgId}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vars),
  },
);

const body = await res.json();
if (!res.ok) {
  console.error('FAILED', res.status, JSON.stringify(body).slice(0, 600));
  process.exit(1);
}

const created = body.created ?? [];
const failed = body.failed ?? [];
console.log(`✔ ${Array.isArray(created) ? created.length : 0} written`);
for (const f of failed) {
  console.log(`  ! ${f.error?.key ?? '?'}: ${f.error?.message ?? 'unknown'}`);
}
