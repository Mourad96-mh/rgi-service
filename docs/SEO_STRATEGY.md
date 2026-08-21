# SEO_STRATEGY.md — Ranking in Google Morocco

Target market: **Morocco**, primary language **French** (Arabic later). Goal: rank for
gaming-PC, laptop, component, and "build a PC" searches, and win local Casablanca intent.
SEO is a first-class build requirement, not an afterthought — Next.js SSR/SSG makes it
achievable, but only if implemented deliberately.

---

## 1. Technical SEO (foundational)

- **Rendering:** server-render (SSR) or statically generate (SSG/ISR) every indexable page
  — home, categories, product pages, configurator landing, blog. No SEO-critical content
  behind client-only fetches.
- **URLs:** clean, French, keyword-rich, stable:
  `/pc-gamer/`, `/composants/cartes-graphiques/`, `/composants/cartes-graphiques/rtx-5090-...`,
  `/configurateur-pc/`. Lowercase, hyphenated, no query strings for canonical pages.
- **Canonical tags** on every page; filtered/sorted listing variants canonicalize to the
  base category to avoid duplicate content.
- **sitemap.xml** auto-generated (categories, products, static pages), submitted to Search
  Console; **robots.txt** allowing crawl, disallowing `/admin`, `/cart`, `/checkout`, account pages.
- **Structured data (JSON-LD):**
  - `Product` + `Offer` (price in MAD, availability, brand, SKU, ratings) on product pages.
  - `BreadcrumbList` on category/product pages.
  - `Organization` + `LocalBusiness` (store address, phone, hours, geo) site-wide.
  - `WebSite` + `SearchAction` for sitelinks search box.
  - `ItemList` on category pages.
- **hreflang** ready for `fr-MA` (and `ar-MA` when Arabic ships).
- **Core Web Vitals:** optimize LCP (hero, product image), CLS (reserve image space), INP.
  Use `next/image` + Cloudinary (WebP/AVIF, responsive `srcset`, lazy-load below the fold).
- **HTTPS**, HTTP/2, gzip/brotli, sensible caching headers, CDN.
- **Mobile-first:** most Moroccan traffic is mobile; responsive + fast on 4G.

## 2. On-page SEO

- Unique `<title>` and meta description per page (templated, editable in admin per product).
  Pattern: `Nom du produit – Marque | Prix Maroc | Rgi Service`.
- One `<h1>` per page; logical `h2/h3`. Product name in the H1.
- Descriptive **alt text** on all images (staff-entered).
- Internal linking: categories ↔ products ↔ related products ↔ relevant guides.
- Rich product descriptions (not just spec dumps) — unique copy, not manufacturer boilerplate.
- Show price, availability, and delivery info prominently (helps Product rich results).

## 3. Keyword strategy (French, Morocco)

Cluster around intent:
- **Transactional:** "pc gamer maroc", "pc gamer prix maroc", "carte graphique rtx 5090 maroc",
  "pc portable gaming maroc", "workstation maroc", "manette ps5 maroc".
- **Configurator/long-tail:** "monter son pc maroc", "configurateur pc maroc",
  "assembler pc gamer casablanca".
- **Local:** "magasin informatique casablanca", "pc gamer casablanca".
- **Informational (blog):** "quel pc gamer choisir", "rtx 4070 vs 4080", "combien de watts pour mon pc".

Map one primary keyword cluster per category/landing page. Build the configurator landing
page (`/configurateur-pc/`) as an SEO asset targeting "monter/configurer son pc" intent.

## 4. Content / blog (organic engine)

- A `/blog/` (or `/guides/`) section with buying guides, comparisons, and "how to choose"
  articles in French. These capture top-of-funnel searches and internally link to products.
- Examples: "Guide d'achat PC gamer 2026", "RTX 5090 : pour qui ?", "Quelle alimentation
  choisir ?", "DDR4 vs DDR5". Each links to relevant category/product pages.
- Keep content genuinely useful and original; avoid thin/duplicate pages.

## 5. Local SEO (they have a physical Casablanca store)

- **Google Business Profile:** claimed, complete (address, hours, phone, photos, categories),
  reviews encouraged. Huge for "près de moi" / Casablanca searches.
- `LocalBusiness` JSON-LD with `address`, `geo`, `openingHours`, `telephone` matching GBP (NAP consistency).
- Local backlinks/citations (Moroccan directories, tech media).

## 6. E-commerce SEO specifics

- **Out-of-stock:** keep the page indexable, mark `availability: OutOfStock`, offer
  alternatives — don't 404/redirect (loses accrued ranking).
- **Faceted navigation:** canonical to base category; `noindex` thin filter combinations;
  don't let crawlers get lost in infinite filter URLs (control via robots + canonical).
- **Pagination:** self-referencing canonicals; ensure crawlable links to deeper pages.
- **Reviews/ratings** feed `AggregateRating` rich results (encourage post-purchase reviews).

## 7. Measurement & tooling

- **Google Search Console** (verify, submit sitemap, monitor coverage/queries).
- **GA4** (with consent banner — track conversions: add-to-cart, checkout, purchase,
  configurator completion).
- Lighthouse / PageSpeed in CI as a performance budget gate.
- Track configurator usage as a funnel (start → valid build → add to cart → purchase).

## 8. Implementation checklist for the coding assistant

- [ ] `generateMetadata` per route (title, description, canonical, OG/Twitter tags).
- [ ] JSON-LD components: Product, Breadcrumb, LocalBusiness, Organization, WebSite, ItemList.
- [ ] `app/sitemap.ts` (dynamic) + `app/robots.ts`.
- [ ] `next/image` + Cloudinary loader everywhere; alt text from data.
- [ ] French slug generation on product/category create; redirect on slug change (301).
- [ ] Canonicalize filtered listing pages; `noindex` thin variants.
- [ ] hreflang scaffolding (`fr-MA` now).
- [ ] Editable meta title/description fields in the admin product form.
- [ ] Performance budget in CI (Lighthouse CI).
- [ ] GA4 + Search Console + consent banner.
