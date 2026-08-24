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
 * All three belong to the admin, which stays on Vercel. This script moves them aside,
 * builds, and always puts them back — including on failure or Ctrl-C, because leaving a
 * developer's working tree gutted would be far worse than a failed build.
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

function hide() {
  rmSync(STASH, { recursive: true, force: true });
  mkdirSync(STASH, { recursive: true });
  for (const rel of serverOnly) {
    const from = join(webRoot, rel);
    if (!existsSync(from)) continue;
    const to = join(STASH, rel.replaceAll('/', '__'));
    renameSync(from, to);
    moved.push([from, to]);
  }
}

function restore() {
  while (moved.length) {
    const [from, to] = moved.pop();
    if (existsSync(to)) {
      rmSync(from, { recursive: true, force: true });
      renameSync(to, from);
    }
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

hide();

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
