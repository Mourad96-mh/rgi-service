# ROADMAP.md — Phased Build Plan

Build in this order. Each phase should end in something demoable. The configurator (Phase 4)
is the highest-risk item — its compatibility engine is scaffolded with unit tests from the
start, even before its UI is pretty.

## Phase 0 — Foundation (setup)
- Monorepo (`apps/web`, `apps/api`, `packages/types`). See `FOLDER_STRUCTURE.md`.
- NestJS API boots; MongoDB connection via Mongoose; config via env (`.env.example`).
- Next.js App Router boots; Tailwind + shadcn/ui; i18n scaffold (fr default).
- Auth module: register/login, JWT access+refresh, roles (customer/staff/admin), guards.
- Shared types package wired into both apps.
- CI: lint + typecheck + test.

**Done when:** you can register, log in, and hit an authenticated health endpoint.

## Phase 1 — Catalog
- Category + Product + attribute schemas (`DATA_MODEL.md`).
- Category-specific structured attributes (component types) seeded.
- Public endpoints: list categories, list products (paginated + faceted filter), get product.
- Storefront: home, category/listing page with filters, product detail page (SSR + JSON-LD).
- Cloudinary read/display of product images.
- Seed script with sample products across all categories.

**Done when:** you can browse categories, filter, and open product pages that are SSR + SEO-ready.

## Phase 2 — Admin dashboard
- Admin layout (protected, role-gated).
- Product CRUD with **category-driven attribute forms** (`ADMIN_DASHBOARD.md`).
- Cloudinary upload (multi-image, primary, reorder).
- Stock management; flash-deal pricing/scheduling.
- Bulk CSV import/export.
- Staff vs admin permission split.

**Done when:** staff can add/edit/delete products (incl. technical attributes and images)
and they appear correctly on the storefront.

## Phase 3 — Cart & checkout & orders
- Cart (Zustand + persisted; server validation of price/stock at checkout).
- Checkout flow: address, shipping method (delivery zones / in-store pickup), payment method.
- **Payments:** CMI gateway integration + Cash on Delivery.
- Order creation with **atomic stock deduction** (`DATA_MODEL.md` §Inventory).
- Order confirmation, email/notification, order history, admin order management + statuses.

**Done when:** a customer completes a purchase with both COD and CMI, and stock updates safely.

## Phase 4 — Configurator (the differentiator)
- Compatibility engine (`CONFIGURATOR_ENGINE.md`) as a pure, unit-tested module.
- Slot-based builder UI: reactive filtering, running price, running wattage, PSU check.
- Included-services line + −5% discount.
- "Add build to cart" → single custom-build line item that flows through checkout.
- Optional: save/share build via URL.

**Done when:** a user can build a valid PC, is prevented from building an invalid one, and
buys the build. Engine has passing tests for every compatibility rule.

## Phase 5 — SEO, performance, launch
- Full metadata, canonical URLs, sitemap.xml, robots.txt, JSON-LD everywhere (`SEO_STRATEGY.md`).
- Image optimization, caching, Core Web Vitals pass.
- Analytics (GA4 + Search Console), consent banner.
- Local SEO (Google Business Profile, LocalBusiness schema).
- Content: buying guides / blog for organic traffic.
- Pre-launch QA checklist, then launch.

**Done when:** site is indexable, fast, tracked, and passes the launch checklist.

## Suggested milestones
- **M1** (Phases 0–1): browsable catalog.
- **M2** (Phase 2): staff-managed catalog.
- **M3** (Phase 3): can take orders and payments.
- **M4** (Phase 4): configurator live.
- **M5** (Phase 5): SEO'd and launched.
