# PROJECT_SPEC.md — Rgi Service

## 1. Summary

An e-commerce platform for **Rgi Service**, a Moroccan gaming-hardware retailer. Customers
browse and buy gaming PCs, laptops, workstations, components, peripherals, consoles, and
monitors, or build a custom PC with a guided, compatibility-checked configurator. Staff
manage the entire catalog and orders through an admin dashboard.

Design/product references (competitors — patterns only, no asset copying): primary
**https://casaconfig.ma/** (the look the client wants + the product range to match), plus
https://techspace.ma/ , https://www.ultrapc.ma/ , and nextlevelpc.ma's configurator page.
Market context: French UI, MAD currency, Morocco, physical store + online. See
`DESIGN_REFERENCE.md`.

## 2. Goals & non-goals

**Goals**
- Sell products online with a professional, fast, SEO-friendly storefront.
- Offer a custom PC configurator that prevents incompatible builds and drives sales.
- Give non-technical staff full self-service control of products, stock, and orders.
- Support Moroccan payment realities: CMI cards **and** cash on delivery.
- Rank in Google Morocco for gaming-PC and component searches.

**Non-goals (v1)**
- Multi-vendor marketplace. Multi-currency. Full ERP/accounting integration.
- Arabic UI at launch (but the codebase must be i18n-ready).
- Mobile native app (responsive web only).

## 3. Product catalog structure

Top-level categories (mirror the reference site):

- **Configurateur PC** (the builder, −5%)
- **PC Gamers** (pre-built; Intel and Ryzen variants)
- **PC Portables** (laptops: MSI, Alienware, Lenovo, Acer…)
- **Workstation PRO** (high-end: RTX 5090 / 4090 class)
- **Composants PC** (GPUs, CPUs, RAM, SSDs, motherboards, PSUs, cooling, cases)
- **Périphériques** (keyboards, mice, headsets, webcams, chairs, streaming gear)
- **Console** (PlayStation, Xbox, Nintendo Switch + accessories)
- **Moniteurs** (monitors: IPS/VA/OLED/Mini-LED)

Each **component** category carries structured technical attributes used both for faceted
filtering and for configurator compatibility (see `DATA_MODEL.md` and
`CONFIGURATOR_ENGINE.md`).

## 4. Core features

**Storefront**
- Home page: hero, featured categories, flash deals, featured builds.
- Category/listing pages with faceted filtering (by CPU model, GPU chipset, RAM
  frequency, storage type, price, brand, in-stock).
- Product detail page: gallery (Cloudinary), specs table, price, stock status, add to cart,
  related products, JSON-LD.
- Search with autocomplete.
- **Flash deals** section with discounted pricing and optional countdown.
- Cart, checkout, order confirmation, order tracking.
- Customer accounts: register/login, order history, addresses.

**Configurator** (see dedicated spec)
- Step/slot-based builder: Case → Motherboard → CPU → Cooler → RAM → GPU → Storage → PSU → extras.
- Live compatibility filtering, running total price, running estimated wattage, PSU adequacy check.
- Included services line (assembly + cable management + Windows install) and −5% discount.
- "Add build to cart" → creates one custom-build cart item.
- Optional: save/share a build (shareable URL).

**Admin dashboard** (see dedicated spec)
- Product CRUD with **category-specific structured attribute forms**.
- Cloudinary image upload (multiple images, reorder, set primary).
- Stock/inventory management; flash-deal pricing and scheduling.
- Order management (view, update status, mark paid/shipped/delivered).
- **Bulk CSV/Excel import/export** of products.
- User roles: `admin` (full), `staff` (catalog + orders, no user/role management).

## 5. Key user stories

- *As a customer*, I filter graphics cards by chipset and price and add one to my cart.
- *As a customer*, I open the configurator, pick a Ryzen CPU, and immediately only see
  AM5 motherboards; I get warned if my PSU is too weak; I add the finished build to cart.
- *As a customer*, I check out paying cash on delivery, and later I check out with a CMI card.
- *As staff*, I add a new RTX 5090 with its GPU length, TDP, and stock quantity, and it
  instantly appears on the site and inside the configurator.
- *As staff*, I upload a spreadsheet of 200 new components and they are imported.
- *As admin*, I mark an order as shipped and stock is already reflected correctly.

## 6. Localization & money

- All UI strings via i18n keys; default locale `fr`. Prepare `ar` later.
- Currency MAD; prices stored as integer **centimes**; formatted as `1 234,00 MAD`.
- Dates/addresses in Moroccan format; phone `+212`.

## 7. Success criteria

- Customer can complete a purchase (both payment methods) end to end.
- Configurator never allows a physically incompatible build.
- Staff can fully manage catalog and orders without a developer.
- Core pages score well on Lighthouse (perf + SEO) and are indexable.
