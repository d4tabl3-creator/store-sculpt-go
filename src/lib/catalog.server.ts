/**
 * Catálogo abierto del proveedor de fulfillment.
 * Server-only: usa el token privado y nunca lo expone al navegador.
 */

import { priceBreakdown, suggestedPriceCents } from "@/lib/pricing";

const BASE_URL = "https://api.printful.com";

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
  /** Costo del proveedor convertido a centavos MXN. */
  costCents: number;
  priceCents: number;
  /** Ganancia bruta en centavos MXN y su porcentaje sobre el precio final. */
  marginCents: number;
  marginPct: number;
  markup: number;
  inStock: boolean;
};

export type Placement = {
  id: string;
  label: string;
  /** Medidas del área imprimible en píxeles. */
  areaWidth: number;
  areaHeight: number;
};

let cache: { at: number; items: CatalogItem[] } | null = null;
let catCache: { at: number; roots: Map<number, string> } | null = null;
let storeIdCache: number | null = null;
const TTL_MS = 30 * 60 * 1000;

/** Nombres de categorías del proveedor traducidos al español de DªTªBLe. */
const CATEGORY_ES: Record<string, string> = {
  "Men's clothing": "Ropa de hombre",
  "Women's clothing": "Ropa de mujer",
  "Kids' & youth clothing": "Ropa de niños",
  Accessories: "Accesorios",
  "Home & living": "Hogar y decoración",
  "Hats & caps": "Gorras y sombreros",
  Sports: "Deportes",
  "Wall art": "Cuadros y pósters",
  Drinkware: "Tazas y termos",
  Stationery: "Papelería",
  "Phone cases": "Fundas de celular",
  Bags: "Bolsas y mochilas",
  Shoes: "Calzado",
  Jewelry: "Joyería",
};

function token(): string {
  const t = process.env["PRINTFUL_API_TOKEN"];
  if (!t) throw new Error("El catálogo no está disponible por ahora.");
  return t;
}

async function api<T>(path: string, init?: { method?: string; body?: unknown; withStore?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
  if (init?.withStore) headers["X-PF-Store-Id"] = String(await storeId());
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `Catálogo no disponible (${res.status})`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) msg = j.error.message;
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(msg);
  }
  const json = JSON.parse(text) as { result?: T };
  return (json.result ?? (json as unknown)) as T;
}

async function storeId(): Promise<number> {
  if (storeIdCache) return storeIdCache;
  const envId = Number(process.env["PRINTFUL_STORE_ID"] || 0);
  if (envId) {
    storeIdCache = envId;
    return envId;
  }
  const res = await fetch(`${BASE_URL}/stores`, { headers: { Authorization: `Bearer ${token()}` } });
  const json = (await res.json()) as { result?: Array<{ id: number }> };
  const id = json.result?.[0]?.id;
  if (!id) throw new Error("El estudio de diseño no está disponible por ahora.");
  storeIdCache = id;
  return id;
}

/** Mapa categoría → nombre de su categoría raíz (ya en español cuando existe traducción). */
async function rootCategories(): Promise<Map<number, string>> {
  if (catCache && Date.now() - catCache.at < TTL_MS) return catCache.roots;
  const cats = await api<Array<{ id: number; parent_id: number; title: string }>>("/categories");
  const byId = new Map(cats.map((c) => [c.id, c]));
  const roots = new Map<number, string>();
  for (const c of cats) {
    let cur = c;
    let guard = 0;
    while (cur.parent_id && byId.has(cur.parent_id) && guard++ < 10) cur = byId.get(cur.parent_id)!;
    roots.set(c.id, CATEGORY_ES[cur.title] ?? cur.title);
  }
  catCache = { at: Date.now(), roots };
  return roots;
}

export async function listCatalog(): Promise<CatalogItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const [raw, roots] = await Promise.all([
    api<
      Array<{
        id: number;
        title: string;
        brand: string | null;
        type: string;
        type_name: string;
        main_category_id: number;
        image: string;
        variant_count: number;
        description: string;
        is_discontinued: boolean;
      }>
    >("/products"),
    rootCategories().catch(() => new Map<number, string>()),
  ]);
  const items = raw
    .filter((p) => !p.is_discontinued)
    .map((p) => ({
      id: p.id,
      title: p.title,
      brand: p.brand ?? null,
      type: p.type,
      typeName: p.type_name,
      image: p.image,
      variantCount: p.variant_count,
      description: (p.description || "").slice(0, 400),
      categoryId: p.main_category_id,
      category: roots.get(p.main_category_id) ?? "Otros",
    }));
  cache = { at: Date.now(), items };
  return items;
}

