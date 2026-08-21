# PROGRESS — Rgi Service build

Running log of what is built and what comes next. Update at the end of each session.

## Session 1 — 2026-08-20

### Done ✅

**Monorepo foundation** (`ROADMAP.md` Phase 0, partial)
- Root workspace: `package.json` (npm workspaces — `packages/*`, `apps/*`), `.gitignore`,
  `.npmrc`. npm rather than pnpm on purpose: pnpm's symlink tree misbehaves under OneDrive.
- `npm install` clean (47 packages), `npm run typecheck --workspaces` clean.

**`packages/types` — the shared contract** (imported by web + api, never redefined)
- `common.ts` — `Centimes`, `Localized`, `Paginated`, `ApiError`.
- `money.ts` — `toCentimes` / `toMad` / `formatMad` (`14 269,00 MAD`) / `applyDiscountPct`.
  All integer arithmetic; no floats anywhere near money.
- `catalog.ts` — `Category`, `AttributeDefinition`, `Product`, `ProductSummary`, `Facet`,
  `ProductListQuery/Response`, `effectivePriceAt()` (flash-deal window logic).
- `configurator.ts` — `SlotId`, the 9 `SLOTS` with French labels/help in selection order,
  `Part`, `Selection`, `Rule`, `Violation`, `BuildEvaluation`, and the constants
  `CONFIGURATOR_DISCOUNT_PCT = 5`, `BASE_SYSTEM_WATTS = 100`, `PSU_HEADROOM_FACTOR = 0.8`.
- `build.ts`, `user.ts`, `order.ts` — builds, auth/roles, orders + cart DTOs +
  `ORDER_STATUS_FLOW` (which status can follow which).

**`packages/config-engine` — the compatibility engine** (Phase 4's hard part, built first
to de-risk it). Pure: no DB, no framework, no clock.
- `rules.ts` — the 12 default rules from `CONFIGURATOR_ENGINE.md` §2 as **seed data**
  with French messages. These get written to `compatibilityrules` and are admin-editable.
- `engine.ts` — `evaluateBuild()`, `compatiblePartsForSlot()`, plus `evaluateRule`,
  `violationsForCandidate`, `estimateWattage`, `recommendPsuWattage`, `missingSlots`.
- **42 unit tests, all passing** (`npm test --workspace=@rgi/config-engine`): every rule
  with a passing and a failing case, the PSU 0.8-factor boundary (625 W passes, 624 W
  fails), the integrated-graphics path, the stock-cooler path, live filtering narrowing as
  slots fill, warnings not excluding parts, disabled rules being ignored,
  edit-an-earlier-slot invalidation, and centime-exact discount math.

### Decisions taken (and why)

- **npm workspaces, not pnpm** — OneDrive + pnpm symlinks. `FOLDER_STRUCTURE.md` allows both.
- **`count_lte` operator dropped.** `CONFIGURATOR_ENGINE.md` asks for
  "count(RAM modules) ≤ mobo.ram_slots"; a RAM product already carries `modules` (a 2×16 GB
  kit is one product with `modules: 2`), so it is just `sum_lte` over `modules`. The
  operator set now matches `DATA_MODEL.md` §5 exactly.
- **Two presence checks live in code, not in the rules collection**: `cooler_required` and
  `gpu_required`. They are conditional on *another part's* attribute (`includes_cooler`,
  `integrated_graphics`), which none of the six comparison operators can express. Everything
  that compares two values is still pure data.
- **`case` is the first slot.** It constrains form factor, GPU length, cooler height and PSU
  format — filtering downstream from it is what makes the builder feel intelligent.
- **`capacity_gb` on RAM = total capacity of the kit** (retail convention: "32 Go (2×16)").
  Must match how staff enter it in the admin — put it in the French field label.


---

## Session 2 — 2026-08-20

### Done ✅

**`apps/api` — the NestJS backend** (`ROADMAP.md` Phase 0 complete, Phase 1 API complete).
Builds clean (`nest build`), typechecks clean, and was smoke-tested end to end against the
local MongoDB with the seeded catalog.

- **Foundation:** `main.ts` (helmet, CORS allowlist, `/api/v1` prefix, global
  `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`), `app.module.ts` wiring
  Mongoose, `@nestjs/config` with fail-fast env validation, and Throttler.
  `AllExceptionsFilter` gives every error the `{ statusCode, message (fr), error }` shape.
- **Auth:** register / login / refresh / logout / me. JWT access + refresh, bcrypt(12),
  refresh-token **rotation** with the hash stored on the user (token reuse kills the
  session), same error message for unknown e-mail and wrong password (no enumeration).
  Global `JwtAuthGuard` — routes are private unless `@Public()`; `@Roles('staff')` uses the
  rank helper from `@rgi/types`, so an admin passes a staff check.
- **Schemas** (`src/schemas`): category, attribute-definition, product, compatibility-rule,
  user, build, inventory-log — straight from `DATA_MODEL.md`, with the documented indexes
  plus a weighted text index on `name.fr` / `brand` / `description.fr`.
- **Catalog API:** category tree, category detail + its attribute definitions, product
  listing with **faceted filtering** (`?category=&brand=&minPrice=&attr.socket=AM5…`),
  search with a regex fallback for prefixes the text index misses, product detail, staff
  CRUD, stock adjustment (writes `inventorylogs`), archive.
- **Configurator API:** `/configurator/slots`, `/parts` (live-filtered candidates),
  `/validate`, `POST /builds` + `GET /builds/:shareId`. It runs the same
  `@rgi/config-engine` the tests cover; rules load from `compatibilityrules` with a 30 s
  cache and fall back to `DEFAULT_RULES` only if the collection is empty.
- **Seed** (`npm run seed`): 16 categories, 76 attribute definitions, the 12 rules, 43 real
  products across all 8 category types, and an admin account. Idempotent — upserts on
  slug / key / SKU / ruleId.

**Shared packages now emit `dist/`.** `@rgi/types` and `@rgi/config-engine` build to
CommonJS (`tsconfig.build.json`) so Nest can consume them; the engine's vitest config
aliases back to `src`, so `npm test` still needs no build. The 42 engine tests still pass.

**Verified by hand** (API running against the seeded DB):

