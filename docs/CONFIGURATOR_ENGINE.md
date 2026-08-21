# CONFIGURATOR_ENGINE.md — PC Builder & Compatibility Engine

This is the differentiating feature and the highest-risk code. Build the engine as a
**pure, framework-agnostic TypeScript module** in `packages/types` (or a `packages/config-engine`),
fully **unit-tested**, and reuse it on both the frontend (live UI filtering) and backend
(authoritative validation before adding a build to cart / placing an order).

**Golden rule:** never trust the client. The frontend uses the engine for UX; the backend
re-runs the same engine to validate before money changes hands.

---

## 1. Slots (build steps)

A build is a set of **slots**, each filled by one product (some optional, some multi):

| Slot | Required | Multi | componentType |
|---|---|---|---|
| `case` | yes | no | case |
| `motherboard` | yes | no | motherboard |
| `cpu` | yes | no | cpu |
| `cooler` | no* | no | cooler |
| `ram` | yes | yes (up to board slots) | ram |
| `gpu` | no** | no | gpu |
| `storage` | yes | yes | storage |
| `psu` | yes | no | psu |
| `fans` | no | yes | fan |

\* Cooler optional only if CPU ships with a stock cooler (attribute `includes_cooler`).
\** GPU optional only if CPU has `integrated_graphics = true`.

Suggested selection order (each choice narrows the next): **case → motherboard → cpu →
cooler → ram → gpu → storage → psu**. The user may edit any earlier slot; the engine
re-validates the whole build on every change.

## 2. Compatibility rules (data-driven)

Rules are stored in `compatibilityrules` (see `DATA_MODEL.md`) and evaluated by the
engine. Ship this default rule set as a seed:

| id | meaning | type | severity |
|---|---|---|---|
| `cpu_mobo_socket` | CPU.socket == Motherboard.socket | match | error |
| `cooler_socket` | Motherboard.socket ∈ Cooler.socket_support | includes | error |
| `ram_type` | RAM.ram_type == Motherboard.ram_type | match | error |
| `ram_slots` | count(RAM modules) ≤ Motherboard.ram_slots | (count) lte | error |
| `ram_capacity` | sum(RAM.capacity_gb) ≤ Motherboard.max_ram_gb | sum_lte | error |
| `mobo_case_form` | Motherboard.form_factor ∈ Case.form_factors_supported | includes | error |
| `gpu_length` | GPU.length_mm ≤ Case.max_gpu_length_mm | lte (fits) | error |
| `cooler_height` | Cooler.height_mm ≤ Case.max_cooler_height_mm | lte (fits) | error |
| `psu_form` | PSU.form_factor == Case.psu_form_factor | match | error |
| `psu_wattage` | (sum of component tdp_watts) ≤ PSU.wattage × factor | sum_lte | error |
| `psu_recommended` | PSU.wattage ≥ GPU.recommended_psu_watts | gte | warning |
| `radiator_fit` | (aio) Cooler.radiator_mm supported by Case | includes | warning |

For `psu_wattage`, sum `tdp_watts` across `cpu`, `gpu`, and a base allowance for board +
drives + fans (e.g. +100W), then require `PSU.wattage × 0.8 ≥ sum` (20% headroom;
`factor = 0.8`).

## 3. Engine API (implement exactly this shape)

```ts
type SlotId = 'case'|'motherboard'|'cpu'|'cooler'|'ram'|'gpu'|'storage'|'psu'|'fans';

interface Part {                 // minimal projection of a Product
  id: string;
  categoryType: string;
  price: number;                 // centimes (effective price)
  stock: number;
  attributes: Record<string, string | number | boolean | string[]>;
}

interface Selection { [slot: string]: Part | Part[] | undefined; }

interface Violation {
  ruleId: string;
  severity: 'error' | 'warning';
  messageFr: string;
  slots: SlotId[];
}

interface BuildEvaluation {
  isValid: boolean;              // true if zero 'error' violations
  violations: Violation[];       // errors + warnings
  subtotal: number;              // centimes
  discountPct: number;           // e.g. 5
  total: number;                 // centimes after discount
  estimatedWattage: number;
  recommendedPsuWattage: number;
}

// Core functions:
function evaluateBuild(sel: Selection, rules: Rule[]): BuildEvaluation;

// Given the current partial selection, return only the parts compatible for a slot.
// This powers the live filtering UI ("show me only motherboards that fit so far").
function compatiblePartsForSlot(
  slot: SlotId,
  candidates: Part[],
  sel: Selection,
  rules: Rule[]
): Part[];
```

`compatiblePartsForSlot` returns candidates for which adding them introduces **no `error`
violation** given the current selection. Warnings do not exclude a part (still selectable,
shown with a caution note).

## 4. Reactive UI behavior

- As each slot is filled, all **later** slots are re-filtered via `compatiblePartsForSlot`.
- Show a persistent summary panel: running **subtotal**, **−5% discount**, **total**,
  **estimated wattage**, **recommended PSU**, and current **errors/warnings** in French.
- If a later selection becomes invalid after the user edits an earlier slot, flag it and
  ask the user to re-pick (don't silently drop it).
- Disable "Add to cart" while `isValid === false`. Show the blocking error(s).
- Out-of-stock parts: either hidden or shown disabled (config-driven).
- Included services line ("Montage professionnel + cable management + Windows 11") always
  shown; the −5% applies to the parts subtotal.

## 5. Turning a build into a cart item

On "Ajouter au panier":
1. Frontend calls `POST /configurator/validate` with the selection.
2. Backend re-runs `evaluateBuild` authoritatively (fresh prices + stock from DB).
3. If valid, returns a normalized build payload (snapshot of parts, prices, wattage,
   discount, total).
4. Frontend adds it as one cart line of `kind: 'build'` (see Order schema).
5. At checkout, backend deducts stock for **every part** atomically (see `DATA_MODEL.md`).

## 6. Testing (required)

Unit-test the engine with fixtures:
- Each rule: one passing case, one failing case, correct `messageFr` and `severity`.
- `psu_wattage`: boundary cases around the 0.8 factor.
- `compatiblePartsForSlot`: filtering narrows correctly as slots fill.
- Integrated-graphics path: GPU slot optional; PSU sum excludes missing GPU.
- Edit-earlier-slot invalidation: previously-valid later pick becomes flagged.
- Price/discount math in centimes (no floating point drift).

Keep the engine pure (no DB, no I/O) so tests are fast and deterministic. The backend and
frontend both import it; rules are injected as data.
