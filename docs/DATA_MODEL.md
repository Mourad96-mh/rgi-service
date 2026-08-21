# DATA_MODEL.md — MongoDB + Mongoose

Database: **MongoDB**, ODM: **Mongoose**. All money is stored as **integer centimes**
(1 MAD = 100). All schemas have `timestamps: true`.

Design principle: products of different categories share one collection but carry a
flexible, **typed `attributes` object** validated per category. The configurator reads
those attributes. Keep attribute keys stable and machine-readable (snake_case).

---

## Collections overview

- `categories` — the catalog tree + which attribute schema applies.
- `attributedefinitions` — per-category typed attribute definitions (drives admin forms + filters + configurator).
- `products` — everything sold (also configurator parts).
- `builds` — saved custom PC configurations.
- `compatibilityrules` — data-driven compatibility rules for the configurator.
- `users` — customers + staff + admins.
- `carts` — optional server-side carts (or client-only; validated at checkout).
- `orders` — placed orders + line items + payment/shipping state.
- `inventorylogs` — audit trail of stock movements (optional but recommended).

---

## 1. Category

```ts
// category.schema.ts
{
  name: { fr: string; ar?: string },      // localized display
  slug: string,                            // unique, url-safe, e.g. "composants/cartes-graphiques"
  parent: ObjectId | null,                 // ref 'Category' for tree
  type: 'component' | 'prebuilt' | 'laptop' | 'peripheral' | 'console' | 'monitor' | 'workstation',
  componentType?: 'cpu' | 'motherboard' | 'ram' | 'gpu' | 'psu' | 'case' | 'cooler'
                | 'storage' | 'fan',       // set when this category is a configurator part type
  configuratorSlot?: string,               // slot id in the builder, e.g. 'cpu'
  image?: string,                          // Cloudinary public id/url
  order: number,                           // sort order in menus
  isActive: boolean,
}
```
Indexes: `slug` unique; `parent`; `componentType`.

## 2. AttributeDefinition

Drives: (a) admin dynamic forms, (b) faceted filters, (c) configurator compatibility fields.

```ts
// attribute-definition.schema.ts
{
  categoryType: string,        // matches Category.componentType or Category.type
  key: string,                 // snake_case machine key, e.g. 'socket', 'ram_type', 'tdp_watts'
  label: { fr: string; ar?: string },
  dataType: 'string' | 'number' | 'boolean' | 'enum',
  unit?: string,               // e.g. 'W', 'mm', 'GB', 'MHz'
  enumValues?: string[],       // for dataType 'enum' e.g. ['AM5','AM4','LGA1700','LGA1200']
  required: boolean,
  filterable: boolean,         // show as a facet on listing pages
  usedInCompatibility: boolean,// read by the configurator engine
  order: number,
}
```
Indexes: `{ categoryType: 1, key: 1 }` unique.

> Seed these for each component type. Minimum set the configurator needs:
> - **cpu**: `socket` (enum), `tdp_watts` (number), `integrated_graphics` (bool)
> - **motherboard**: `socket` (enum), `form_factor` (enum: ATX/mATX/ITX/E-ATX), `ram_type` (enum: DDR4/DDR5), `ram_slots` (number), `max_ram_gb` (number)
> - **ram**: `ram_type` (enum), `modules` (number), `capacity_gb` (number), `speed_mhz` (number)
> - **gpu**: `length_mm` (number), `tdp_watts` (number), `recommended_psu_watts` (number)
> - **psu**: `wattage` (number), `form_factor` (enum: ATX/SFX), `efficiency` (enum)
> - **case**: `form_factors_supported` (enum[]), `max_gpu_length_mm` (number), `max_cooler_height_mm` (number), `psu_form_factor` (enum)
> - **cooler**: `socket_support` (enum[]), `height_mm` (number), `tdp_watts` (number), `type` (enum: air/aio), `radiator_mm` (number, aio)
> - **storage**: `interface` (enum: NVMe/SATA/M.2), `capacity_gb` (number)

## 3. Product

```ts
// product.schema.ts
{
  name: { fr: string; ar?: string },
  slug: string,                      // unique
  sku: string,                       // unique
  brand: string,
  category: ObjectId,                // ref 'Category'
  categoryType: string,              // denormalized for querying (e.g. 'gpu')
  description: { fr: string; ar?: string },
  shortDescription?: { fr: string; ar?: string },

  // pricing (centimes, integers)
  price: number,                     // regular price in centimes
  compareAtPrice?: number,           // "was" price for showing a discount
  flashDeal?: {
    price: number,                   // centimes
    startsAt: Date,
    endsAt: Date,
  },

  // media
  images: [{ url: string, publicId: string, alt?: string, isPrimary: boolean, order: number }],

  // structured technical attributes (validated against AttributeDefinition for this categoryType)
  attributes: Record<string, string | number | boolean | string[]>,

  // inventory
  stock: number,                     // available units
  lowStockThreshold: number,
  isConfiguratorPart: boolean,       // true if selectable in the builder
  status: 'active' | 'draft' | 'archived',

  // seo
  metaTitle?: { fr: string; ar?: string },
  metaDescription?: { fr: string; ar?: string },

  ratingAvg?: number,
  ratingCount?: number,
}
```
Indexes:
- `slug` unique, `sku` unique.
- `{ category: 1, status: 1 }`, `{ categoryType: 1 }`, `{ brand: 1 }`.
- Text index on `name.fr`, `brand`, `description.fr` for search.
- Attribute filter indexes as needed, e.g. `{ categoryType: 1, 'attributes.socket': 1 }`.