export async function getCatalogVariants(productId: number): Promise<{
  product: CatalogItem;
  variants: CatalogVariant[];
}> {
  const data = await api<{
    product: {
      id: number;
      title: string;
      brand: string | null;
      type: string;
      type_name: string;
      main_category_id: number;
      image: string;
      variant_count: number;
      description: string;
    };
    variants: Array<{
      id: number;
      name: string;
      size: string | null;
      color: string | null;
      color_code: string | null;
      image: string;
      price: string;
      in_stock: boolean;
    }>;
  }>(`/products/${productId}`);

  const roots = await rootCategories().catch(() => new Map<number, string>());

  return {
    product: {
      id: data.product.id,
      title: data.product.title,
      brand: data.product.brand ?? null,
      type: data.product.type,
      typeName: data.product.type_name,
      image: data.product.image,
      variantCount: data.product.variant_count,
      description: (data.product.description || "").slice(0, 400),
      categoryId: data.product.main_category_id,
      category: roots.get(data.product.main_category_id) ?? "Otros",
    },
    variants: data.variants.map((v) => {
      const costUsd = Number(v.price) || 0;
      const money = priceBreakdown(costUsd);
      return {
        id: v.id,
        name: v.name,
        size: v.size ?? null,
        color: v.color ?? null,
        colorCode: v.color_code ?? null,
        image: v.image,
        costUsd,
        costCents: money.costCents,
        priceCents: money.priceCents,
        marginCents: money.marginCents,
        marginPct: money.marginPct,
        markup: money.markup,
        inStock: v.in_stock,
      };
    }),
  };
}

const PLACEMENT_ES: Record<string, string> = {
  front: "Frente",
  front_large: "Frente grande",
  back: "Espalda",
  sleeve_left: "Manga izquierda",
  sleeve_right: "Manga derecha",
  label_inside: "Etiqueta interior",
  label_outside: "Etiqueta exterior",
  default: "Área principal",
  embroidery_front: "Bordado frente",
  embroidery_back: "Bordado espalda",
};

/** Zonas de estampado disponibles para un producto, con el tamaño real del área. */
export async function getPlacements(productId: number, variantId?: number): Promise<Placement[]> {
  const data = await api<{
    available_placements: Record<string, string>;
    printfiles: Array<{ printfile_id: number; width: number; height: number }>;
    variant_printfiles: Array<{ variant_id: number; placements: Record<string, number> }>;
  }>(`/mockup-generator/printfiles/${productId}`, { withStore: true });

  const files = new Map(data.printfiles.map((f) => [f.printfile_id, f]));
  const vp = (variantId && data.variant_printfiles.find((v) => v.variant_id === variantId)) || data.variant_printfiles[0];
  const out: Placement[] = [];
  for (const [id, label] of Object.entries(data.available_placements)) {
    const f = vp ? files.get(vp.placements[id]!) : undefined;
    if (!f) continue;
    out.push({ id, label: PLACEMENT_ES[id] ?? label, areaWidth: f.width, areaHeight: f.height });
  }
  return out;
}

export type MockupResult = { placement: string; variantIds: number[]; url: string };

/**
 * Genera las maquetas (fotos del producto con el diseño puesto) y espera el resultado.
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
}): Promise<MockupResult[]> {
  const placements = await getPlacements(input.productId, input.variantIds[0]);
  const area = placements.find((p) => p.id === input.placement) ?? placements[0];
  if (!area) throw new Error("Este producto no admite diseño personalizado.");

  const scale = Math.min(Math.max(input.scale ?? 0.8, 0.1), 1);
  const width = Math.round(area.areaWidth * scale);
  const height = Math.round(area.areaHeight * scale);
  const left = Math.round(Math.min(Math.max(input.offsetX ?? (1 - scale) / 2, 0), 1 - scale) * area.areaWidth);
  const top = Math.round(Math.min(Math.max(input.offsetY ?? (1 - scale) / 2, 0), 1 - scale) * area.areaHeight);

  const task = await api<{ task_key: string }>(`/mockup-generator/create-task/${input.productId}`, {
    method: "POST",
    withStore: true,
    body: {
      variant_ids: input.variantIds.slice(0, 10),
      format: "jpg",
      files: [
        {
          placement: area.id,
          image_url: input.imageUrl,
          position: { area_width: area.areaWidth, area_height: area.areaHeight, width, height, top, left },
        },
      ],
    },
  });

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await api<{
      status: string;
      error?: string;
      mockups?: Array<{ placement: string; variant_ids: number[]; mockup_url: string }>;
    }>(`/mockup-generator/task?task_key=${task.task_key}`, { withStore: true });
    if (res.status === "completed") {
      return (res.mockups ?? []).map((m) => ({ placement: m.placement, variantIds: m.variant_ids, url: m.mockup_url }));
    }
    if (res.status === "failed") throw new Error(res.error || "No se pudo generar la maqueta.");
  }
  throw new Error("La maqueta está tardando de más. Inténtalo otra vez.");
}