| Check | Result |
|---|---|
| `GET /health`, `/health/secure`, `/health/staff` | ok / 401 without token / ok as admin |
| login → `/auth/me` | returns the admin profile, no hashes |
| `GET /products?category=composants` | 30 products (parent category includes children) |
| `?category=…/cartes-graphiques&attr.vram_gb=16` | 2 products, `vram_gb` facet keeps all its values |
| `?limit=abc` / `?bogus=1` / `?sort=bogus` | 400 with French messages |
| ITX case selected | only the ITX board survives; then only AM5 CPUs, DDR5 RAM, GPUs ≤ 330 mm, the SFX PSU |
| RTX 5080 + 7800X3D on a 650 W PSU | invalid — 580 W estimated, 850 W recommended, error + warning |
| same build with 1000 W | valid, 31 550 MAD → **29 972,50 MAD** after −5% |
| save build → reload by `shareId` | 8 components, still valid, 580 W |
| product create with `socket: 'AM6'` / missing required / unknown key | 400, each with the French field label |

### Decisions taken (and why)

- **Packages ship a build.** Nest's tsc build cannot reach into a sibling package's `src`
  without dragging the whole monorepo into `rootDir`. Emitting `dist/` per package is the
  conventional fix; `apps/api`'s `prebuild` script builds them first.
- **`attr.<key>` filters bypass the global pipe on purpose.** They are dynamic by
  definition (staff invent attributes in the dashboard), so a whitelisting pipe would
  reject them. `CatalogQuery` / `AttributeFilters` (custom param decorators) split the
  query in two and validate the declared half explicitly — a custom param decorator is
  *not* covered by the global `ValidationPipe`, which is why the validation is inline.
- **Facet counts exclude their own filter.** Selecting `vram_gb=16` must not collapse the
  `vram_gb` facet to a single row; every other active filter still applies.
- **Category slugs are full paths** (`composants/cartes-graphiques`) to match the URL
  structure `SEO_STRATEGY.md` §1 asks for. `slugifyPath()` keeps the separators.
- **Delete is archive.** `DELETE /products/:id` sets `status: 'archived'` so past orders
  stay readable. Categories refuse to delete while they hold children or products.
- **Attribute validation lives server-side** in `AttributeDefinitionsService`: required
  fields, types, strict enum values, no unknown keys. A typo'd socket silently breaks the
  configurator, so the browser is never the only check.

### Next up ⏭️

1. `apps/web` — Next.js App Router + Tailwind with the tokens from `DESIGN_SYSTEM.md`,
   built to match `mockups/homepage.html`; API client + React Query; home, category
   listing with facets, product detail (SSR + JSON-LD).
2. The configurator UI on top of the endpoints that already work.
3. Admin dashboard (Phase 2), then cart/checkout/orders (Phase 3 — needs the replica set).
4. Media module: signed direct-to-Cloudinary uploads (`API_SPEC.md` §Media) — waiting on
   the Cloudinary account.

### Open questions for the client / Mourad ❓

- **MongoDB is standalone locally.** The API talks to the local MongoDB 8.0 service
  (`mongodb://127.0.0.1:27017/rgiservice`), which is enough for catalog + configurator but
  **not** for orders: atomic stock deduction needs transactions, i.e. a replica set.
  `apps/api/README.md` documents how to convert the local service; an Atlas cluster would
  also settle it. Needed before Phase 3.
- **Brand assets** — logo, official colours (the violet→cyan in `DESIGN_SYSTEM.md` is a
  placeholder), store address + phone + hours for the `LocalBusiness` JSON-LD, domain name.
- **Cloudinary account** for product images (the seeded products have no images yet).
- Product copy in the seed is written by us as placeholder-quality French; the client
  should confirm real prices and stock before launch.

## Session 3 — 2026-08-21

### Done ✅

**`apps/web` — the Next.js storefront** (ROADMAP Phase 1 front-end). `npm run dev` at the
repo root now starts **both** the API and the site (concurrently), which is what failed
before: the root script pointed at a workspace that did not exist yet.

- **Design system wired to the tokens.** `tailwind.config.ts` mirrors `DESIGN_SYSTEM.md` §2–§4
  1:1 (colours, `bg-grad`, radii, `shadow-glow`/`shadow-soft`, Space Grotesk + Inter via
  `next/font`), and `styles/globals.css` holds the component classes (`.btn`, `.pill`,
  `.chip`, `.surface-card`, `.spec-pill`, `.icobtn`, `.grad-text`) plus a
  `prefers-reduced-motion` block. Swapping `accent`/`accent2` re-skins the whole site.
- **Shell:** announcement bar, sticky blurred header (gradient logo mark, search field,
  account/favourites/cart, category row with the highlighted **Configurateur PC −5%**),
  mobile drawer, 4-column footer with payment badges. The nav is data-driven — a category
  added in the admin shows up here.
- **Pages:** home (hero with radial glows, category tiles, configurator CTA with the live
  compatibility preview, best-sellers, nouveautés, trust band), category listing at the
  nested SEO path `/composants/cartes-graphiques/`, product detail, search, configurator
  landing, 404 and error boundaries.
- **Faceted filtering is server-rendered**: every facet value is a plain `<Link>`, so the
  listing works with JavaScript off and each filtered view is crawlable — while its
  canonical still points at the base category. Sorting is the one client component.
- **SEO:** per-page `<title>`/description/canonical, `Organization` + `WebSite` +
  `SearchAction` + `ItemList` on home, `BreadcrumbList` bound to the visible breadcrumbs,
  `Product` + `Offer` (MAD, availability, SKU, brand) on product pages, `robots.txt`
  (disallowing `/admin`, `/panier`, `/commande`, `/compte`) and a `sitemap.xml` generated
  from the live catalog — **61 URLs** on the seeded data.
- **One product card** (`components/product/ProductCard.tsx`) used by every grid, with
  spec pills derived per component type, gradient price, discount tag and a stock line
  that pairs colour with an icon + label (never colour alone).

**Verified**: `next build` clean (8 routes), then against `next start` + the live API —
home 200 with real seeded products and prices, `/composants/cartes-graphiques` 200 with
brand + "Puce graphique" + "Mémoire vidéo" facets, `?attr.vram_gb=16` narrowing to the two
16 Go cards, product page with the right title pattern and valid Product JSON-LD
(`16990.00 MAD`, `InStock`, `GPU-RTX5080-TUF`), `/produit/inexistant` → 404, robots and
sitemap served. Screenshot matches `mockups/homepage.html`.

### Fixed along the way 🔧

- **`GET /categories/:slug` could not match a nested slug.** Category slugs are full paths
  (`composants/cartes-graphiques`) but `:slug` matches a single segment, so every category
  page 404'd. The route is now an Express wildcard (`@Get('*')`, `@Param('0')`).

### Decisions taken (and why)

