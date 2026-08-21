import type { Centimes, Localized } from './common';

/** Top-level shape of a category (DATA_MODEL.md §1). */
export type CategoryType =
  | 'component'
  | 'prebuilt'
  | 'laptop'
  | 'peripheral'
  | 'console'
  | 'monitor'
  | 'workstation';

/** The part types the configurator knows how to slot. */
export type ComponentType =
  | 'cpu'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'psu'
  | 'case'
  | 'cooler'
  | 'storage'
  | 'fan';

export interface Category {
  id: string;
  name: Localized;
  slug: string;
  parent: string | null;
  type: CategoryType;
  componentType?: ComponentType;
  configuratorSlot?: string;
  image?: string;
  order: number;
  isActive: boolean;
}

/** A category plus its children — the tree `GET /categories` returns. */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

/**
 * Typed attribute definition (DATA_MODEL.md §2). One row here drives three things at once:
 * the admin form field, the listing facet, and the configurator's compatibility input.
 */
export type AttributeDataType = 'string' | 'number' | 'boolean' | 'enum';

export interface AttributeDefinition {
  id: string;
  /** Matches Category.componentType, or Category.type for non-component categories. */
  categoryType: string;
  key: string;
  label: Localized;
  dataType: AttributeDataType;
  unit?: string;
  enumValues?: string[];
  /** enum attributes that hold several values at once, e.g. case.form_factors_supported */
  multiple?: boolean;
  required: boolean;
  filterable: boolean;
  usedInCompatibility: boolean;
  order: number;
}

export type AttributeValue = string | number | boolean | string[];
export type Attributes = Record<string, AttributeValue>;

export interface ProductImage {
  url: string;
  publicId: string;
  alt?: string;
  isPrimary: boolean;
  order: number;
}

export interface FlashDeal {
  price: Centimes;
  startsAt: string;
  endsAt: string;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: string;
  name: Localized;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  categoryType: string;
  description: Localized;
  shortDescription?: Localized;

  price: Centimes;
  compareAtPrice?: Centimes;
  flashDeal?: FlashDeal;
  /** Server-computed: flashDeal.price when the deal window is open, else price. */
  effectivePrice: Centimes;

  images: ProductImage[];
  attributes: Attributes;

  stock: number;
  lowStockThreshold: number;
  isConfiguratorPart: boolean;
  status: ProductStatus;

  metaTitle?: Localized;
  metaDescription?: Localized;

  ratingAvg?: number;
  ratingCount?: number;

  createdAt?: string;
  updatedAt?: string;
}

/** Card-sized projection used by listings, carousels and the configurator picker. */
export type ProductSummary = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'brand'
  | 'categoryType'
  | 'price'
  | 'compareAtPrice'
  | 'effectivePrice'
  | 'images'
  | 'attributes'
  | 'stock'
  | 'ratingAvg'
  | 'ratingCount'
>;

/** One facet the listing sidebar can render, with per-value counts (API_SPEC.md). */
export interface Facet {
  key: string;
  label: Localized;
  dataType: AttributeDataType;
  unit?: string;
  values: { value: string | number | boolean; count: number }[];
}

export interface ProductListQuery {
  category?: string;
  brand?: string | string[];
  minPrice?: Centimes;
  maxPrice?: Centimes;
  inStock?: boolean;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  /** Attribute filters, sent over the wire as `attr.<key>=value`. */
  attrs?: Record<string, string | string[]>;
}

export interface ProductListResponse {
  data: ProductSummary[];
  page: number;
  limit: number;
  total: number;
  availableFacets: Facet[];
  priceRange: { min: Centimes; max: Centimes };
  brands: { value: string; count: number }[];
}

/**
 * Effective price of a product at a given instant. Kept here (not in the API) so the
 * storefront, the admin and the order code all agree on what "the price" is.
 */
export function effectivePriceAt(
  p: Pick<Product, 'price' | 'flashDeal'>,
  now: Date = new Date(),
): Centimes {
  const deal = p.flashDeal;
  if (!deal) return p.price;
  const t = now.getTime();
  if (t >= new Date(deal.startsAt).getTime() && t <= new Date(deal.endsAt).getTime()) {
    return deal.price;
  }
  return p.price;
}
