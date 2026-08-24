# SEO Audit — Rgi Service
Audited **2026-08-22** against the live site `https://rgi-service.vercel.app` (61 sitemap URLs crawled).
Type: **e-commerce / catalog** + **local business (Casablanca, serving all Morocco)**.

> **Re-crawled 2026-08-24** (61 URLs, same host — `rgiservice.ma` is registered but still
> parked, see Open items). The 22 Aug fixes are confirmed live: **0** non-200, **0** duplicate
> titles, **0** duplicate descriptions, exactly one `<h1>` per page, canonical + `og:image` +
> `og:locale` on all 61, homepage `@graph` = `Organization + ComputerStore + WebSite + ItemList`.
> Two new items came out of it:
> - **8 product meta descriptions ran 162–170 characters**, so Google was cutting the
>   *« paiement à la livraison »* clause — the strongest trust signal we have in Morocco.
>   Fixed in `lib/seo.ts` (`productDescription`, budgeted to 160 the way `seoTitle` is
>   budgeted to 60). **Awaiting deploy** — still 162–170 on the live site until then.
> - Two titles were reported at 62 characters. **False alarm**: `crawl.mjs` was counting
>   `&quot;` as six characters. It now decodes entities before measuring, as Google does.
>   Real lengths are 57. No title on the site exceeds 60.

## Scorecard

| Area | Verdict |
|---|---|
| Crawl & indexation | ✅ strong |
| Titles / descriptions / H1 | 🟡 unique everywhere, but 44 titles over length |
| Canonicals | ✅ 61/61 |
| Product structured data | ✅ rich-result eligible |
| **Local SEO (Casablanca)** | ❌ **biggest gap — no LocalBusiness node** |
| Social / OG | 🟡 16 category pages missing og:image |
| Performance | ✅ genuinely fast |

## What is already right (don't touch)
- **61/61 pages return 200**, exactly **one `<h1>` each**, **zero duplicate titles**, **zero duplicate descriptions**, canonical on every page.
- `robots.txt` correct: allows crawl, blocks `/admin`, `/panier`, `/commande`, `/compte`, `/api`, declares the sitemap absolutely.
- **Product schema is complete and rich-result eligible** — `Offer` with `price`, `priceCurrency: MAD`, `availability`, `itemCondition`, `seller`, plus `brand`, `sku`, `image`.
- `BreadcrumbList` on every deep page; `ItemList` on categories; `Organization` + `WebSite` + `SearchAction` site-wide, linked by `@id`.
- All three phone numbers published as `ContactPoint`s.
- **Performance is good**: homepage 22 KB gzipped, TTFB ~0.28 s, product images already WebP (~40 KB).

## Findings, by impact

### P1 — No LocalBusiness / Store node  ❌ biggest miss
The graph has `Organization`, which is generic. A Casablanca shop competing for
"pc gamer casablanca" needs a **`Store`** (or `LocalBusiness`) node carrying:
`address` (PostalAddress, `addressLocality: Casablanca`, `addressCountry: MA`),
`geo` (lat/lng), `openingHoursSpecification`, `hasMap` (Google Business CID),
`priceRange`, `image`. Without it Google has no structured proof the business is
physically in Casablanca.
**Blocked on the client** for: street address, postal code, coordinates, opening hours.

### P1 — Google Business Profile not referenced
No `hasMap`. A GBP listing is the single highest-ROI local ranking factor in Morocco
and it is free. Must be created and its NAP must match the site **character for character**.

### P2 — 44 of 61 titles exceed 60 characters
Product titles run 63–97 chars and get truncated in results. The pattern
`{name} – {brand} | Prix Maroc | Rgi Service` duplicates the brand (already in the name)
and burns ~28 chars on boilerplate. Drop `– {brand}` and shorten the suffix.

### P2 — 16 category pages have no `og:image`
Every `/composants/*`, `/pc-gamer`, `/ecrans`, `/consoles` etc. shares blank on
WhatsApp — which matters disproportionately in Morocco, where WhatsApp is the main
sharing channel. The root layout has a default OG image; these pages override
`openGraph` without re-supplying `images`.

### P2 — `og:locale` present on only 2 of 61 pages
Same cause: partial `openGraph` overrides drop the inherited value.

### P3 — `/configurateur-pc` has no structured data
The signature feature and a money page. Deserves at minimum `BreadcrumbList` + `WebApplication`/`HowTo`.

### P3 — 9 meta descriptions over 160 chars
`/configurateur-pc` at 171; eight PDPs at 162–170.

### P3 — No `aggregateRating` / `review` on products
The `Product` type already carries `ratingAvg`/`ratingCount`. Once real reviews exist,
star ratings in results are a large CTR win. Never fabricate these.

### P3 — No `llms.txt`, no explicit AI-crawler rules
ChatGPT/Perplexity increasingly answer "où acheter un PC gamer au Maroc". Cheap to add.

### P3 — DOM size on the homepage
~1368 tags — under Lighthouse's 1400 flag but above the 800 warning. Watch as the catalog grows.

## Open items (cannot be closed from the codebase)
- Street address, postal code, geo coordinates, opening hours
- Google Business Profile creation + verification
- Google Search Console property + sitemap submission
- Real customer reviews
- ~~Final domain~~ — **decided 2026-08-24: `rgiservice.ma`** (registered). Still **not**
  serving the site: its DNS points at HeberJahiz parking (`159.8.122.136`,
  NS `server121ns1/2.heberjahiz.com`), so every canonical, OG and JSON-LD URL is still
  `rgi-service.vercel.app`. Nothing in the code hardcodes a host — all of it derives from
  `NEXT_PUBLIC_SITE_URL` via `SITE_URL` in `apps/web/src/lib/env.ts` — so the fix is DNS +
  that one variable + a rebuild (`NEXT_PUBLIC_*` is inlined at build time). Do not submit
  Search Console until then, or it has to be redone.
