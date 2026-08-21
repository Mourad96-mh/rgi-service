# CLAUDE.md — Project Context for the Coding Assistant

> Read this file first. It is the entry point for building **Rgi Service**, a Moroccan
> gaming-PC e-commerce store with a custom PC configurator and a self-service admin
> dashboard. All detailed specs live in `/docs`. Follow them exactly; when something is
> unspecified, prefer the simplest solution consistent with the conventions below and
> leave a `// TODO(spec):` note.

> **Brand:** the site is **Rgi Service**. The competitor sites named below (casaconfig.ma and
> others) are design/product references only — never copy their assets, logo, copy, or images.

---

## 1. What we are building (one paragraph)

Rgi Service is an e-commerce website that sells gaming PCs,
laptops, workstations, PC components, peripherals, consoles, and monitors in Morocco.
The signature feature is a **PC Configurator**: a "build your own PC" tool that only lets
the customer combine parts that are physically compatible (matching CPU socket,
DDR4/DDR5 RAM, sufficient PSU wattage, case/GPU/cooler clearance, right form factor),
shows a live running price and power draw, and turns the finished build into a single
cart item (with a −5% configurator discount and included assembly service). The client's
staff manage the whole catalog through an **admin dashboard** — no developer needed to add
products.

**Reference sites — fetch them before building UI.** Primary: **https://casaconfig.ma/** (the
look the client wants + the product range to match). Also: https://techspace.ma/ ,
https://www.ultrapc.ma/ , and https://nextlevelpc.ma/module/configurateurpc/displayconfigurator
(study this one for the **configurator** UX). Use `WebFetch` to study layout, navigation,
listings, filters, spec tables, and the builder flow, then build original **Rgi Service** UI
that improves on them. See `docs/DESIGN_REFERENCE.md`. Reproduce the *patterns* — never copy
any site's assets, logo, copy, or images.

**Visual design — match the mockup.** The intended look is a modern, dark, premium gaming
aesthetic with a violet→cyan gradient accent. A rendered reference homepage is at
`mockups/homepage.html`, and all design tokens (colors, fonts, spacing, components) are in
`docs/DESIGN_SYSTEM.md`. Build the real UI to match that look; put the tokens in the Tailwind
theme and reuse the same components everywhere (storefront **and** admin).

## 2. Tech stack (DECIDED — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | SSR/SSG for SEO; storefront + configurator UI |
| Styling | **Tailwind CSS** | + shadcn/ui for components |
| Backend | **NestJS (TypeScript)** | Modular REST API |
| Database | **MongoDB + Mongoose** | See `docs/DATA_MODEL.md` |
| Images | **Cloudinary** | Upload, optimization, CDN, WebP/AVIF |
| Auth | **JWT (access + refresh)** | Roles: customer, staff, admin |
| Search/Filter | MongoDB queries + indexes (Meilisearch optional later) | Faceted filtering |
| Payments | **CMI** (Moroccan cards) + **Cash on Delivery** | COD is essential in Morocco |
| State (frontend) | React Query (server state) + Zustand (cart/configurator) | |
| Validation | `class-validator` / `zod` DTOs | Never trust client input |
| Hosting | Frontend: Vercel. API + DB: VPS or Atlas, EU region (low latency to Morocco) | |

**Language of the site:** French first (i18n-ready for Arabic later). Currency: MAD (Moroccan Dirham).

## 3. Repository shape

Monorepo (see `docs/FOLDER_STRUCTURE.md` for the full tree):

```
/apps
  /web      → Next.js storefront + admin dashboard
  /api      → NestJS backend
/packages
  /types    → shared TypeScript types/DTOs used by both apps
/docs       → all specification files (read these)
```

## 4. The docs and what each is for

| File | Read it when you are… |
|---|---|
| `docs/DESIGN_SYSTEM.md` | building any UI — exact colors, fonts, spacing, components (match `mockups/homepage.html`) |
| `docs/DESIGN_REFERENCE.md` | building any UI — points to the reference sites + design patterns |
| `docs/PROJECT_SPEC.md` | understanding features, scope, user stories |
| `docs/ROADMAP.md` | deciding what to build first (build in phase order) |
| `docs/DATA_MODEL.md` | creating Mongoose schemas / collections |
| `docs/CONFIGURATOR_ENGINE.md` | building the PC builder + compatibility rules (**the hard part**) |
| `docs/ADMIN_DASHBOARD.md` | building the staff-facing product management UI |
| `docs/API_SPEC.md` | creating NestJS controllers/endpoints |
| `docs/SEO_STRATEGY.md` | anything touching pages, metadata, URLs, content |
| `docs/FOLDER_STRUCTURE.md` | scaffolding folders/files |

## 5. Build order (critical — de-risk the hard part)

1. **Foundation:** monorepo, shared types, DB connection, auth, health check.
2. **Catalog:** categories + products with structured attributes, product & listing pages.
3. **Admin dashboard:** product CRUD, structured attribute forms, image upload, roles.
4. **Configurator:** compatibility engine + reactive UI + "build → cart" (highest risk; build behind unit tests from day one).
5. **Commerce:** cart, checkout, CMI + COD, orders, atomic stock deduction.
6. **SEO + polish:** metadata, sitemap, structured data, performance, analytics, launch.

## 6. Non-negotiable engineering rules

- **Inventory safety:** stock deduction on order placement MUST be atomic (see
  `DATA_MODEL.md` §Inventory). Never let two customers buy the last unit. Use a guarded
  `findOneAndUpdate` with a stock condition inside a transaction.
- **Money:** store prices as **integers in centimes** (1 MAD = 100 centimes). Never use
  floats for money.
- **Compatibility is data, not code:** compatibility rules live in the DB / a rules
  config, not hardcoded `if` chains, so staff can extend the catalog without a developer.
- **Structured attributes drive the configurator:** the same typed fields staff enter in
  the admin (socket, ram_type, tdp, form_factor, …) are exactly what the configurator
  reads. One source of truth.
- **Type safety end to end:** shared DTOs in `/packages/types`. Frontend and backend
  import the same types.
- **SEO by default:** every product/category page is server-rendered with proper
  `<title>`, meta description, canonical URL, and JSON-LD (see `SEO_STRATEGY.md`).
- **Validate all input** on the API with DTOs. Assume the client is hostile.
- **French UI strings** go through i18n keys, never hardcoded, so Arabic can be added later.
- **Tests:** the configurator compatibility engine and the order/stock logic must have
  unit tests. Everything else: tests where reasonable.

## 7. Definition of done for any feature

- Server-rendered where it affects SEO. Types shared, not duplicated. Input validated.
- Money in centimes. Errors handled and surfaced to the UI in French.
- For catalog/config/orders: a passing test. For pages: correct metadata + Lighthouse OK.
