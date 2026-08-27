# DEPLOY_HOSTINGER.md — putting the storefront on Hostinger shared hosting

The storefront is exported to plain HTML/CSS/JS and uploaded to `public_html`. Nothing
runs on Hostinger: it hands out files.

> **Read this first.** Shared hosting cannot host all of Rgi Service. Two pieces have to
> live elsewhere, and the site does not work without them:
>
> | Piece | Where it must live | Why |
> |---|---|---|
> | **NestJS API** | any Node host | cart, checkout, stock, orders, the admin, and every rebuild read from it |
> | **MongoDB** | Atlas (already live) | shared hosting offers MySQL only |
>
> The API is live on Render at `https://rgi-service-api.onrender.com/api/v1` (Frankfurt).
>
> **The admin dashboard is no longer on that list.** It used to need a Node host of its
> own for `middleware.ts` and four route handlers; it was rewritten on 2026-08-24 to run
> entirely in the browser against the API, so it exports to plain files and ships in this
> same upload, at `rgiservice.ma/admin/`. See `docs/ADMIN_DASHBOARD.md` §1 for what that
> cost.

---

## 1. What the static build gives up

Worth knowing before you rely on it.

| | Server build (Vercel) | Static build (Hostinger) |
|---|---|---|
| Catalogue freshness | ISR, 120 s | **frozen until you rebuild and re-upload** |
| Filters / sort / pagination | server-rendered | applied in the browser |
| Search | server-rendered | browser |
| Admin dashboard | included | included, and runs in the browser |
| New product appears | automatically | only after a rebuild |

The last row is the one that bites. Staff can add a product in the admin and it will not
appear on `rgiservice.ma` until someone runs the build and uploads again. Prices and stock
*inside* a filtered view come from the API live, but the pre-rendered pages do not.

---

## 2. Build

The build reads the whole catalogue from the API, so **the API must be running and
reachable** — locally or deployed.

```bash
# from the repo root
NEXT_PUBLIC_SITE_URL=https://rgiservice.ma \
NEXT_PUBLIC_API_URL=https://rgi-service-api.onrender.com/api/v1 \
npm run build:static --workspace=@rgi/web
```

> **Use the `onrender.com` host, not `api.rgiservice.ma`.** This block used to name the
> subdomain, which **does not resolve** — it is an *optional, not-yet-done* step described
> in `DEPLOY.md` § "Optional: `api.rgiservice.ma`". Building against it produces a site
> that looks perfect and cannot reach its API at all: the catalogue pages are prerendered,
> so the shop renders, but every filter, search, cart, checkout and admin call fails in the
> browser. If you do set the subdomain up later, change this line **and rebuild** — the
> value is baked into the files you upload.

Both variables are **inlined at build time**. `NEXT_PUBLIC_API_URL` must be the URL the
*visitor's browser* will call — not `localhost`, which only works on your machine.

Note that `.env` and `apps/web/.env.local` both hold `http://localhost:4000/api/v1`. Real
shell variables win over `.env` files in Next, so passing them on the command line as
above is enough — but never rely on the `.env` values for a production build.

**Check before uploading**, because this failure is invisible in the HTML:

```bash
grep -rl "localhost:4000\|localhost:3000" apps/web/out | head   # must print nothing
grep -rho "https://[a-z0-9.-]*/api/v1" apps/web/out | sort -u   # must be the API you meant
```

Output: `apps/web/out/`.

The script used to move `src/app/admin`, `src/app/api`, `src/middleware.ts`,
`src/components/admin` and `src/lib/admin` out of the tree for the duration of the build,
because Next refuses to export while a route handler or a middleware exists. The route
handlers and the middleware were deleted on 2026-08-24 and the dashboard now runs in the
browser, so nothing has to be hidden: the script sets `BUILD_TARGET=static`, runs
`next build`, and then asserts that `out/admin/index.html` is actually there.

If the API is unreachable the build **fails** rather than exporting pages that read
« catalogue momentanément indisponible ». That is deliberate: a static file is uploaded and
served for weeks, so a silent failure would put a broken shop in front of customers.