- **Products live at `/produit/<slug>`, categories keep their nested paths.**
  `FOLDER_STRUCTURE.md` specifies the flat product path while `SEO_STRATEGY.md` §1 shows a
  nested example; a single category-independent product URL means one canonical per product
  even when it belongs under several categories, and the hierarchy still reaches Google via
  the breadcrumbs + `BreadcrumbList`. Documented in `src/lib/routes.ts`.
- **No shadcn/ui yet.** `DESIGN_SYSTEM.md` §9 suggests it as the base, but every component
  built so far (button, pill, card, filters) is a handful of Tailwind classes on the tokens;
  shadcn will be added when a real primitive is needed (dialog, sheet, combobox for the
  admin), not as a blanket dependency.
- **All French strings go through `src/locales/fr.ts`** — no hardcoded copy in components,
  so Arabic can be added later without touching the UI (CLAUDE.md §6).
- **Filters are links, not client state.** Crawlable, no JS required, and the URL is the
  single source of truth for what is filtered.

### Next up ⏭️

1. **The configurator UI** — the endpoints (`/slots`, `/parts`, `/validate`, `/builds`) are
   live and tested; what is missing is the step-by-step builder screen (running price,
   running wattage, compatibility feedback, "ajouter au panier").
2. Cart (Zustand + server validation), then checkout and orders (needs the replica set).
3. Admin dashboard (Phase 2): product CRUD with the category-driven attribute forms.
4. Product images — everything renders an emoji placeholder until Cloudinary is set up.

### Gotchas for this project

- ⚠️ **OneDrive**: pause syncing before running `next dev` / `next build` — `.next` under
  OneDrive corrupts (`EINVAL readlink` / `MODULE_NOT_FOUND`).
- ⚠️ `C:\Users\MOURAD` is **one big git repo** covering every project on the Bureau. Never
  `git add -A` / `git commit -am` from here.
- ⚠️ Heredocs longer than ~8 KB get truncated by the shell tool here — write big files in
  chunks or the command dies with "unexpected EOF".
- ⚠️ Local MongoDB 8.0 runs as a Windows service, **standalone** (no transactions).

## Session 4 — 2026-08-21

### Done ✅

**Real product photography for the whole catalog** (43/43 products, 1–3 photos each).

