/**
 * Modelo interno del producto que el comerciante está creando.
 * Se mantiene desacoplado de la fuente del catálogo: cuando se sustituya la
 * fuente de datos o las operaciones de sincronización, la interfaz no cambia.
 */

export type CatalogItem = {
  id: number;
  title: string;
  brand: string | null;
  type: string;
  typeName: string;
  image: string;
  variantCount: number;
  description: string;
  category: string;
  categoryId: number;
};

export type DraftVariant = {
  id: number;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  image: string;
  priceCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number;
  inStock: boolean;
};

export type DraftPlacement = { id: string; label: string; areaWidth: number; areaHeight: number };

export type ProductDraft = {
  productId: number;
  catalogTitle: string;
  category: string;
  image: string;
  variants: DraftVariant[];
  placements: DraftPlacement[];
  color: string | null;
  variantId: number | null;
  selectedVariantIds: number[];
  designUrl: string | null;
  designPreview: string | null;
  placement: string;
  scale: number;
  offsetY: number;
  mockups: string[];
  mockupUrl: string | null;
  name: string;
  description: string;
  priceCents: number | null;
};

/** Producto ya terminado, listo para publicarse en la tienda. */
export type ReadyProduct = {
  productId: number;
  variantId: number | null;
  selectedVariantIds: number[];
  name: string;
  description: string;
  priceCents: number | null;
  costCents: number | null;
  image: string;
  category: string;
  designUrl?: string;
  mockupUrl?: string;
  placement?: string;
};

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

export function money(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

export function newDraft(item: CatalogItem): ProductDraft {
  return {
    productId: item.id,
    catalogTitle: item.title,
    category: item.category || item.typeName,
    image: item.image,
    variants: [],
    placements: [],
    color: null,
    variantId: null,
    selectedVariantIds: [],
    designUrl: null,
    designPreview: null,
    placement: "front",
    scale: 0.8,
    offsetY: 0.1,
    mockups: [],
    mockupUrl: null,
    name: item.title,
    description: item.description || "",
    priceCents: null,
  };
}

export function currentVariant(d: ProductDraft): DraftVariant | undefined {
  return d.variants.find((v) => v.id === d.variantId) ?? d.variants[0];
}

export function draftToProduct(d: ProductDraft): ReadyProduct {
  const v = currentVariant(d);
  return {
    productId: d.productId,
    variantId: v?.id ?? null,
    selectedVariantIds: d.selectedVariantIds.length ? d.selectedVariantIds : v ? [v.id] : [],
    name: d.name.trim() || d.catalogTitle,
    description: d.description.trim(),
    priceCents: d.priceCents ?? v?.priceCents ?? null,
    costCents: v?.costCents ?? null,
    image: d.mockupUrl || v?.image || d.image,
    category: d.category,
    designUrl: d.designUrl ?? undefined,
    mockupUrl: d.mockupUrl ?? undefined,
    placement: d.mockupUrl ? d.placement : undefined,
  };
}
