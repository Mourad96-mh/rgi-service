# ADMIN_DASHBOARD.md — Staff Product & Order Management

The client's explicit requirement: **staff add and manage products themselves, no developer
needed.** The dashboard lives in the same Next.js app under a protected `/admin` area,
role-gated (`staff`, `admin`). Non-technical, French UI, fast.

---

## 1. Access & roles

- Route group `/admin/*`, guarded by auth + a role check.
- `staff`: manage catalog (products, categories, stock, flash deals) and orders.
- `admin`: everything staff can do **plus** users, roles, and compatibility rules.
- Redirect unauthenticated/unauthorized users.

### Amended 2026-08-24 — the gate moved into the browser

This section used to end with "never render admin data client-side without a server
check", and the app implemented exactly that: `middleware.ts` refused `/admin/*` before a
byte of HTML was produced, and the JWT sat in an httpOnly cookie the browser could not
read. That is the stronger design and it is what we would still choose if we had a server.

We do not. The storefront ships as a static export to Hostinger shared hosting, which runs
no Node process (`DEPLOY_HOSTINGER.md`), and Vercel was dropped at the client's request —
which left the dashboard with nowhere to run at all. It was rewritten to work the way
CHUN WAH and mat-den already do: the session lives in `localStorage`, travels as
`Authorization: Bearer`, and the guard is `AdminShell`, a client component.

What that does and does not change:

| | Before | Now |
|---|---|---|
| Admin **HTML** | refused without a session | public — an empty shell, no data in it |
| Admin **data** | bearer token, API role guards | **unchanged** — bearer token, API role guards |
| Token readable by JS | no (httpOnly) | **yes** — an XSS on this origin can steal it |
| Reachable by staff | only from a machine running Node | any browser |

The role checks in the UI (`/admin/categories`, `/admin/attributs`) mirror the API's
`@Roles('admin')`; they do not enforce it. **The API is the security boundary.** Every
admin route is guarded there, and a hand-edited `localStorage` entry buys an attacker a
screen of 401s.

The full trade-off, including why the access token's 15-minute life matters more now, is
written out at the top of `apps/web/src/lib/admin/session.ts`.

## 2. Product management (the core feature)

### Product list
- Table: image, name, category, brand, price, stock (with low-stock badge), status.
- Search, filter by category/brand/status, sort, pagination.
- Bulk actions: archive, delete, export.

### Add / edit product — dynamic form
This is the key detail. When staff choose a **category**, the form renders
**category-specific structured attribute fields** loaded from `attributedefinitions`
(see `DATA_MODEL.md`). Example: choosing "Carte graphique" shows `length_mm`, `tdp_watts`,
`recommended_psu_watts`; choosing "Carte mère" shows `socket`, `form_factor`, `ram_type`,
`ram_slots`, `max_ram_gb`.

Form sections:
1. **Basics:** name (fr), slug (auto from name, editable), SKU, brand, category, description.
2. **Pricing:** price (MAD, converted to centimes on save), optional compare-at price.
3. **Flash deal:** optional deal price + start/end datetime.
4. **Attributes (dynamic):** typed inputs generated from `AttributeDefinition`:
   - `enum` → select (options from `enumValues`), `number` → numeric input with `unit`
     suffix, `boolean` → toggle, `string` → text. Required ones validated.
5. **Images:** Cloudinary upload widget — multiple images, drag-reorder, set primary,
   alt text. Store `{url, publicId, alt, isPrimary, order}`.
6. **Inventory:** stock quantity, low-stock threshold.
7. **Configurator:** `isConfiguratorPart` toggle (auto-on for component categories).
8. **SEO:** optional meta title / meta description (fall back to name/description).

Validation: enforce required attributes and correct types **on the server** (DTO) as well
as the client. Reject unknown attribute keys for the category. Bad technical data (e.g. a
typo'd socket) silently breaks the configurator, so validate `enum` values strictly.

### Bulk import / export
- **Export** current catalog to CSV/Excel (columns include the flattened attributes).
- **Import** CSV/Excel: map columns to fields + attributes, validate each row, show a
  preview with per-row errors, then commit valid rows. Log to `inventorylogs` as `import`.
- Provide a downloadable template per category (headers = that category's attribute keys).

## 3. Category & attribute management (admin)
- CRUD categories (tree), set `componentType` / `configuratorSlot`.
- CRUD `AttributeDefinition` per category type (label fr/ar, dataType, unit, enum values,
  required, filterable, usedInCompatibility). This is how the catalog is extended without code.

## 4. Compatibility rules (admin)
- View/edit `compatibilityrules`: enable/disable, tweak `factor` (PSU headroom), edit
  French messages, adjust severity. Changing rules changes configurator behavior live.

## 5. Order management
- Order list: number, customer, total, payment method/status, order status, date.
- Order detail: line items (products and builds, builds expanded to their parts),
  addresses, totals, payment info.
- Update **order status** (pending → confirmed → preparing → shipped → delivered /
  cancelled); each change appended to `statusHistory` with actor.
- Mark payment paid/failed/refunded (COD orders marked paid on delivery).
- Cancellation **restocks** parts (reverse `$inc`, log to `inventorylogs`).

## 6. Flash deals & merchandising
- Schedule flash-deal price windows; dashboard highlights currently-active deals.
- Optionally feature products/builds on the home page.

## 7. Dashboard home (overview)
- KPIs: orders today/week, revenue, low-stock items, pending orders, top products.
- Quick links: add product, pending orders, low stock.

## 8. UX requirements
- French throughout, MAD formatting, responsive (staff may use tablets).
- Optimistic updates + clear success/error toasts. Confirm destructive actions.
- Autosave-friendly forms; never lose entered data on validation error.