- `scripts/fetch-product-images.mjs` — sources photos per SKU from image search, ranks the
  candidates, downloads and normalises them into `apps/web/public/products`, and writes
  `scripts/product-images.json`. Queries live in `scripts/product-image-queries.json`
  (sku → English query), so a bad match is fixed by editing one line and re-running with
  `--only=<sku> --force`. When search is too polluted to find the right model, the value
  can be an **array of explicit image URLs** instead of a query (used for the RTX 5060
  Eagle and the B650 Tomahawk, where rival vendors' cards outrank the real one).
- Candidates are ranked on **border whiteness**, not on the domain. A clean pack shot has a
  near-white border ring and scores ~1; a marketing banner or a lifestyle photo scores near
  0. This one metric replaced a domain allowlist that kept picking manufacturer *banners*.
- `scripts/trim-product-images.mjs` — second pass that strips the uniform white border, so
  a graphics card spans its tile instead of floating inside a square of padding. Images
  keep their natural aspect ratio; the tiles are `object-contain`.
- `apps/api/src/seed/seed-images.ts` reads the manifest and attaches the photos to every
  seeded product (`url`, `alt`, `isPrimary`, `order`, `publicId`). Reseeded: 43 products
  now carry images. The stored URL is site-relative (`/products/<sku>-1.webp`); swapping in
  Cloudinary later means putting an absolute URL in the same field, nothing else changes.
- ⚠ These are **manufacturer press shots standing in for the client's own photography** —
  they must be replaced with the shop's or the supplier's images before launch.

**Homepage hero is a carousel** (the pattern casaconfig.ma uses, on our own tokens).

- `components/home/HeroCarousel.tsx` + `data/hero-slides.ts`: five slides (configurateur,
  cartes graphiques, PC gamers, PC portables, écrans), copy in `locales/fr.ts`.
- All slides are in the DOM and one CSS transform moves the track, so the first slide is
  server-rendered and is the LCP element. Autoplay (6.5 s) pauses on hover, on keyboard
  focus, when the tab is hidden and when `prefers-reduced-motion` is set; arrows, dots,
  ← →, and touch swipe all drive the same `goTo`.
- The page keeps exactly one `h1` (visually hidden): a heading that changes on a timer is
  no use to a crawler or a screen reader, so the slides carry `h2`s.
- Stats strip (1 200+ / 2 500+ / 12 / 48h) sits under the deck, server-rendered.

**Product pages rebuilt as real e-commerce pages.**

- `ProductGallery` — main shot, thumbnails, prev/next, fullscreen view (Esc / ← → / click).
- `BuyBox` — quantity stepper with a running total. The cart is Phase 3, so the button says
  so instead of pretending to work (`TODO(spec)` marks the swap-in point).
- `ProductTabs` — Description / Caractéristiques / Livraison & garantie as real ARIA tabs;
  every panel stays in the DOM (inactive ones `hidden`) so the copy is crawlable.
- Buy column is sticky on desktop; spec pills, reassurance list, and a
  "monte ton PC autour de cette pièce" configurator CTA on every configurator part.
- Breadcrumbs now show the full path (Accueil → Composants → Cartes graphiques → produit)
  by resolving the product's category id against the category tree.
- `lib/url.ts` — `absoluteUrl()`; Product JSON-LD and Open Graph now emit absolute image
  URLs whether the image is local or on Cloudinary.

**Design**: product photos are white pack shots, so every image area is a light
`photo-tile` (cards, hero slides, gallery). Inactive gallery thumbnails use a ring, not
opacity — a white tile at 70% on a dark page just reads as grey.

**Verified** against the running dev stack (API + web on :4000/:3000): homepage 200 with
the carousel server-rendered (5 slides, `aria-roledescription="carrousel"`), autoplay
advancing to slide 2 with the tint following it, `/composants/cartes-graphiques` showing
real GPU photos in the cards with facets intact, the product page with gallery +
thumbnails + tabs + sticky buy column, Product JSON-LD carrying an absolute image URL, and
`tsc --noEmit` clean on both workspaces. A visual contact sheet of all 43 primary photos
was reviewed twice and the weak picks re-sourced.

### Gotchas learned this session

- ⚠ **OneDrive + a running `next dev` lock files under `public/`**: Node's `rename`/`unlink`
  onto them fails with EPERM/EBUSY, while bash `mv -f` goes through. `trim-product-images.mjs`
  leaves `*.tmp` beside the original when it hits this and says so; finish with
  `for f in apps/web/public/products/*.tmp; do mv -f "$f" "${f%.tmp}"; done`.
- ⚠ **Next's dev image optimiser caches by URL**, so a replaced file keeps serving the old
  bytes until the dev server restarts. Verify a re-processed image with a fresh cache key
  (`/_next/image?url=…&w=828`) rather than trusting the page.
- ⚠ `curl` without `-f` saves the 403 HTML page as if it were the image; manufacturer CDNs
  (gigabyte, static.*) block hotlinking often enough that this silently poisoned a batch.

### Next up ⏭️

1. **The configurator UI** — still the biggest gap; every endpoint behind it is live and
   covered by the 42 engine tests.
2. Cart (Zustand + server validation), then checkout and orders (needs the replica set).
3. Admin dashboard (Phase 2), including replacing these press shots via Cloudinary upload.
4. `apps/web` has no ESLint config yet — `next lint` drops into its interactive setup.

## Session 5 — 2026-08-21

### Done ✅ — the configurator UI (ROADMAP Phase 4, the differentiator)

The builder now exists at `/configurateur-pc`, on top of the endpoints that were already
live and covered by the 42 engine tests.

- **`store/configurator.ts`** (Zustand + `persist`): the build in progress. It holds whole
  `ProductSummary` objects so a chosen part renders without another round trip, but **only
  ids are ever sent to the API** — prices, compatibility and totals always come back from
  the server. Persisted to localStorage, so a reload or a detour to a product page does not
  throw the build away.
- **`ConfiguratorBuilder`** — one React Query client scoped to this page (the rest of the
  storefront is server-rendered and needs none). Renders a skeleton until the persisted
  build is read back, otherwise the server HTML and first client render disagree.
- **`SlotCard`** — the nine steps: state, chosen parts, per-step violations, picker.
- **`PartPicker`** — the compatible parts for a step from `GET /configurator/parts`, with a
  name/brand filter, an "en stock uniquement" toggle, and the count of what was filtered
  out ("2 pièces masquées : incompatibles avec tes choix") — the proof the builder works.
- **`BuildSummary`** — sticky panel: subtotal, −5%, total, estimated wattage, recommended
  PSU, errors (`À corriger`), warnings (`À vérifier`), missing steps as buttons that jump to
  the step, the included-services line, add-to-cart, and save-and-share.
- **`/configurateur-pc/<shareId>`** — a saved build rendered server-side (noindex), with
  "Reprendre cette configuration" hydrating the store from the build snapshot.
- Mobile: a sticky bottom bar carries the running total and the valid/incomplete badge.

### Fixed along the way 🔧

- **The picker is constrained by earlier steps only** (`selectionIdsBefore`), not by the
  whole selection. Filtering a step against *later* choices made an earlier one
  un-editable: with an SFX power supply chosen, the case step offered exactly one case and
  no way back. CONFIGURATOR_ENGINE.md §4 wants the opposite — the change goes through and
  the now-invalid later part is **flagged, not dropped**. Multi steps still count their own
  parts so the sum rules (total RAM capacity, board slots) keep applying.
- On reload, the builder opens the first *unfilled* step rather than always step 1.

### Verified end to end 🔬

Driven in headless Edge over the DevTools protocol (`Runtime.evaluate` clicking the real
UI), against the live API and the seeded catalog:

| Step | Result |
|---|---|
| pick the Mini-ITX case | step 2 offers **only** the ASRock B650E PG-ITX (3 ATX/mATX boards filtered out) |
| pick that AM5 board | step 3 offers only the two AM5 CPUs — Intel and AM4 gone |
| pick the 7800X3D | error surfaces: "Ce processeur n'est pas livré avec un ventirad…" |
| add cooler / RAM | RAM step offers DDR5 kits only, the DDR4 kit is gone |
| power supply step | offers **only** the SFX unit — the ITX case demands SFX |
| build complete | badge flips to VALIDE, 14 860,00 → −743,00 → **14 117,00 MAD** (exact centimes) |
| save and share | returns a real `shareId`; `/configurateur-pc/<id>` renders the 7 items + totals |
| reload the page | the build comes back from localStorage intact |
| swap the case for the ATX Lancool | the SFX PSU is **kept and flagged** on its step and in `À corriger`; badge → INCOMPLÈTE, add-to-cart disabled |

`tsc --noEmit` clean on all four workspaces.

### Not verified / known gaps

- **`next build` was not run** — a production build while the dev server is up corrupts
  `.next` (see the gotchas above). Every route compiled and served 200 in dev, and
  typecheck is clean, but the production build is still worth running once the dev server
  is stopped.
- **Add to cart still does nothing** — the cart is Phase 3 and needs the replica set. The
  button is enabled only on a valid build and then explains that; `TODO(spec)` in
  `BuildSummary` marks where the cart action goes.
- The saved build is anonymous unless the visitor is logged in (`POST /configurator/builds`
  already attaches `userId` when a token is sent — the storefront has no login UI yet).

### Next up ⏭️

1. Cart + checkout + orders (Phase 3) — needs MongoDB as a replica set for atomic stock
   deduction. This is now the last thing between the site and taking money.
2. Admin dashboard (Phase 2): product CRUD, attribute forms, Cloudinary upload to replace
   the press-shot photography.
3. Auth UI (login/register/account) so builds and orders attach to a customer.

## Session 6 — 2026-08-21

### Done ✅ — cart, checkout and orders (ROADMAP Phase 3)

The site can now take an order end to end: catalog or configured PC → basket → checkout →
order written, stock deducted, confirmation page.

**API**

- `schemas/order.schema.ts` — DATA_MODEL.md §7 in full: contact, snapshotted lines
  (`product` or a whole `build`), shipping, payment, status + `statusHistory`,
  `idempotencyKey`, `publicToken`.
- **`cart/`** — `POST /cart/validate` re-prices and stock-checks every line (a build is
  re-evaluated through the compatibility engine and its scarcest part decides
  availability); `POST /checkout/quote` returns shipping cost, total and French notes.
  `CartService.priceLines` is the single pricing path — orders call the same function, so
  the quote the customer sees and the order that gets written cannot drift.
- **`orders/`** — `POST /orders` (guest or logged-in), `GET /orders` (own history),
  `GET /orders/:orderNumber`.
  - **Stock deduction is the guarded `findOneAndUpdate`** the spec demands:
    `{ _id, stock: { $gte: qty } }` + `$inc: -qty`, one atomic operation per product, so the
    last unit can never be sold twice. Inside a transaction when the deployment is a
    replica set; on a standalone `mongod` it falls back to the same guarded updates with
    **compensating restock** if a later line fails, and logs a warning telling you to move
    to a replica set. Every movement writes an `inventorylogs` row.
  - Order numbers come from an atomic counter (`RGI-2026-000003`), never from a count.
  - `Idempotency-Key` is honoured: a retried submit returns the first order.
  - Guests read their own order with a `publicToken` — sequential numbers are guessable,
    so the number alone is not enough (a small, deliberate extension of API_SPEC.md).
- **CMI is refused, not faked.** Without `CMI_MERCHANT_ID` the API rejects a card order in
  French rather than creating a "pending" order the customer believes is paid. COD is fully
  live. The card option is visible but disabled in the UI.
- `packages/types/src/shipping.ts` — zones, costs and the free-delivery threshold as data
  (`TODO(spec)`: the client still has to confirm the tariff).

**Storefront**

- `store/cart.ts` (Zustand + persist) — lines hold a display snapshot, but only ids and
  quantities are ever sent; the API re-prices everything.
- Add to cart from the product page (with the quantity stepper), from any product card in
  a grid, and from the configurator (the whole build becomes one line).
- Header cart badge with the article count (mount-guarded, no hydration mismatch).
- `/panier` — lines re-priced by `/cart/validate` on every change, per-line problems in
  red, quantity steppers, subtotal.
- `/commande` — contact, delivery vs pickup, address, payment, notes; live quote; one
  idempotency key per form; French field validation client-side and server-side.
- `/commande/confirmation/<orderNumber>?token=…` — order number, status, payment, address,
  items, totals. All three pages are `noindex` and already covered by robots.txt.

### Verified end to end 🔬

Driven in headless Edge over CDP against the live API, plus direct API checks:

| Check | Result |
|---|---|
| add from product page / from a grid card | badge counts 1 then 2 |
| `/panier` | both lines re-priced by the API, subtotal 4 369,00 MAD |
| checkout quote, Marrakech | "Livraison sous 48 h", offerte (basket over 3 000 MAD) |
| submit | order **RGI-2026-000003**, cart cleared, confirmation page rendered |
| stock | fan 37 → 36, GPU 9 → 8, one `inventorylogs` row each |
| configured PC | resume shared build → add to cart → one "PC sur mesure · 7 composants" line at 14 117,00 MAD |
| build order via API | all **7 parts** deducted by 1, 7 inventory logs, −5% carried into the order |
| oversell (7 of a case with stock 5) | 409 "Stock insuffisant : 5 unité(s) disponible(s)." |
| same `Idempotency-Key` twice | same order returned, stock deducted **once** |
| `GET /orders/:n` without token / with token | 403 / 200 |

`tsc --noEmit` clean on all four workspaces; the 42 engine tests still pass.

### Fixed along the way 🔧

- **`Address` contract mismatch.** `@rgi/types` `Address` carries `label` and `isDefault`,
  but `AddressDto` did not declare them, so the API's `forbidNonWhitelisted` rejected every
  real checkout ("property isDefault should not exist"). The DTO now accepts the full
  shared shape — caught only because the flow was driven through the actual UI.

### Known gaps

- **Still no transactions locally** (standalone mongod) — the fallback covers dev, but
  convert to a replica set (or point at Atlas) before launch: `apps/api/README.md`.
- **CMI not integrated** — needs the client's merchant id, key and callback URL.
- No order e-mail/SMS yet, no admin order management (Phase 2), no customer login UI, so
  order history (`GET /orders`) has no screen.
- `next build` still not run in this session (dev server up).

### Next up ⏭️

1. Admin dashboard (Phase 2): products, stock, and **order management** — the client needs
   to see and progress these orders.
2. Auth UI so customers keep an order history.
3. CMI once credentials exist; order confirmation e-mail.

## Session 7 — 2026-08-21

### Done ✅ — MongoDB Atlas + the admin dashboard (ROADMAP Phase 2)

**Atlas.** `MONGODB_URI` now points at the client's Atlas cluster (`.env`, gitignored; the
old local URI is kept in `.env.backup-local`). Atlas is a replica set, so **order placement
runs in a real transaction** — the standalone fallback from session 6 is no longer the path
taken in dev. Atlas was seeded from scratch: 16 categories, 76 attribute definitions, 12
rules, 43 products, admin account.

