/**
 * Catálogo abierto del proveedor de fabricación bajo demanda.
 * Server-only: usa el token privado y nunca lo expone al navegador.
 *
 * La forma de los datos (CatalogItem / CatalogVariant / Placement / MockupResult)
 * es neutral y no cambió al migrar de proveedor: la interfaz sigue igual.
 */

import { priceBreakdown, suggestedPriceCents } from "@/lib/pricing";
import {
  getBlueprint,
  getStandardShippingCosts,
  getVariantCosts,
  listBlueprintVariants,
  listBlueprints,
  listPrintProviders,
  printify,
  printifyShopId,
  resolvePrintProviderId,
  uploadImageByUrl,
  type PrintifyProduct,
} from "@/lib/printify.server";

export { suggestedPriceCents };

export type CatalogItem = {
  id: number;
  title: string;
  brand: string | null;
  type: string;
  typeName: string;
  image: string;
  variantCount: number;
  description: string;
  /** Categoría raíz en español (Ropa de hombre, Hogar, etc.). */
  category: string;
  categoryId: number;
};

export type CatalogVariant = {
  id: number;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  image: string;
  costUsd: number;
  /** Costo base (fabricación + envío) en centavos MXN. */
  costCents: number;
  /** Sólo fabricación, en centavos MXN. */
  productionCents: number;
  /** Sólo envío, en centavos MXN. */
  shippingCents: number;
  priceCents: number;
  /** Ganancia del vendedor en centavos MXN y su porcentaje sobre el precio final. */
  marginCents: number;
  marginPct: number;
  markup: number;
  inStock: boolean;
};

export type ProviderOption = { id: number; name: string; location: string | null };

export type Placement = {
  id: string;
  label: string;
  /** Medidas del área imprimible en píxeles. */
  areaWidth: number;
  areaHeight: number;
};

const TTL_MS = 30 * 60 * 1000;
let itemsCache: { at: number; items: CatalogItem[] } | null = null;

/**
 * Categorías de DªTªBLe. El catálogo del proveedor no expone un árbol de
 * categorías, así que se clasifican por palabras clave del título/modelo.
 */
const CATEGORY_RULES: Array<{ id: number; name: string; re: RegExp }> = [
  { id: 1, name: "Playeras y camisetas", re: /\b(tee|t-shirt|shirt|jersey|tank|polo)\b/i },
  { id: 2, name: "Sudaderas y abrigos", re: /\b(hoodie|sweatshirt|sweater|jacket|crewneck|fleece)\b/i },
  { id: 3, name: "Gorras y sombreros", re: /\b(hat|cap|beanie|visor|bucket)\b/i },
  { id: 4, name: "Tazas y termos", re: /\b(mug|tumbler|bottle|can cooler|glass|flask)\b/i },
  { id: 5, name: "Bolsas y mochilas", re: /\b(bag|tote|backpack|pouch|duffle)\b/i },
  { id: 6, name: "Fundas de celular", re: /\b(phone case|iphone|samsung|case)\b/i },
  { id: 7, name: "Cuadros y pósters", re: /\b(poster|canvas|print|framed|wall)\b/i },
  { id: 8, name: "Hogar y decoración", re: /\b(pillow|blanket|towel|mat|apron|curtain|magnet|coaster)\b/i },
  { id: 9, name: "Papelería", re: /\b(sticker|notebook|journal|card|calendar|mouse pad)\b/i },
  { id: 10, name: "Ropa de niños", re: /\b(kids|youth|toddler|baby|infant)\b/i },
  { id: 11, name: "Accesorios", re: /\b(socks|scarf|gloves|keychain|apparel accessory|bandana)\b/i },
];

