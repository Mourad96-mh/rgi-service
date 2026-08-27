# `@rgi/api` — Rgi Service REST API

NestJS + Mongoose. Base URL `/api/v1` (see `docs/API_SPEC.md`).

## Run it

```bash
npm install                 # from the repo root (npm workspaces)
npm run seed --workspace=@rgi/api   # catalog + rules + admin account
npm run dev --workspace=@rgi/api    # http://localhost:4000/api/v1
```

Environment comes from the repo-root `.env` (copy `.env.example`). The API also reads an
`apps/api/.env` if you need per-app overrides.

## MongoDB — replica set required for orders

Stock deduction on order placement must be **atomic** (`docs/DATA_MODEL.md` §7), which
means a transaction, which means MongoDB must run as a **replica set**. Atlas is one by
default; a local standalone `mongod` is not.

The catalog, the configurator and auth all work fine against a standalone instance, so
local development can start there — but Phase 3 (orders) cannot. To convert the local
Windows service to a single-node replica set, add to
`C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg`:

```yaml
replication:
  replSetName: rs0
```

then restart the `MongoDB` service and run `rs.initiate()` once in `mongosh`, and set
`MONGODB_URI=mongodb://127.0.0.1:27017/rgiservice?replicaSet=rs0`.

## WhatsApp alert on a new order

`POST /orders` pings the shop's WhatsApp as soon as an order is committed
(`modules/notifications/whatsapp.service.ts`), through the free CallMeBot relay. It carries
the order number, the customer's phone, the address, every line — including each part of a
configured PC — the total to collect and the delivery note.

It is **fire-and-forget on purpose**: the order is already in the database before the call
starts, it is never awaited, and the service swallows its own errors. A relay that is down,
slow or rate-limited costs a notification, never a sale. It is also independent of the
« Envoyer ma commande sur WhatsApp » button on the confirmation page, which sends the same
information from the *customer's* account when they press Send — the two paths reach the
same inbox and either one can fail alone.

Set `SHOP_WHATSAPP_NUMBER` and `CALLMEBOT_API_KEY` (see `.env.example` for how to get the
key). With no key the feature is inert and logs one warning per process.

CallMeBot is unofficial and rate-limited to roughly one message every few seconds per
handset — fine for order volume, not a channel to build on. Moving to the official
WhatsApp Cloud API later is a change to `send()` alone.

## Shape of the code

```
src/
  config/        env loading + fail-fast validation
  common/        guards (JWT + roles), decorators, error filter, pagination DTO
  schemas/       Mongoose schemas (docs/DATA_MODEL.md)
  modules/
    auth/                  register / login / refresh rotation / logout / me
    users/
    health/                public, authenticated and staff-only checks
    categories/            tree, detail (+ its attribute definitions), admin CRUD
    attribute-definitions/ the typed fields that drive forms, facets and compatibility
    products/              listing with faceted filters, search, staff CRUD, stock
    configurator/          slots, compatible parts, validate, save/load builds
  seed/          idempotent seed: categories, attributes, the 12 rules, 43 products
```

Two rules the code follows everywhere:

- **Money is centimes** (integers). `price: 429000` is 4 290,00 MAD.
- **Compatibility is data.** The engine (`@rgi/config-engine`) evaluates six operators;
  the rules themselves live in `compatibilityrules` and are admin-editable.

## Auth

Global `JwtAuthGuard` — every route requires a Bearer access token unless marked
`@Public()`. `@Roles('staff' | 'admin')` adds a minimum role (an admin passes a `staff`
check). Refresh tokens are hashed in the user document and rotated on every refresh;
reuse of an old token drops the session.

The seed creates `admin@rgiservice.ma` (password from `SEED_ADMIN_PASSWORD`, default
`Admin123!` — change it).