- **Fixed:** the first order on a fresh database could fail *after* taking its order
  number, because MongoDB refuses to create a collection inside a transaction on shared
  clusters. `OrdersService.ensureCollections()` now creates `orders`, `inventorylogs` and
  `counters` up front, once per process.

**API — `modules/admin/`** (staff-only, `@Roles('staff')` on the controller)
- `GET /admin/stats` — orders today / 7 days, revenue, pending count, low stock, top
  products, active flash deals.
- `GET /admin/orders` (status / payment / free-text search / pagination), `GET /admin/orders/:id`,
  `PATCH /admin/orders/:id/status`, `PATCH /admin/orders/:id/payment`.
  Transitions are checked against the shared `ORDER_STATUS_FLOW`; **cancelling restocks
  every unit** (products and each part of a build) and writes an `inventorylogs` row.
- `GET /admin/products` and `GET /admin/products/:id` — the storefront only ever lists
  `active` products; staff need drafts and archives too.

**Storefront layout split.** The shop chrome moved into a `(boutique)` route group so
`/admin` does not inherit the header and footer. No URL changed.

**Web — `/admin`**
- **Session in httpOnly cookies**, never localStorage: `middleware.ts` refuses `/admin/*`
  without a session *before* a page renders (ADMIN_DASHBOARD.md §1) and silently rotates
  the 15-minute access token with the refresh token, skipping RSC/prefetch requests so two
  parallel refreshes cannot trip the API's token-reuse detection. Login and logout are
  route handlers; a `customer` account is refused with a clear French message.
- Shell with sidebar, staff name/role, dashboard / commandes / produits.
- **Dashboard**: KPI tiles, five latest orders, low-stock list, best sellers, quick actions.
- **Orders**: filterable table (status, payment, search, pagination) → detail with items
  (builds expandable to their parts), customer, address, totals, status history, and the
  action panel offering only the transitions the flow allows. Cancelling asks first.
- **Products**: filterable table with inline stock correction, and the create/edit form —
  **the dynamic attribute form is the core feature**: choosing a category renders that
  category's own typed fields from `attributedefinitions` (enum → select, multi-enum →
  chips, number → numeric + unit, boolean → oui/non), with required markers.

### Verified end to end 🔬

Driven in headless Edge over CDP against Atlas:

