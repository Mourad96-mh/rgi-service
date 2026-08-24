# DEPLOY_HOSTINGER.md — putting the storefront on Hostinger shared hosting

The storefront is exported to plain HTML/CSS/JS and uploaded to `public_html`. Nothing
runs on Hostinger: it hands out files.

> **Read this first.** Shared hosting cannot host all of Rgi Service — only the shop
> windows. Two pieces have to live elsewhere, and the site does not work without them:
>
> | Piece | Where it must live | Why |
> |---|---|---|
> | **NestJS API** | any Node host | cart, checkout, stock, orders, and every rebuild read from it |
> | **MongoDB** | Atlas (already live) | shared hosting offers MySQL only |
> | **Admin dashboard** | Vercel | needs middleware + server routes for the httpOnly session |
>
> The API is the one that costs money. As of 2026-08-24 it is **not deployed anywhere** —
> the old Render service returns `x-render-routing: no-server`.

---

## 1. What the static build gives up

Worth knowing before you rely on it.

| | Server build (Vercel) | Static build (Hostinger) |
|---|---|---|
| Catalogue freshness | ISR, 120 s | **frozen until you rebuild and re-upload** |
| Filters / sort / pagination | server-rendered | applied in the browser |
| Search | server-rendered | browser |
| Admin dashboard | included | **not included** |
| New product appears | automatically | only after a rebuild |

The last row is the one that bites. Staff can add a product in the admin and it will not
appear on `rgiservice.ma` until someone runs the build and uploads again. Prices and stock
*inside* a filtered view come from the API live, but the pre-rendered pages do not.

---

## 2. Build

The build reads the whole catalogue from the API, so **the API must be running and
reachable** — locally or deployed.

```bash
# from the repo root, with the API running
NEXT_PUBLIC_SITE_URL=https://rgiservice.ma \
NEXT_PUBLIC_API_URL=https://api.rgiservice.ma/api/v1 \
npm run build:static --workspace=@rgi/web
```

Both variables are **inlined at build time**. `NEXT_PUBLIC_API_URL` must be the URL the
*visitor's browser* will call — not `localhost`, which only works on your machine.

Output: `apps/web/out/`.

The script moves `src/app/admin`, `src/app/api`, `src/middleware.ts`, `src/components/admin`
and `src/lib/admin` aside for the duration and always puts them back, including on Ctrl-C.

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

---

## 7. Re-publishing after a catalogue change

Every time staff add or edit a product:

```bash
npm run build:static --workspace=@rgi/web   # API must be up
# re-upload apps/web/out/ to public_html
```

There is no way around this on static hosting. If it becomes a chore, that is the argument
for putting the storefront back on Vercel — it is free and rebuilds itself.
