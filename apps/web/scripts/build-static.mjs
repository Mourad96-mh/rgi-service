/**
 * Builds the storefront as plain files for Hostinger shared hosting.
 *
 *   npm run build:static --workspace=@rgi/web
 *
 * Why a script and not just `next build`: three parts of this app *cannot* exist in a
 * static export, and Next refuses to build while they are present.
 *
 *   src/app/admin      — staff dashboard. Its pages take unknown ids (`/produits/[id]`)
 *                        and read a session cookie, so there is nothing to pre-render.
 *   src/app/api        — the routes that set the httpOnly admin cookie and sign Cloudinary
 *                        uploads. A static host runs no server, so they cannot exist.
 *   src/middleware.ts  — the `/admin/*` auth gate. Middleware needs a server.
 *   src/components/admin, src/lib/admin
 *                      — used only by the two above, and they import the server actions
 *                        that live inside src/app/admin, so leaving them behind breaks the
 *                        webpack resolve even though no storefront page imports them.
 *
 * They all belong to the admin dashboard, which is not part of what Hostinger serves — it
 * runs from a machine that has a Node server (today, the developer's, via `next dev`).
 * This script moves them aside, builds, and always puts them back — including on failure
 * or Ctrl-C, because leaving a developer's working tree gutted would be far worse than a
 * failed build.
 */
import { existsSync, mkdirSync, renameSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Where hidden files go while the build runs.
 *
 * It has to be OUTSIDE `src/`: renaming `src/app/admin` to `src/app/admin.hidden` leaves it
 * inside the app directory, where Next happily treats it as a route named `admin.hidden`
 * and compiles it anyway — with all its imports now dangling.
 */
const STASH = join(webRoot, '.static-build-stash');

/** Admin/server-only paths, relative to apps/web. Order matters only for readability. */
const serverOnly = [
  'src/app/admin',
  'src/app/api',
  'src/middleware.ts',
  'src/components/admin',
  'src/lib/admin',
];

const moved = [];

/**
 * Rename, retrying on EPERM.
 *
 * Windows refuses to rename a directory while any process holds a handle on it, and this
 * repo lives inside OneDrive. A sync pass or an antivirus scan clears in well under a
 * second, so those are worth retrying. A running `next dev` does not clear at all - its
 * watcher sits on src/app for as long as it lives - which is why hide() gives up with an
 * explanation rather than retrying forever.
 *
 * restore() retries far harder than hide(): a failed hide is an inconvenience, a failed
 * restore leaves the developer's source tree missing its admin directory.
 *
 * The sleep is synchronous on purpose: restore() also runs from a 'exit' handler, where
 * nothing asynchronous is allowed to finish.
 */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function renameWithRetry(from, to, attempts = 12) {
  for (let i = 1; ; i++) {
    try {
      renameSync(from, to);
      return;
    } catch (error) {
      if (error.code !== 'EPERM' && error.code !== 'EBUSY' && error.code !== 'EACCES') throw error;
      if (i >= attempts) throw error;
      sleepSync(Math.min(100 * i, 800));
    }
  }
}

function hide() {
  rmSync(STASH, { recursive: true, force: true });
  mkdirSync(STASH, { recursive: true });
  for (const rel of serverOnly) {
    const from = join(webRoot, rel);
    if (!existsSync(from)) continue;
    const to = join(STASH, rel.replaceAll('/', '__'));
    renameWithRetry(from, to);
    moved.push([from, to]);
  }
}

function restore() {
  const stuck = [];
  while (moved.length) {
    const [from, to] = moved.pop();
    if (!existsSync(to)) continue;
    try {
      rmSync(from, { recursive: true, force: true });
      renameWithRetry(to, from, 30);
    } catch {
      stuck.push([to, from]);
    }
  }
  if (stuck.length) {
    // Never fail silently here: the tree is mid-move and the developer must know exactly
    // what to put back by hand.
    console.error('');
    console.error('  COULD NOT RESTORE these directories. Move them back manually:');
    for (const [to, from] of stuck) console.error('    ' + to + '  ->  ' + from);
    return;
  }
  rmSync(STASH, { recursive: true, force: true });
}

// Restore on any exit path, including SIGINT — never leave the tree half-moved.
process.on('exit', restore);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restore();
    process.exit(1);
  });
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!siteUrl || !apiUrl) {
  console.error(
    '\n  NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_URL must both be set.\n' +
      '  They are inlined into the HTML at build time; a wrong value here means wrong\n' +
      '  canonical URLs on every page, or a storefront that cannot reach its API.\n',
  );
  process.exit(1);
}

console.log(`\n  Building static storefront`);
console.log(`    site : ${siteUrl}`);
console.log(`    api  : ${apiUrl}`);
console.log(`    excluding: ${serverOnly.join(', ')}\n`);

try {
  hide();
} catch (error) {
  // Put back whatever was already moved before giving up.
  restore();
  console.error('');
  console.error('  Could not move the admin files aside: ' + error.message);
  console.error('  Windows refuses to rename a directory while a process holds a handle on');
  console.error('  it. In order of likelihood: a running `next dev` (its watcher sits on');
  console.error('  src/app), an open editor, or a OneDrive sync pass on this folder.');
  console.error('  Stop the dev server first, then retry.');
  console.error('');
  process.exit(1);
}

const result = spawnSync('npx', ['next', 'build'], {
  cwd: webRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BUILD_TARGET: 'static' },
});

restore();

if (result.status !== 0) process.exit(result.status ?? 1);

// `public/.htaccess` is copied by Next like any other public asset, but a dotfile is easy
// to lose in an FTP client that hides them — assert it rather than discover it in prod.
const htaccess = join(webRoot, 'out', '.htaccess');
if (!existsSync(htaccess)) {
  cpSync(join(webRoot, 'public', '.htaccess'), htaccess);
}

console.log('\n  Done → apps/web/out\n');
console.log('  Upload the CONTENTS of that folder (including the hidden .htaccess)');
console.log('  into public_html on Hostinger. See DEPLOY_HOSTINGER.md.\n');