function classify(title: string, model: string | null): { category: string; categoryId: number } {
  const text = `${title} ${model ?? ""}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) return { category: rule.name, categoryId: rule.id };
  }
  return { category: "Otros", categoryId: 99 };
}

function typeOf(title: string): string {
  return classify(title, null).category;
}

export async function listCatalog(): Promise<CatalogItem[]> {
  if (itemsCache && Date.now() - itemsCache.at < TTL_MS) return itemsCache.items;
  const blueprints = await listBlueprints();
  const items = blueprints.map((b) => {
    const c = classify(b.title, b.model);
    return {
      id: b.id,
      title: b.title,
      brand: b.brand,
      type: String(c.categoryId),
      typeName: c.category,
      image: b.images[0] ?? "",
      variantCount: 0,
      description: (b.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
      category: c.category,
      categoryId: c.categoryId,
    };
  });
  itemsCache = { at: Date.now(), items };
  return items;
}

/** Color aproximado a partir del nombre que da el proveedor (no publica hex). */
const COLOR_HEX: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  navy: "#1b2a4a",
  red: "#c0272d",
  scarlet: "#c0272d",
  blue: "#2a5db0",
  royal: "#2a5db0",
  green: "#2f7a45",
  forest: "#1e4d2b",
  grey: "#9aa0a6",
  gray: "#9aa0a6",
  charcoal: "#4a4a4a",
  heather: "#b9bcc0",
  sand: "#d9c9a8",
  cream: "#f2e9d8",
  natural: "#efe6d3",
  pink: "#e58bb0",
  purple: "#6d4aff",
  yellow: "#f2c744",
  orange: "#e4762c",
  brown: "#6b4a34",
  chocolate: "#4b3225",
  maroon: "#5c1f28",
  indigo: "#39406e",
  silver: "#cfd3d6",
  gold: "#c9a227",
};

function hexFor(color: string | null): string | null {
  if (!color) return null;
  const key = color.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_HEX)) {
    if (key.includes(name)) return hex;
  }
  return null;
}

/** Fabricantes que pueden producir este artículo del catálogo. */
export async function getProductProviders(productId: number): Promise<ProviderOption[]> {
  const list = await listPrintProviders(productId);
  return list.map((p) => ({ id: p.id, name: p.title, location: p.location }));
}

export async function getCatalogVariants(
  productId: number,
  requestedProviderId?: number,
): Promise<{
  product: CatalogItem;
  variants: CatalogVariant[];
  printProviderId: number;
  shippingEstimated: boolean;
}> {
  const printProviderId =
    requestedProviderId && requestedProviderId > 0 ? requestedProviderId : await resolvePrintProviderId(productId);
  const [blueprint, rawVariants] = await Promise.all([
    getBlueprint(productId),
    listBlueprintVariants(productId, printProviderId),
  ]);

  const ids = rawVariants.map((v) => v.id);
  const [costs, shipping] = await Promise.all([
    getVariantCosts(productId, printProviderId, ids),
    getStandardShippingCosts(productId, printProviderId, "MX"),
  ]);

  // Si el proveedor no publica envío para alguna variante se usa el promedio
  // conocido: el costo base nunca queda subestimado.
  const shippingValues = [...shipping.values()];
  const fallbackShipping = shippingValues.length
    ? Math.round(shippingValues.reduce((a, b) => a + b, 0) / shippingValues.length)
    : 0;

  const c = classify(blueprint.title, blueprint.model);
  const product: CatalogItem = {
    id: blueprint.id,
    title: blueprint.title,
    brand: blueprint.brand,
    type: String(c.categoryId),
    typeName: c.category,
    image: blueprint.images[0] ?? "",
    variantCount: rawVariants.length,
    description: (blueprint.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
    category: c.category,
    categoryId: c.categoryId,
  };

  const variants: CatalogVariant[] = rawVariants.map((v, index) => {
    const costCentsUsd = costs.get(v.id) ?? 0;
    const shipCentsUsd = shipping.get(v.id) ?? fallbackShipping;
    const money = priceBreakdown(costCentsUsd / 100, shipCentsUsd / 100);
    const color = v.options["color"] ?? null;
    const size = v.options["size"] ?? null;
    return {
      id: v.id,
      name: v.title,
      size,
      color,
      colorCode: hexFor(color),
      image: blueprint.images[index % Math.max(1, blueprint.images.length)] ?? product.image,
      costUsd: money.costUsd + money.shippingUsd,
      costCents: money.costCents,
      productionCents: money.productionCents,
      shippingCents: money.shippingCents,
      priceCents: money.priceCents,
      marginCents: money.marginCents,
      marginPct: money.marginPct,
      markup: money.markup,
      // Agotada = el fabricante la reporta sin existencias, o no hay costo real
      // para calcularla. En ambos casos no se puede vender.
      inStock: v.available !== false && (costs.size === 0 ? true : costs.has(v.id)),

    };
  });

  return { product, variants, printProviderId, shippingEstimated: shipping.size === 0 };
}

const PLACEMENT_ES: Record<string, string> = {
  front: "Frente",
  back: "Espalda",
  neck: "Cuello",
  "sleeve-left": "Manga izquierda",
  "sleeve-right": "Manga derecha",
  left: "Lado izquierdo",
  right: "Lado derecho",
  top: "Arriba",
  bottom: "Abajo",
  inside: "Interior",
  outside: "Exterior",
  default: "Área principal",
  cover: "Portada",
  wrap: "Alrededor",
};

function placementLabel(id: string): string {
  return (
    PLACEMENT_ES[id] ??
    id.replace(/[-_]/g, " ").replace(/^\w/, (m) => m.toUpperCase())
  );
}

/** Zonas de estampado disponibles para un producto, con el tamaño real del área. */
export async function getPlacements(
  productId: number,
  variantId?: number,
  requestedProviderId?: number,
): Promise<Placement[]> {
  const printProviderId =
    requestedProviderId && requestedProviderId > 0 ? requestedProviderId : await resolvePrintProviderId(productId);
  const variants = await listBlueprintVariants(productId, printProviderId);
  const chosen = (variantId && variants.find((v) => v.id === variantId)) || variants.find((v) => v.placeholders.length);
  if (!chosen) return [];
  return chosen.placeholders.map((p) => ({
    id: p.position,
    label: placementLabel(p.position),
    areaWidth: p.width,
    areaHeight: p.height,
  }));
}

export type MockupResult = { placement: string; variantIds: number[]; url: string };

/** Borra maquetas técnicas antiguas para no dejar basura en el proveedor. */
async function cleanupDraftMockups(shopId: number) {
  try {
    const res = await printify<{ data: Array<{ id: string; title: string; created_at: string }> }>(
      `/v1/shops/${shopId}/products.json?limit=50`,
    );
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const p of res.data || []) {
      if (!p.title?.startsWith("DATABLE-MOCKUP")) continue;
      if (new Date(p.created_at).getTime() > cutoff) continue;
      await printify(`/v1/shops/${shopId}/products/${p.id}.json`, { method: "DELETE" }).catch(() => null);
    }
  } catch {
    /* limpieza best-effort */
  }
}

/**
 * Genera las maquetas (fotos del producto con el diseño puesto).
 * scale/offset vienen en fracción (0-1) del área imprimible.
 */
export async function generateMockups(input: {
  productId: number;
  variantIds: number[];
  placement: string;
  imageUrl: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  angle?: number;
  printProviderId?: number;
}): Promise<MockupResult[]> {
  const printProviderId =
    input.printProviderId && input.printProviderId > 0
      ? input.printProviderId
      : await resolvePrintProviderId(input.productId);
  const shopId = await printifyShopId();
  const placements = await getPlacements(input.productId, input.variantIds[0], printProviderId);
  const area = placements.find((p) => p.id === input.placement) ?? placements[0];
  if (!area) throw new Error("Este producto no admite diseño personalizado.");

  const upload = await uploadImageByUrl(input.imageUrl, `datable-${Date.now()}.png`);

  const scale = Math.min(Math.max(input.scale ?? 0.8, 0.1), 1);
  // offsetX/offsetY son el CENTRO del diseño dentro del área imprimible.
  const x = Math.min(Math.max(input.offsetX ?? 0.5, 0.05), 0.95);
  const y = Math.min(Math.max(input.offsetY ?? 0.5, 0.05), 0.95);
  const angle = Math.round(input.angle ?? 0);
  const variantIds = input.variantIds.slice(0, 10);

  const created = await printify<PrintifyProduct>(`/v1/shops/${shopId}/products.json`, {
    method: "POST",
    body: {
      title: `DATABLE-MOCKUP ${Date.now()}`,
      description: "Vista previa generada por DªTªBLe.",
      blueprint_id: input.productId,
      print_provider_id: printProviderId,
      variants: variantIds.map((id) => ({ id, price: 10000, is_enabled: true })),
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            { position: area.id, images: [{ id: upload.id, x, y, scale, angle }] },
          ],
        },
      ],
    },
  });

  // La maqueta vive en el CDN del proveedor: el producto técnico se limpia
  // después (nunca se publica y no genera costo).
  void cleanupDraftMockups(shopId);

  const images = (created.images || []).filter((img) => !area.id || img.position === area.id);
  const source = images.length ? images : created.images || [];
  const seen = new Set<string>();
  const out: MockupResult[] = [];
  for (const img of source) {
    if (seen.has(img.src)) continue;
    seen.add(img.src);
    out.push({ placement: img.position || area.id, variantIds: img.variant_ids || variantIds, url: img.src });
    if (out.length >= 8) break;
  }
  if (!out.length) throw new Error("No se pudo generar la maqueta. Inténtalo otra vez.");
  return out;
}

/** Fabricante asignado a un producto del catálogo (lo usa el conector). */
export async function catalogPrintProviderId(productId: number): Promise<number> {
  return resolvePrintProviderId(productId);
}