| Check | Result |
|---|---|
| `/admin` while signed out | redirected to `/admin/login?suivant=/admin` |
| login as `admin@rgiservice.ma` | dashboard renders; `document.cookie` is **empty** (httpOnly) |
| KPIs | 4 orders today, 435,00 MAD revenue — matches the orders actually placed |
| orders table | number, customer, date, status, payment, total; search by order number works |
| status change | pending → **Confirmée**, history appended, next actions become En préparation / Annulée |
| cancel an order | warning shown, then **ANNULÉE** and fan stock 35 → **37** (2 units restocked) |
| product edit | category-specific fields render pre-filled (Processeur, Mémoire, Stockage, Usage) |
| create a product | new GPU saved from the form → **live in the public catalogue**, `isConfiguratorPart: true`, attributes stored (archived again afterwards) |
| bad attributes via API | missing required → *« L'attribut "Puce graphique" est obligatoire. »*; unknown key → *« Attribut inconnu pour cette catégorie »* |

`tsc --noEmit` clean on all four workspaces.

### Not built yet (ADMIN_DASHBOARD.md leftovers)

- Categories & attribute-definition CRUD (§3), compatibility-rule editing (§4), user/role
  management, CSV import/export (§2), flash-deal scheduling (§6), bulk actions.
- Image upload is a **URL list**, not a Cloudinary widget (§2.5) — still waiting on the
  Cloudinary account.
- `next build` still not run (dev server up).

### Next up ⏭️

1. Cloudinary + real image upload in the product form.
2. Categories / attribute definitions / compatibility rules CRUD, then users & roles.
3. Customer auth UI (login, account, order history), order confirmation e-mail.
4. CMI once the client provides merchant credentials.

## Session 8 — 2026-08-21

### Done ✅ — the production build, finally run

Sessions 5, 6 and 7 each closed with *"`next build` still not run (dev server up)"*. No dev
server was running this time, so it was run for real, against the live API on Atlas.

| Check | Result |
|---|---|
| `npm run typecheck --workspaces` | clean on all four workspaces |
| `npm test --workspace=@rgi/config-engine` | **42 passed** |
| `npm run build --workspace=@rgi/api` (`nest build`) | clean |
| `npm run build --workspace=@rgi/web` (`next build`) | **clean — 21 routes**, 17 static pages generated, no OneDrive corruption |
| First Load JS shared | 87.2 kB; heaviest route `/configurateur-pc` at 128 kB |

Smoke-tested against `next start` (production bundle, not dev) + the API on Atlas:
`/` 200, `/composants/cartes-graphiques` 200, `/configurateur-pc` 200, `/panier` 200,
`/commande` 200, `/admin` **307 → login** (middleware gate holds in production),
`/sitemap.xml` 200 with **61 URLs**, `/robots.txt` 200, `/produit/inexistant` **404**.

**Nothing was changed** — this session was verification only. The gap is closed: the
project builds and serves in production mode.

### State of the repo

- **Untracked.** `git ls-files` returns nothing for this folder — not one commit yet, and
  `C:\Users\MOURAD` is one big git repo over every project (never `git add -A` here).
- `.env` points at Atlas. **Cloudinary is now configured** (below); **CMI keys are still
  missing** and remain blocked on the client.

### Next up ⏭️ (unchanged, in priority order)

1. ~~Media module~~ — **built, see Session 9.**
2. Customer auth UI (login / compte / order history) — the API is live, no screens exist.
3. Admin leftovers: categories, attribute definitions, compatibility rules, users, CSV.
4. CMI once credentials exist; order confirmation e-mail.
5. Phase 5: GA4 + consent banner (no analytics in the codebase at all), real NAP in the
   footer + `LocalBusiness` JSON-LD, buying-guide content.

### Cloudinary credentials wired 🔑

The account is **shared with the `clothes` project** (`ddmfn5mwi`, Free plan, same developer
account) at Mourad's request — no separate Rgi Service account exists yet.

