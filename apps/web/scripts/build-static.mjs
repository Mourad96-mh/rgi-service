/**
 * Builds the storefront **and the admin dashboard** as plain files for Hostinger shared
 * hosting.
 *
 *   npm run build:static --workspace=@rgi/web
 *
 * This script used to do considerably more. Three parts of the app could not exist in a
 * static export and Next refused to build while they were present, so it moved
 * `src/app/admin`, `src/app/api`, `src/middleware.ts`, `src/components/admin` and
 * `src/lib/admin` out of the tree, built, and put them back — including on Ctrl-C, because
 * leaving a developer's working tree gutted would have been worse than a failed build.
 *
 * None of that is needed now. The dashboard was rewritten to run entirely in the browser
 * against the NestJS API (`src/lib/admin/session.ts`): the route handlers and the
 * middleware are gone from the repo, and every admin page prerenders to an empty shell
 * that fetches once it is on screen. So the admin exports like any other route and ships
 * in the same upload as the shop — which is the whole point, since staff had no way to
 * reach it otherwise.
 *
 * What remains is the env check and the `.htaccess` assertion, both of which earn their
 * keep, plus setting BUILD_TARGET so `next.config.mjs` switches to `output: 'export'`.
 */
import { existsSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!siteUrl || !apiUrl) {
  console.error(
    '\n  NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_URL must both be set.\n' +
      '  They are inlined into the HTML at build time; a wrong value here means wrong\n' +
      '  canonical URLs on every page, a storefront that cannot reach its API — and now\n' +
      '  an admin dashboard that cannot either, since it calls the same API from the\n' +
      "  staff member's own browser.\n",
  );
  process.exit(1);
}

console.log(`\n  Building static site + admin`);
console.log(`    site : ${siteUrl}`);
console.log(`    api  : ${apiUrl}\n`);

const result = spawnSync('npx', ['next', 'build'], {
  cwd: webRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BUILD_TARGET: 'static' },
});

if (result.status !== 0) process.exit(result.status ?? 1);

// `public/.htaccess` is copied by Next like any other public asset, but a dotfile is easy
// to lose in an FTP client that hides them — assert it rather than discover it in prod.
const htaccess = join(webRoot, 'out', '.htaccess');
if (!existsSync(htaccess)) {
  cpSync(join(webRoot, 'public', '.htaccess'), htaccess);
}

// The dashboard is the reason this build exists in its current form; if the export ever
// silently drops it again, that must stop the build rather than reach the upload.
const adminIndex = join(webRoot, 'out', 'admin', 'index.html');
if (!existsSync(adminIndex)) {
  console.error('\n  The admin dashboard is missing from out/. Expected out/admin/index.html.\n');
  process.exit(1);
}

console.log('\n  Done → apps/web/out\n');
console.log('  Upload the CONTENTS of that folder (including the hidden .htaccess)');
console.log('  into public_html on Hostinger. See DEPLOY_HOSTINGER.md.\n');
