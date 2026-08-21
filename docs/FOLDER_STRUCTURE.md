# FOLDER_STRUCTURE.md — Monorepo Layout

Monorepo managed with **pnpm workspaces** (or npm/yarn workspaces + Turborepo). Frontend and
backend share types from `packages/types`. The compatibility engine is a shared package so
both apps run the exact same logic.

```
rgi-service/
├─ CLAUDE.md
├─ README.md
├─ .env.example
├─ package.json                 # workspace root, scripts (dev/build/lint/test)
├─ pnpm-workspace.yaml
├─ turbo.json                   # optional (Turborepo pipeline)
│
├─ docs/                        # all specs (this folder)
│
├─ packages/
│  ├─ types/                    # shared DTOs & domain types (imported by web + api)
│  │  └─ src/{product,order,build,configurator,user}.ts
│  └─ config-engine/            # PURE compatibility engine (unit-tested)
│     └─ src/{engine.ts, rules.ts, index.ts}
│     └─ test/engine.spec.ts
│
├─ apps/
│  ├─ api/                      # NestJS backend
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ common/             # guards, interceptors, filters, pipes, decorators
│  │  │  ├─ config/             # env, mongoose, cloudinary config
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/            # jwt, roles, strategies, guards
│  │  │  │  ├─ users/
│  │  │  │  ├─ categories/
│  │  │  │  ├─ attribute-definitions/
│  │  │  │  ├─ products/        # incl. import/export, faceted filtering
│  │  │  │  ├─ media/           # cloudinary sign/attach
│  │  │  │  ├─ configurator/    # uses packages/config-engine
│  │  │  │  ├─ cart/
│  │  │  │  ├─ orders/          # atomic stock deduction, transactions
│  │  │  │  ├─ payments/        # cmi + cod
│  │  │  │  └─ admin/           # stats, order mgmt, rules mgmt
│  │  │  └─ schemas/            # Mongoose schemas (or per-module)
│  │  ├─ test/
│  │  └─ package.json
│  │
│  └─ web/                      # Next.js (App Router) storefront + admin
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (storefront)/
│     │  │  │  ├─ page.tsx                       # home
│     │  │  │  ├─ [category]/page.tsx            # listing + facets (SSR)
│     │  │  │  ├─ produit/[slug]/page.tsx        # product detail (SSR + JSON-LD)
│     │  │  │  ├─ configurateur-pc/page.tsx      # builder
│     │  │  │  ├─ panier/page.tsx                # cart
│     │  │  │  ├─ commande/page.tsx              # checkout
│     │  │  │  ├─ compte/...                     # account/orders
│     │  │  │  └─ blog/[slug]/page.tsx           # guides
│     │  │  ├─ admin/                            # protected dashboard
│     │  │  │  ├─ layout.tsx                     # role-gated
│     │  │  │  ├─ produits/...                   # product CRUD + dynamic attr forms
│     │  │  │  ├─ commandes/...                  # order mgmt
│     │  │  │  ├─ categories/... attributs/...   # admin
│     │  │  │  └─ regles/...                     # compatibility rules
│     │  │  ├─ sitemap.ts
│     │  │  └─ robots.ts
│     │  ├─ components/          # ui (shadcn), product cards, filters, configurator UI
│     │  ├─ features/            # cart (zustand), configurator client, admin forms
│     │  ├─ lib/                 # api client, cloudinary loader, seo (json-ld), i18n
│     │  ├─ locales/            # fr/ (ar/ later)
│     │  └─ styles/
│     └─ package.json
│
└─ scripts/
   ├─ seed.ts                   # categories, attribute defs, compatibility rules, sample products
   └─ import-template/          # CSV templates per category
```

## Environment variables — see `.env.example`

Key groups:
- **API:** `MONGODB_URI` (replica set for transactions), `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `PORT`, `CORS_ORIGINS`.
- **Cloudinary:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `CLOUDINARY_UPLOAD_PRESET`.
- **CMI:** `CMI_MERCHANT_ID`, `CMI_STORE_KEY`, `CMI_GATEWAY_URL`, `CMI_CALLBACK_URL`.
- **Web:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`.

## Conventions
- TypeScript strict everywhere. ESLint + Prettier. Conventional commits.
- Shared types are the contract — never redefine a DTO in an app.
- The config-engine package has **no** framework/DB imports (keep it pure + tested).
- Seed script must produce a working catalog + rules so the site is demoable immediately.