- `.env` now carries `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` / `_UPLOAD_PRESET`
  / `_FOLDER`, plus `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
- **`CLOUDINARY_FOLDER=rgi-service/products` is new.** One Cloudinary account holding two
  clients' catalogs needs a namespace, so every Rgi Service upload must be scoped to this
  folder. Typed in `configuration.ts` and documented in `.env.example`.
- **Verified:** the Cloudinary `usage` endpoint authenticates (Free plan, ~3.3 of 25 monthly
  credits used, 2 151 objects already stored by the boutique), and `cloudinary.api.ping()`
  from inside the **built** API returns `ok` with the config the app actually loads.
- **`.gitignore` hardened.** It ignored `.env` but not `.env.backup-local` or any other
  `.env.*`, and this folder sits inside the one big `C:\Users\MOURAD` repo — an untracked
  secret one `git add` away from being committed. Now `.env.*` is ignored, with
  `!.env.example` re-included.

⚠ **Before launch:** move Rgi Service onto the client's own Cloudinary account. On a shared
Free plan another project's bandwidth spike can throttle this shop's images, and the client
cannot be handed credentials that also unlock a different client's media. The upload preset
`rgi_service_products` still has to be created in the Cloudinary console.

### The real logo is in 🎨

The client supplied `logo.jpeg` (a photo of the shop sign) and **`Logo2023rgi.pdf`** (the
vector artwork: the "RGI" wordmark with its crescent and pixel squares, white on black).
The placeholder gradient "R" square is gone from every surface.

**`scripts/build-logo.mjs`** (`npm run logo`) turns the PDF into every asset the site needs,
so the artwork has exactly one source of truth and is reproducible:

- `pdftocairo -svg` traces the PDF without rasterising it — the result is 25 real paths.
- It drops the black backdrop, keeps the 21 white paths, then **discards 10 stray paths**
  that pdftocairo emits below the artwork (a second, invisible white-on-white copy plus a
  speck at the page foot). They are found by bounding box, not by index.
- The ink bounding box is measured by rasterising and scanning alpha, then baked into the
  `viewBox` — so the file has no invisible padding to fight in CSS. Lockup is 2.139:1.
- Outputs: `public/logo-rgi.svg`, `src/components/brand/LogoMark.tsx` (inline, so it
  inherits `currentColor` and costs no request), `src/app/icon.png` (favicon),
  `src/app/apple-icon.png`, `public/logo-rgi.png` (Organization JSON-LD — Google's logo
  guidelines want a raster, not an SVG) and `public/og-default.png` (the share card).

**`components/brand/Logo.tsx`** is the lockup used everywhere: the mark with "Service"
**stacked underneath**, matching the reference the client sent
(`logo should be look like this.jpeg`). An earlier pass set the two side by side; the
reference settled it. Now on the header, the footer, the admin sidebar and the admin login.

"Service" is **live text**, not artwork — the PDF has no "Service" — so it stays selectable
and translatable (CLAUDE.md §6 wants Arabic later). The reference letters are wide, squared
and rounded: **Eurostile**. Eleven Google Fonts were rendered against the client's photo
before picking **Orbitron 700**, the only one matching on width *and* squareness (Play and
Titillium are too round, Michroma too light, Exo 2 too narrow). It is loaded as
`--font-wordmark` with `display: 'block'`, so the lockup never flashes in a fallback face,
and it is scoped to the logo — `font-wordmark` in Tailwind, never body copy.

Mixed case, not uppercase: the artwork reads "Service", and the first attempt shipped
"SERVICE" until the reference was checked side by side.

- The mark is deliberately set **taller than the wordmark's cap height** (38 px against
  21 px type). The artwork spends its top and bottom on the pixel squares and the crescent,
  so the letters only fill the middle band; matching the box heights made "RGI" look tiny
  next to "Service". Checked in a browser, not by arithmetic.
- Open Graph + `twitter:card` now point at the generated share card, and the `Organization`
  node finally has a `logo`.

**A monogram was tried and abandoned.** Cropping to the crescent + pixels + R gave a nearly
square favicon, but the crescents are not designed to be separated from the letters and the
result rendered as a solid blob. The favicon uses the full lockup on the brand background
instead — shipping subtly wrong brand artwork is worse than a slightly small favicon.

**Verified** against a production build (`next build` clean, 19 static pages) served by
`next start` + the API on Atlas: the header lockup renders correctly at 1400 px wide, the
admin login lockup renders, the homepage carries **two** instances (header + footer), and
`/icon.png` `/apple-icon.png` `/logo-rgi.svg` `/logo-rgi.png` `/og-default.png` all return
200 with the right content types. `tsc --noEmit` clean on all four workspaces.

⚠ The PDF holds the **RGI mark only** — no "Service", and no colour variant. If the client
has an official colour version or a lockup that includes "Service", it should replace this.


### Floating WhatsApp + phone 📞

The client's number — **+212 661-827969** — is now live on the storefront.

- **`lib/contact.ts` is the single source of truth.** The number is stored once in E.164
  digits and every form is derived from it: `wa.me` refuses spaces and punctuation, `tel:`
  tolerates them, and only the display string is written for humans. `whatsappUrl()`
  URL-encodes the pre-filled message — an unencoded newline or `&` silently truncates it on
  WhatsApp's side.
- **`components/layout/ContactFab.tsx`** — fixed bottom-right on every storefront page,
  mounted in the `(boutique)` layout so `/admin` never shows it. Plain server-rendered
  `<a>` links: they work before hydration and need no JavaScript. Icon-only pills on
  mobile, icon + label from `sm` up. WhatsApp keeps its own brand green rather than the
  site's violet→cyan — shoppers recognise the mark by its colour.
- The footer's contact column now carries the real number and a WhatsApp link; the address,
  e-mail and hours stay `TODO(spec)` until the client confirms them.
- `Organization` JSON-LD gained `telephone` + a `ContactPoint` (customer service, MA,
  fr/ar).
- The configurator's mobile sticky bar got `pr-[76px]` so its right end clears the buttons
  — they share that corner.

**Verified** on a production build served by `next start`: `wa.me/212661827969?text=…`
correctly percent-encoded, `tel:+212661827969`, `"telephone":"+212661827969"` in the
JSON-LD, and screenshots at 1400 px (labelled pills) and 560 px (icon-only circles).

### Session 8 close-out

`tsc --noEmit` clean on all four workspaces, **42 engine tests pass**, `next build` clean
(23 routes, 19 static pages — `/icon.png` and `/apple-icon.png` are new routes).

⚠ Still open, unchanged: CMI credentials, the media/upload module, customer auth UI,
categories + rules CRUD, GA4/consent, and the real NAP for `LocalBusiness`.


## Session 9 — 2026-08-21

### Done ✅ — the media module: signed Cloudinary uploads in the admin

`API_SPEC.md` §Media and `ADMIN_DASHBOARD.md` §2.5, end to end. The product form's
newline-separated URL textarea is gone; staff now drag photos in.

**API — `modules/media/`** (staff-only, `@Roles('staff')` on the controller)

- `GET /media/status` → `{ configured }`. The dashboard asks rather than assumes: the
  credentials live on the API, so only the API can answer. Without it the form would show
  a file picker that always fails.
- `POST /media/sign` → a short-lived signature the **browser** uses to POST the file
  straight to Cloudinary. The bytes never touch our server and the API secret never
  reaches the browser.
- `POST /media/attach` → record an uploaded asset on a product (de-duplicates by
  `publicId`, keeps exactly one primary, re-sorts by `order`).
- `DELETE /media/*` → detach from every product that referenced it, then destroy it.

**Two deliberate safety decisions**

- **`assertOwned()` refuses any public id outside `rgi-service/products/`.** This Cloudinary
  account is shared with the `clothes` project — without that guard one malformed request
  could delete a *different client's* photos. Verified: deleting
  `boutique/products/...` returns **403**.
- **Missing credentials are refused in French**, the way CMI already is, rather than
  producing a broken signature that fails inside Cloudinary's response with nothing staff
  can act on.

`MediaService` (Cloudinary) and `MediaAttachService` (Mongoose) are separate so the signing
logic stays readable on its own.

**Web**

- **`/api/admin/media/sign` and `/api/admin/media/delete` are route handlers**, because the
  uploader is a client component and the staff JWT lives in an **httpOnly** cookie it
  cannot read. The handler reads the cookie server-side and forwards it. Delete takes the
  id in the body, not the path: a Cloudinary public id contains slashes and would need
  escaping correctly through two hops.
- **`components/admin/ImageUploader.tsx`** — drag-and-drop or file picker, multi-file,
  thumbnails, set primary, reorder, per-image alt text, remove. Type and size are checked
  client-side (10 MB, JPG/PNG/WebP/AVIF) *and* by Cloudinary.
- **Uploads live in form state until the form is saved**; deleting, by contrast, destroys
  the asset immediately, which is why it confirms first. `local/…` ids (the seeded press
  shots) are dropped from the list without calling Cloudinary — there is no asset behind
  them.
- One signature per file: each carries its own timestamp and Cloudinary rejects a reused
  one once its window closes.
- `formCatalog()` now also returns `uploadEnabled`, so both the create and edit pages get
  it from one place.

### Verified end to end 🔬

Driven over the DevTools protocol against the production build and Atlas — including a
real file pushed through the real `<input type="file">` via `DOM.setFileInputFiles`:

| Check | Result |
|---|---|
| `POST /media/sign` anonymous / as staff | **401** / signature returned |
| real upload with that signature | **200**, asset lands in `rgi-service/products/` |
| admin login → product → drop zone + file input | rendered |
| upload through the real file input | thumbnail appears with the `res.cloudinary.com` URL |
| save the form | redirects to `/admin/produits`; product stores `url`, `publicId`, `alt`, `isPrimary`, `order` |
| open a product with 3 existing press shots | all 3 render, alt text pre-filled, "IMAGE PRINCIPALE" on the first |
| `POST /media/attach` | appended as image 4, existing primary untouched |
| `DELETE` outside our folder | **403** — the boutique's assets are unreachable |
| `DELETE` our own asset | `{deleted:true}`, product references drop to 0, folder empties |

`tsc --noEmit` clean on all four workspaces, **42 engine tests pass**, `nest build` and
`next build` both clean (21 static pages).

**Cleaned up after itself**: every test asset was deleted, the fan product is back to its
3 press shots with the primary intact, and the Cloudinary folder is empty (0 assets).

⚠ The CDN still serves a deleted URL for a while — `invalidate: true` is passed, but edge
purging is not instant. The asset is gone from the account immediately; only the cached
copy lingers.

### Still open

- Categories / attribute-definition / compatibility-rule CRUD, users & roles, CSV
  import/export, flash-deal scheduling, bulk actions (ADMIN_DASHBOARD.md leftovers).
- The 43 seeded press shots are still local files under `/public/products`. They can now be
  replaced through the admin one product at a time; a bulk migration to Cloudinary was not
  written.
- CMI credentials, customer auth UI, GA4 + consent, real NAP for `LocalBusiness`.


## Session 10 — 2026-08-21

### Done — the site is live

| | |
|---|---|
| **Storefront** | https://rgi-service.vercel.app |
| **API** | https://rgi-service-api.vercel.app/api/v1 |
| **Repo** | https://github.com/Mourad96-mh/rgi-service (public) |
| **DB** | MongoDB Atlas — `db: connected` |

**GitHub.** The project got its own standalone repo. This folder sits inside the
`C:\Users\MOURAD` repo whose remote is **AT-DENTAl**, so committing from there would have
pushed every Bureau project to another client's repository. Verified afterwards that the
parent repo is untouched.

Before the first push, every value in `.env` was extracted and all 352 files scanned for
each one, plus a generic sweep for connection strings and tokens. **No live credential
leaked** — only `.env.example` is on the remote. The matches that did appear were dev
defaults already hardcoded in the source.

**Hosting — both on Vercel, not Render.** Mourad deployed the API to Vercel rather than
the Render blueprint. For a demo that is arguably the better call: Render's free tier
sleeps after 15 min and takes ~50 s to wake, while Vercel cold-starts in a second or two.
`render.yaml` stays in the repo as an alternative. Serverless trade-offs accepted: a new
Mongo connection per cold start (Atlas M0 caps at 500) and a less effective 30 s rules
cache. Transactions still work — Atlas is a replica set.

**What broke and why.** The API returned `FUNCTION_INVOCATION_FAILED` on every request:
`NODE_ENV=production` on Vercel, and `env.validation.ts` hard-requires `MONGODB_URI`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`. Reproduced locally before
touching the dashboard.

Setting them via `vercel env add` **timed out after 3 of 13** — the CLI needs one process
spawn per variable per environment, ~39 spawns. Replaced with
**`scripts/push-vercel-env.mjs`**, which posts the whole set to the REST API in one request
with `upsert=true`. Reusable for the next project.

### Fixed along the way

- **CORS was an exact-match list**, so every Vercel preview deployment would have been
  refused. Entries may now carry one wildcard (`https://*.vercel.app`). The wildcard
  matches a single label, so `not-vercel.app.attacker.com` is still rejected — verified in
  production alongside the real origin and a blocked attacker domain.
- **`listen()` now binds `0.0.0.0`** — a PaaS routes to the pod address.
- **The mobile burger menu was clipped to a 72 px sliver.** The header sets
  `backdrop-blur`, and a `backdrop-filter` makes an element a containing block for its
  `position: fixed` descendants — so the drawer's `fixed inset-0` sized against the 72 px
  header instead of the viewport. Measured live: panel 390×72 holding 796 px of content,
  17 links unreachable. Now rendered through a **portal into `document.body`** → 390×844.
  Also added a visible close button (the backdrop strip was ~70 px on a 390 px screen),
  Escape-to-close (it did not close before), focus into the panel and back to the burger,
  `role="dialog"`, `overscroll-contain` and a safe-area pad.
- **Cart steppers were 32×32**, under the 44 px touch guideline — now 44 px on touch, 32 px
  from `sm` up.
- The last footer line sat permanently under the floating contact buttons.

**Admin password rotated.** The seed only ever *creates* the admin, never updates one, so
the documented default could not be changed without
**`scripts/rotate-admin-password.mjs`**. Ran it: old password 401, new one 200, existing
sessions killed. The new password is in `.env` (gitignored), never in the git diff.

### Mobile audit (390×844, live)

Clean: no horizontal overflow on the product page or the cart, nothing rendering past the
viewport, no fixed overlay covering a button. Cart driven end to end — add to cart, badge
to 1, line + unit price + subtotal 5 990,00 MAD, full-width checkout button.

### Open — pick up here

1. **The Xbox Series X carries photos of a white Series S.** The query was right; the
   image ranker scores candidates on border whiteness, so a white console on a white
   background wins. **The other 42 products have not been re-checked for the same failure**
   — that sweep is the first thing to do, and it is a data fix (re-source with explicit
   URLs via `--only=<sku> --force`), not a code one.
2. **Revoke the Vercel token** used for this deployment, at vercel.com/account/tokens.
3. **Hobby plan is non-commercial** per Vercel's terms — fine for a demo, needs Pro (~$20/mo)
   before the shop is really trading.
4. Floating contact buttons overlap page content mid-scroll (inherent to FABs). Fix if
   wanted: hide on scroll-down, show on scroll-up.
5. Unchanged from before: CMI credentials, real product photography, customer auth UI,
   categories/rules CRUD, GA4 + consent, real NAP + `LocalBusiness`, a real domain
   (and then update `NEXT_PUBLIC_SITE_URL`, which the canonicals and sitemap are built from).
