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

/** Modo de llenado del diseño dentro de la zona. */
export type FitMode = "fit" | "fill" | "tile";

/** Diseño colocado en una zona concreta: cada zona tiene el suyo. */
export type ZoneDesign = {
  designUrl: string | null;
  designPreview: string | null;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  /** Ajustar (completa), Rellenar (cubre) o Repetir patrón. */
  fitMode: FitMode;
  /** Tamaño de cada repetición como fracción del ancho del área. */
  tileScale: number;
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
  /** Modo de llenado de la zona activa. */
  fitMode: FitMode;
  /** Tamaño de la repetición (modo patrón) de la zona activa. */
  tileScale: number;
  mockups: string[];
  mockupUrl: string | null;
  name: string;
  description: string;
  priceCents: number | null;
  /**
   * Diseño guardado por zona (frente, espalda, área completa…). La zona activa
   * se refleja además en los campos de arriba para no romper nada existente.
   */
  zones: Record<string, ZoneDesign>;
};

/** Diseño vacío de una zona. */
export const EMPTY_ZONE: ZoneDesign = {
  designUrl: null,
  designPreview: null,
  offsetX: 0.5,
  offsetY: 0.5,
  scale: 0.8,
  rotation: 0,
  fitMode: "fit",
  tileScale: 0.25,
};

/** Diseño de la zona activa tal como está en el borrador. */
export function activeZone(d: ProductDraft): ZoneDesign {
  return {
    designUrl: d.designUrl,
    designPreview: d.designPreview,
    offsetX: d.offsetX,
    offsetY: d.offsetY,
    scale: d.scale,
    rotation: d.rotation,
    fitMode: d.fitMode ?? "fit",
    tileScale: d.tileScale ?? 0.25,
  };
}

/** Diseño guardado de una zona (la activa se lee de los campos de arriba). */
export function zoneDesign(d: ProductDraft, id: string): ZoneDesign {
  if (id === d.placement) return activeZone(d);
  return d.zones?.[id] ?? EMPTY_ZONE;
}

/** ¿Esa zona ya tiene diseño puesto? */
export function zoneHasDesign(d: ProductDraft, id: string): boolean {
  const z = zoneDesign(d, id);
  return Boolean(z.designUrl || z.designPreview);
}

/**
 * Cambia de zona guardando el diseño de la anterior y cargando el de la nueva.
 * Devuelve el parche listo para `update()`.
 */
export function switchZone(d: ProductDraft, next: string): Partial<ProductDraft> {
  if (next === d.placement) return {};
  const zones = { ...(d.zones ?? {}), [d.placement]: activeZone(d) };
  const target = zones[next] ?? EMPTY_ZONE;
  return {
    zones,
    placement: next,
    designUrl: target.designUrl,
    designPreview: target.designPreview,
    offsetX: target.offsetX,
    offsetY: target.offsetY,
    scale: target.scale,
    rotation: target.rotation,
    mockups: [],
    mockupUrl: null,
  };
}


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
    zones: {},
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
