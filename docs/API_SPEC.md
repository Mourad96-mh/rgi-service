# API_SPEC.md — NestJS REST API

Base URL: `/api/v1`. JSON. Auth via `Authorization: Bearer <accessToken>`. All list
endpoints paginate (`?page=&limit=`, max limit 100) and return `{ data, page, limit, total }`.
Money in responses is **centimes** (frontend formats to MAD). Validate every body with a DTO.

Roles: `public` (no auth), `customer`, `staff`, `admin`.

---

## Auth
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | create customer account |
| POST | `/auth/login` | public | returns access + refresh tokens |
| POST | `/auth/refresh` | public | rotate tokens |
| POST | `/auth/logout` | customer+ | invalidate refresh token |
| GET | `/auth/me` | customer+ | current user profile |

## Categories
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/categories` | public | full tree |
| GET | `/categories/:slug` | public | one category + its attribute definitions |
| POST | `/categories` | admin | create |
| PATCH | `/categories/:id` | admin | update |
| DELETE | `/categories/:id` | admin | delete |

## Attribute definitions
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/attribute-definitions?categoryType=gpu` | public | fields for a category (drives forms + filters) |
| POST/PATCH/DELETE | `/attribute-definitions/:id?` | admin | manage |

## Products
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/products` | public | list + **faceted filters** (see below) |
| GET | `/products/:slug` | public | product detail |
| GET | `/products/search?q=` | public | text search + autocomplete |
| POST | `/products` | staff | create (validates attributes vs category) |
| PATCH | `/products/:id` | staff | update |
| DELETE | `/products/:id` | staff | archive/delete |
| POST | `/products/import` | staff | bulk CSV/Excel import (multipart) |
| GET | `/products/export` | staff | CSV/Excel export |

**Faceted filter query params** on `GET /products`:
`?category=&brand=&minPrice=&maxPrice=&inStock=true&sort=price_asc`
plus attribute filters namespaced as `attr.<key>=`, e.g.
`?category=cartes-graphiques&attr.chipset=RTX5090&attr.ram_type=DDR5`.
Response includes an `availableFacets` object (each filterable attribute + its value counts)
so the frontend can render filter sidebars dynamically.

## Media (Cloudinary)
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/media/sign` | staff | return a signed Cloudinary upload signature (upload direct from browser) |
| POST | `/media/attach` | staff | attach uploaded `{url, publicId}` to a product |
| DELETE | `/media/:publicId` | staff | remove asset |

> Prefer **signed direct-to-Cloudinary uploads** from the admin browser; the API only signs
> and records the resulting public id/url. Keep the Cloudinary secret server-side.

## Configurator
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/configurator/slots` | public | slot definitions + order |
| GET | `/configurator/parts?slot=motherboard&selection=<encoded>` | public | compatible parts for a slot given current selection |
| POST | `/configurator/validate` | public | run engine authoritatively, return `BuildEvaluation` |
| POST | `/configurator/builds` | public | save a build, returns `shareId` |
| GET | `/configurator/builds/:shareId` | public | load a shared build |

## Cart & checkout
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/cart/validate` | public | re-price + stock-check cart items (incl. builds) |
| POST | `/checkout/quote` | public | compute shipping + totals for address/method |
| POST | `/orders` | public/customer | place order (atomic stock deduction) |
| GET | `/orders/:orderNumber` | customer/owner | order status |
| GET | `/orders` | customer | own order history |

## Payments
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/payments/cmi/initiate` | public | create CMI payment session/redirect |
| POST | `/payments/cmi/callback` | public (CMI) | CMI server callback → mark order paid/failed (verify signature) |
| — | (COD) | — | order created directly with `payment.method='cod'`, status pending |

## Admin — orders & inventory
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/admin/orders` | staff | all orders, filters |
| PATCH | `/admin/orders/:id/status` | staff | change status (writes statusHistory; cancel restocks) |
| PATCH | `/admin/orders/:id/payment` | staff | mark paid/failed/refunded |
| GET | `/admin/stats` | staff | dashboard KPIs |
| PATCH | `/admin/products/:id/stock` | staff | adjust stock (logs to inventorylogs) |

## Admin — users & rules
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET/PATCH | `/admin/users/:id?` | admin | list/manage users + roles |
| GET/POST/PATCH | `/admin/compatibility-rules/:id?` | admin | manage configurator rules |

## Cross-cutting
- **Validation:** every write uses a `class-validator` DTO; reject unknown fields.
- **Errors:** consistent shape `{ statusCode, message (fr), error }`.
- **Rate limiting** on auth + payment endpoints.
- **Security:** helmet, CORS allowlist, bcrypt/argon2 password hashing, signed CMI
  callbacks verified, no secrets client-side.
- **Idempotency:** `POST /orders` accepts an `Idempotency-Key` header to avoid double orders.
