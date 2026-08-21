# Rgi Service — Build Documentation Pack

A complete specification set for building **Rgi Service**, a Moroccan gaming-PC e-commerce
store with a compatibility-checked **PC configurator** and a self-service **admin dashboard**.

Reference sites (competitors — design/product patterns only, no asset copying):
primary https://casaconfig.ma/ , plus https://techspace.ma/ , https://www.ultrapc.ma/ , and
https://nextlevelpc.ma/module/configurateurpc/displayconfigurator (configurator UX).

## Stack (decided)
Next.js (App Router, TS) · NestJS · MongoDB + Mongoose · Cloudinary · Tailwind/shadcn ·
JWT auth · CMI + Cash-on-Delivery payments · French UI (i18n-ready).

## How to use this pack
Hand this whole folder to the coding assistant. It reads **`CLAUDE.md` first**, then the
`/docs` files as needed. Build in the order defined in `docs/ROADMAP.md`.

## Files
| File | What it covers |
|---|---|
| `CLAUDE.md` | Master context, stack, conventions, build order, engineering rules |
| `.env.example` | All environment variables |
| `docs/DESIGN_SYSTEM.md` | Visual system: colors, fonts, spacing, components (match the mockup) |
| `mockups/homepage.html` | Rendered homepage mockup — the look to build to |
| `docs/DESIGN_REFERENCE.md` | Reference sites + UI/UX patterns to reproduce |
| `docs/PROJECT_SPEC.md` | Features, scope, catalog structure, user stories |
| `docs/ROADMAP.md` | Phased build plan (Phase 0 → 5) |
| `docs/DATA_MODEL.md` | MongoDB/Mongoose schemas + atomic inventory rule |
| `docs/CONFIGURATOR_ENGINE.md` | The PC builder compatibility engine (the hard part) |
| `docs/ADMIN_DASHBOARD.md` | Staff product/order management + dynamic attribute forms |
| `docs/API_SPEC.md` | NestJS REST endpoints |
| `docs/SEO_STRATEGY.md` | Morocco/French SEO plan + implementation checklist |
| `docs/FOLDER_STRUCTURE.md` | Monorepo layout + conventions |

## The three things that make this project non-trivial
1. **The configurator** is a constraint solver, not a form — data-driven compatibility rules,
   built as a pure unit-tested package shared by frontend and backend.
2. **Inventory safety** — stock deduction must be atomic (transactions) so the last unit is
   never oversold. Money is stored as integer centimes.
3. **Structured attributes** entered by staff in the admin are the single source of truth that
   also powers faceted filtering and the configurator.

Start with `CLAUDE.md`.

## Déploiement

Voir **[DEPLOY.md](DEPLOY.md)** : l'API NestJS sur Render (`render.yaml`), la vitrine
Next.js sur Vercel, MongoDB sur Atlas. L'ordre compte — la vitrine appelle l'API côté
serveur, donc l'API doit être en ligne en premier.