**Effective price helper:** current price = active flashDeal.price if now ∈ [startsAt,endsAt], else `price`.

## 4. Build (saved custom PC configuration)

```ts
// build.schema.ts
{
  user?: ObjectId,                   // null for guest builds
  shareId: string,                   // short unique id for shareable URL
  name?: string,
  items: [{ slot: string, product: ObjectId, priceAtBuild: number }],  // one per slot
  servicesIncluded: boolean,         // assembly + cable mgmt + Windows
  discountPct: number,               // e.g. 5
  subtotal: number,                  // centimes, sum of parts
  total: number,                     // centimes, after discount
  estimatedWattage: number,
  isValid: boolean,                  // last computed validity
  warnings: string[],
}
```
Index: `shareId` unique.

## 5. CompatibilityRule (data-driven)

Rules live in the DB so staff/admin can extend behavior without code changes. The engine
(`CONFIGURATOR_ENGINE.md`) loads and evaluates them.

```ts
// compatibility-rule.schema.ts
{
  id: string,                        // e.g. 'cpu_mobo_socket'
  description: string,
  type: 'match' | 'gte' | 'lte' | 'fits' | 'sum_lte' | 'includes',
  // operands reference slot.attribute paths:
  left:  { slot: string, attr: string },
  right: { slot: string, attr: string } | { const: number | string },
  // for sum rules (e.g. total TDP <= psu wattage * headroom):
  sumSlots?: string[],               // slots whose attr are summed
  sumAttr?: string,                  // e.g. 'tdp_watts'
  factor?: number,                   // e.g. 0.8 -> require psu*0.8 >= sum (safety headroom)
  severity: 'error' | 'warning',
  messageFr: string,                 // shown to the user when violated
  isActive: boolean,
}
```

## 6. User

```ts
// user.schema.ts
{
  email: string,                     // unique
  passwordHash: string,
  name: string,
  phone?: string,                    // +212...
  role: 'customer' | 'staff' | 'admin',
  addresses: [{ label, line1, line2, city, region, postalCode, phone, isDefault }],
  refreshTokenHash?: string,
  isActive: boolean,
}
```
Index: `email` unique.

## 7. Order & Inventory (SAFETY-CRITICAL)

```ts
// order.schema.ts
{
  orderNumber: string,               // unique, human-readable e.g. CC-2026-000123
  user?: ObjectId,                   // guest checkout allowed
  contact: { name, email, phone },
  items: [{
    kind: 'product' | 'build',
    product?: ObjectId,              // for kind 'product'
    build?: {                        // snapshot for kind 'build'
      items: [{ slot, product: ObjectId, name, price }],
      servicesIncluded: boolean,
      discountPct: number,
    },
    name: string,                    // snapshot
    unitPrice: number,               // centimes, snapshot
    quantity: number,
    lineTotal: number,               // centimes
  }],
  subtotal: number,
  shipping: { method: 'delivery' | 'pickup', zone?: string, cost: number, address?: {...} },
  discountTotal: number,
  total: number,                     // centimes
  payment: {
    method: 'cmi' | 'cod',
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    cmiRef?: string,
  },
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled',
  statusHistory: [{ status, at, by }],
}
```
Index: `orderNumber` unique, `{ user: 1 }`, `{ status: 1 }`, `createdAt`.

### Inventory rule (MUST be atomic)

When placing an order, deduct stock with a guarded conditional update **inside a
transaction** so two concurrent buyers cannot oversell the last unit:

```ts
// pseudocode — run inside a Mongo session/transaction
for (const line of orderItems) {
  const res = await Product.updateOne(
    { _id: line.product, stock: { $gte: line.quantity } },   // guard
    { $inc: { stock: -line.quantity } },
    { session }
  );
  if (res.modifiedCount !== 1) {
    await session.abortTransaction();
    throw new ConflictException(`Rupture de stock: ${line.name}`);
  }
}
// then create the order in the same session, then commit
```
For custom **builds**, deduct every part's stock the same way. Write an `inventorylogs`
entry per movement for auditing. On order cancellation, restock with the reverse `$inc`.

> Note: transactions require a MongoDB **replica set** (Atlas provides this by default;
> for local dev run a single-node replica set). Document this in the API README.

## 8. InventoryLog (recommended)

```ts
{ product: ObjectId, delta: number, reason: 'order'|'cancel'|'manual'|'import', ref?: string, by?: ObjectId }
```
