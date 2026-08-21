# DESIGN_REFERENCE.md — Reference Sites & UI/UX Guide

## Our brand
We are building the store for **Rgi Service** (this is the brand/site being built). All the
sites below are Moroccan competitors used as **references only** — reproduce their patterns
and UX, never their assets, logos, copy, or images. The finished site carries Rgi Service's
own name, logo, colors, and content.

## Primary reference (design + product range)
**https://casaconfig.ma/** — the client likes this one most. Build the storefront's look,
structure, and UX in its spirit, **and match its product range** (same categories and the
kinds of gaming PCs, laptops, workstations, components, peripherals, consoles, and monitors
it carries). See "Product sourcing" below.

## Additional design references (patterns/UX ideas only)
- **https://techspace.ma/** — Moroccan gaming-hardware store; study its catalog layout,
  filtering, and product cards.
- **https://nextlevelpc.ma/module/configurateurpc/displayconfigurator** — a live PC
  **configurator**; study this closely for builder UX (step/slot flow, part pickers, live
  compatibility, running total). Good model for our configurator interaction.
- **https://www.ultrapc.ma/** — large Moroccan PC retailer; study navigation, mega-menu,
  category depth, and how heavy catalogs stay scannable.

> **Assistant: `WebFetch` these before building the relevant UI.** casaconfig.ma for overall
> look + product range, nextlevelpc's configurator page for the builder UX, techspace/ultrapc
> for catalog and navigation patterns. Then design original Rgi Service UI that improves on them.

## Product sourcing (important)
The client wants the **same product range as casaconfig.ma**. Do **not** scrape and republish
its copy or images wholesale. Instead: use its catalog to define our **categories, the list of
products to stock, and the technical attributes** each product type needs, then have staff
enter/import products through the admin (`ADMIN_DASHBOARD.md` bulk import) with Rgi Service's
own photos/descriptions or properly licensed manufacturer assets. Model the data on casaconfig;
own the content.

## What to reproduce (patterns, not content)

Suggested casaconfig.ma pages to fetch and study: the home page, a category/listing page
(e.g. PC Gamer, or Composants → Cartes graphiques), a product detail page, and the
"Configurateur PC" page.

---

## What to reproduce (patterns, not content)

### Global layout
- **Top bar:** contact phone(s), promo/announcement strip, language (FR), account, cart.
- **Header:** logo, prominent **search bar** with autocomplete, account + cart icons (cart
  shows item count + total in MAD).
- **Main navigation:** category mega-menu — Configurateur PC (highlighted, with the −5%
  badge), PC Gamers (Intel/Ryzen), PC Portables, Workstation PRO, Composants PC,
  Périphériques, Console, Moniteurs. Sub-menus reveal subcategories.
- **Footer:** categories, customer service, store address + map (Casablanca), payment/
  warranty badges, social links, newsletter.

### Home page sections (top → bottom)
1. Hero banner / carousel (featured promo, seasonal deals).
2. Category shortcuts (icon tiles for each top category).
3. **Configurateur PC** call-to-action block (the −5% hook) — make it prominent.
4. **Flash deals** row (discounted products, price crossed-out → deal price, optional countdown).
5. Featured pre-built PCs / best sellers (product cards).
6. Brand strip (Intel, AMD, NVIDIA, MSI, etc.).
7. Trust/services band: montage professionnel, cable management, Windows 11, garantie 12 mois.

### Category / listing page
- Left (or top) **filter sidebar** with facets: price range, brand, and technical attributes
  per category (CPU model, GPU chipset, RAM frequency, storage type, socket…). Facets come
  from `AttributeDefinition.filterable` — render dynamically, don't hardcode.
- Sort control (price asc/desc, newest, popularity), result count, pagination.
- **Product card:** image, name, key specs, price (+ old price if on deal), stock badge,
  quick "add to cart". Consistent card used across the whole site.

### Product detail page
- Image gallery (Cloudinary; thumbnails + zoom).
- Title (H1), brand, SKU, price + deal price, stock status, quantity, add-to-cart.
- **Specifications table** rendered from the product's structured `attributes`.
- Services/warranty callouts; delivery info.
- Description (rich, unique copy). Related products row. Reviews/ratings section.
- JSON-LD Product markup (see `SEO_STRATEGY.md`).

### Configurator UI
- Step/slot list (Case → Motherboard → CPU → Cooler → RAM → GPU → Storage → PSU → extras),
  each with a "choose part" action opening a filtered part picker.
- Sticky **summary panel:** running subtotal, −5% discount, total (MAD), estimated wattage,
  recommended PSU, and live compatibility errors/warnings in French.
- Incompatible parts hidden/disabled as slots fill (see `CONFIGURATOR_ENGINE.md`).
- "Ajouter au panier" disabled until the build is valid.

### Cart / checkout
- Cart: line items (products and custom builds — builds expandable to show parts), quantities,
  totals, promo, proceed button.
- Checkout: contact, address / delivery zone or in-store pickup, **payment method (CMI card
  or cash on delivery)**, order review, confirm.

---

## Visual style guidance
- **Feel:** modern, tech/gaming, high-contrast. Dark-friendly accents are common for gaming
  hardware sites; a clean light layout with a bold accent color also works. Pick a consistent
  palette (primary + accent + neutrals) and apply it via Tailwind theme tokens.
- **Imagery:** large, crisp product photos on neutral backgrounds; consistent aspect ratios
  (use `next/image` + Cloudinary transforms).
- **Typography:** clear sans-serif; strong price/spec legibility; obvious CTAs.
- **Density:** spec-heavy but scannable — cards and tables must stay readable on mobile.
- **Mobile-first:** most Moroccan traffic is mobile; nav collapses to a drawer, filters to a
  bottom sheet/modal, cards stack.
- **Trust cues:** warranty, secure payment, local store presence, delivery — surface these,
  they drive conversion for high-ticket purchases.
- **Consistency:** one product card, one button system, one form style reused everywhere
  (use shadcn/ui components + a shared Tailwind theme).

## Do / Don't
- ✅ Reproduce structure, navigation, and UX patterns; improve clarity and performance.
- ✅ Use the dynamic-attribute system so filters and spec tables match each category.
- ❌ Don't copy CasaConfig's images, logo, copy, or exact styling — original design only.
- ❌ Don't hardcode filters or spec rows per category — drive them from data.
