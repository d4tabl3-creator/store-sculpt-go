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
  /** Precio mínimo = costo de fabricación (no incluye envío). */
  costCents: number;
  productionCents?: number;
  shippingCents?: number;
  marginCents: number;
  marginPct: number;
  inStock: boolean;
};

export type DraftProvider = { id: number; name: string; location: string | null };

export type DraftPlacement = {
  id: string;
  label: string;
  areaWidth: number;
  areaHeight: number;
  /** Variantes que admiten esta zona (vacío = todas, productos ya guardados). */
  variantIds?: number[];
};

/** Diseño colocado en una zona concreta: cada zona tiene el suyo. */
export type ZoneDesign = {
  designUrl: string | null;
  designPreview: string | null;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
};


export type ProductDraft = {
  productId: number;
  catalogTitle: string;
  category: string;
  image: string;
  variants: DraftVariant[];
  placements: DraftPlacement[];
  /** Fabricantes disponibles para este artículo y el elegido por el comerciante. */
  providers: DraftProvider[];
  printProviderId: number | null;
  color: string | null;
  variantId: number | null;
  selectedVariantIds: number[];
  designUrl: string | null;
  designPreview: string | null;
  placement: string;
  /** Ancho del diseño como fracción del área imprimible. */
  scale: number;
  /** Centro del diseño dentro del área imprimible (0-1). */
  offsetX: number;
  offsetY: number;
  /** Giro del diseño en grados. */
  rotation: number;
  mockups: string[];
  mockupUrl: string | null;
  name: string;
  description: string;
  priceCents: number | null;
};

/** Producto ya terminado, listo para publicarse en la tienda. */
export type ReadyProduct = {
  productId: number;
  printProviderId: number | null;
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
    providers: [],
    printProviderId: null,
    color: null,
    variantId: null,
    selectedVariantIds: [],
    designUrl: null,
    designPreview: null,
    placement: "front",
    scale: 0.8,
    offsetX: 0.5,
    offsetY: 0.5,
    rotation: 0,
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
    printProviderId: d.printProviderId,
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
