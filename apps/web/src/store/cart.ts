import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Centimes, ProductSummary } from '@rgi/types';
import { primaryImage } from '@/lib/format';

/**
 * The basket (CLAUDE.md §2: Zustand owns cart state), persisted to localStorage.
 *
 * Each line carries a display snapshot — name, image, the price when it was added — so the
 * cart renders instantly and offline. That snapshot is never trusted: `/cart/validate`
 * re-prices every line from the database before checkout, and `POST /orders` re-prices
 * again before writing anything (DATA_MODEL.md §7).
 */
export interface CartLine {
  /** Stable key: the product id, or `build:<part ids>` for a configured PC. */
  id: string;
  kind: 'product' | 'build';
  productId?: string;
  buildSelection?: Record<string, string | string[]>;
  quantity: number;
  name: string;
  image?: string;
  slug?: string;
  /** Snapshot only — the server has the last word on price. */
  unitPrice: Centimes;
}

interface CartState {
  lines: CartLine[];
  addProduct: (product: ProductSummary, quantity?: number) => void;
  addBuild: (
    selection: Record<string, string | string[]>,
    snapshot: { name: string; image?: string; unitPrice: Centimes },
  ) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const MAX_PER_LINE = 20;

export const buildLineId = (selection: Record<string, string | string[]>) =>
  `build:${Object.values(selection).flat().join('-')}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addProduct: (product, quantity = 1) => {
        const existing = get().lines.find((line) => line.id === product.id);
        if (existing) {
          get().setQuantity(product.id, existing.quantity + quantity);
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              id: product.id,
              kind: 'product',
              productId: product.id,
              quantity: Math.min(quantity, MAX_PER_LINE),
              name: product.name.fr,
              image: primaryImage(product)?.url,
              slug: product.slug,
              unitPrice: product.effectivePrice,
            },
          ],
        });
      },

      addBuild: (selection, snapshot) => {
        const id = buildLineId(selection);
        const existing = get().lines.find((line) => line.id === id);
        if (existing) {
          get().setQuantity(id, existing.quantity + 1);
          return;
        }
        set({
          lines: [
            ...get().lines,
            { id, kind: 'build', buildSelection: selection, quantity: 1, ...snapshot },
          ],
        });
      },

      setQuantity: (id, quantity) => {
        const next = Math.max(1, Math.min(quantity, MAX_PER_LINE));
        set({
          lines: get().lines.map((line) =>
            line.id === id ? { ...line, quantity: next } : line,
          ),
        });
      },

      remove: (id) => set({ lines: get().lines.filter((line) => line.id !== id) }),
      clear: () => set({ lines: [] }),
    }),
    { name: 'rgi-cart' },
  ),
);

/** Total number of articles, for the header badge. */
export const cartCount = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

/** What the API expects: ids and quantities, never prices. */
export const cartPayload = (lines: CartLine[]) =>
  lines.map((line) => ({
    kind: line.kind,
    productId: line.productId,
    buildSelection: line.buildSelection,
    quantity: line.quantity,
  }));