---

## 3. Upload

In hPanel → **File Manager** (or any FTP client), put the **contents** of `apps/web/out/`
into `public_html/` — the contents, not the folder itself.

Two things people get wrong:

- **`.htaccess` is a hidden file.** Enable "show hidden files" in File Manager, or your FTP
  client will skip it, and you lose HTTPS redirection, the `www` redirect, compression,
  cache headers and the custom 404.
- **Delete the old files first** when re-uploading. Next fingerprints its assets, so stale
  chunks linger forever otherwise and slowly fill the disk.

The upload is ~22 MB, 316 files. Zipping `out/`, uploading the single archive and
extracting it in File Manager is far faster than 316 individual FTP transfers.

---

## 4. DNS

The domain stays registered at HeberJahiz; only the website records move to Hostinger.

**Do the mail step first.** `MX rgiservice.ma → rgiservice.ma` means mail is delivered to
whatever the apex `A` record resolves to. Repoint `@` without preparing, and
`contact@rgiservice.ma` — the address in the site footer — stops receiving.

1. HeberJahiz Zone Editor: add `mail` → `A` → `159.8.122.136`, then change the `MX` to
   `mail.rgiservice.ma` (priority 0). Send a test mail. Confirm it arrives.
2. hPanel → **Websites → Add website** → `rgiservice.ma`. Hostinger shows the IP (and/or
   nameservers) it wants.
3. HeberJahiz Zone Editor: point `@` and `www` at Hostinger's IP. **Do not switch the
   nameservers** to `ns1/ns2.dns-parking.com` — that moves the whole zone to Hostinger and
   leaves your MX records behind.
4. hPanel → **SSL** → issue the free Let's Encrypt certificate once DNS resolves.

---

## 5. Let the API accept the new origin

The browser calls the API directly from `rgiservice.ma`, so the API must allow it:

```
CORS_ORIGINS=https://rgiservice.ma,https://www.rgiservice.ma,http://localhost:3000
```

Without this every call is blocked and the cart, checkout and filters fail silently.

---

## 6. Verify

This machine's IPv6 is broken, so force IPv4 or you will chase a phantom outage:

```bash
curl -4 -sI https://rgiservice.ma/ | head -3          # 200, not the parking page
curl -4 -sI https://www.rgiservice.ma/ | head -3      # 301 → https://rgiservice.ma/
curl -4 -s https://rgiservice.ma/ | grep -o 'rel="canonical" href="[^"]*"'
curl -4 -s https://rgiservice.ma/sitemap.xml | head -5
cd seo-audit && SITE=https://rgiservice.ma node crawl.mjs
```

Then in a browser, because these only fail client-side:

- a category page → click a brand filter → the grid must change (this is the API call)
- `/recherche?q=rtx` → results appear
- add to cart → `/panier` → `/commande` → place a COD order → the confirmation page loads

And the dashboard, which is entirely client-side and so cannot be checked with `curl`:

- `/admin/` while signed out → must bounce to `/admin/login/?suivant=…`
- sign in → the sidebar shows your name and role
- `/admin/produits/` → the table fills; open one → the form loads with its category's
  technical fields
- `/admin/stock/` → change a quantity → the row re-reads and the badge follows
- upload one image on a product → it reaches Cloudinary (this is the `/media/sign` path,
  the only one that talks to a third party from the browser)
- press **Déconnexion** → back to the login, and `/admin/` no longer opens

If every one of those fails at once with nothing in the UI, open the browser console: it
will be CORS. The dashboard calls the API cross-origin exactly like the shop does, so
`rgiservice.ma` has to be in `CORS_ORIGINS` (§5) — there is no longer a same-origin route
handler standing in between.

---

## 7. Re-publishing after a catalogue change

Every time staff add or edit a product:

```bash
npm run build:static --workspace=@rgi/web   # API must be up
# re-upload apps/web/out/ to public_html
```

There is no way around this on static hosting. If it becomes a chore, that is the argument
for putting the storefront back on Vercel — it is free and rebuilds itself.
