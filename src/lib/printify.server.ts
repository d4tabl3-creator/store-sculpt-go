/**
 * Cliente de bajo nivel del proveedor de fabricación bajo demanda (Printify).
 *
 * Server-only. Nunca se importa desde el navegador: usa el token privado.
 * Todo lo que sabe de Printify vive aquí o en el conector
 * `src/lib/commerce/providers/printify.server.ts`; el resto de DªTªBLe
 * sigue hablando en términos neutrales (catálogo, variante, área, maqueta).
 */

const BASE_URL = "https://api.printify.com";

/** Imagen mínima válida usada sólo para sondear costos reales del catálogo. */
const PROBE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export type PrintifyVariant = {
  id: number;
  title: string;
  options: Record<string, string>;
  placeholders: Array<{ position: string; width: number; height: number }>;
};

export type PrintifyBlueprint = {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  model: string | null;
  images: string[];
};

export type PrintifyProductVariant = {
  id: number;
  sku: string;
  cost: number;
  price: number;
  title: string;
  is_enabled: boolean;
  is_available: boolean;
};

export type PrintifyProduct = {
  id: string;
  title: string;
  variants: PrintifyProductVariant[];
  images: Array<{ src: string; variant_ids: number[]; position: string; is_default: boolean }>;
};

export class PrintifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retriable: boolean,
  ) {
    super(message);
    this.name = "PrintifyError";
  }
}

export function printifyToken(): string | null {
  return process.env["PRINTIFY_API_TOKEN"] ?? null;
}

export function isPrintifyConfigured(): boolean {
  return !!printifyToken();
}

export async function printify<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = printifyToken();
  if (!token) {
    throw new PrintifyError("El proveedor de fabricación no está configurado.", 0, false);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "DaTaBLe/1.0",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `El proveedor respondió ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string; errors?: { reason?: string } };
      message = j.errors?.reason || j.message || message;
    } catch {
      /* respuesta no JSON */
    }
    throw new PrintifyError(message, res.status, res.status >= 500 || res.status === 429);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Tienda de fabricación (shop) — DªTªBLe es el comerciante de registro
// ---------------------------------------------------------------------------

let shopIdCache: number | null = null;

export async function printifyShopId(): Promise<number> {
  if (shopIdCache) return shopIdCache;
  const configured = Number(process.env["PRINTIFY_SHOP_ID"] || 0);
  if (configured > 0) {
    shopIdCache = configured;
    return configured;
  }
  const shops = await printify<Array<{ id: number; title: string }>>("/v1/shops.json");
  const id = shops?.[0]?.id;
  if (!id) throw new PrintifyError("No hay espacio de fabricación disponible.", 0, false);
  shopIdCache = id;
  return id;
}

// ---------------------------------------------------------------------------
// Biblioteca de imágenes
// ---------------------------------------------------------------------------

export type PrintifyUpload = {
  id: string;
  file_name: string;
  preview_url: string | null;
};

/** Sube un archivo de impresión permanente a la biblioteca del proveedor. */
export async function uploadImageByUrl(url: string, fileName: string): Promise<PrintifyUpload> {
  return printify<PrintifyUpload>("/v1/uploads/images.json", {
    method: "POST",
    body: { file_name: fileName, url },
  });
}

let probeImageId: string | null = null;

/** Imagen técnica reutilizable; sólo sirve para consultar costos y áreas. */
async function probeImage(): Promise<string> {
  if (probeImageId) return probeImageId;
  const up = await printify<PrintifyUpload>("/v1/uploads/images.json", {
    method: "POST",
    body: { file_name: "datable-probe.png", contents: PROBE_PNG_BASE64 },
  });
  probeImageId = up.id;
  return up.id;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

const TTL_MS = 30 * 60 * 1000;

let blueprintsCache: { at: number; items: PrintifyBlueprint[] } | null = null;

export async function listBlueprints(): Promise<PrintifyBlueprint[]> {
  if (blueprintsCache && Date.now() - blueprintsCache.at < TTL_MS) return blueprintsCache.items;
  const raw = await printify<
    Array<{ id: number; title: string; description: string; brand: string; model: string; images: string[] }>
  >("/v1/catalog/blueprints.json");
  const items = (raw || []).map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description || "",
    brand: b.brand || null,
    model: b.model || null,
    images: Array.isArray(b.images) ? b.images : [],
  }));
  blueprintsCache = { at: Date.now(), items };
  return items;
}

export async function getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
  const all = await listBlueprints();
  const found = all.find((b) => b.id === blueprintId);
  if (found) return found;
  const b = await printify<{ id: number; title: string; description: string; brand: string; model: string; images: string[] }>(
    `/v1/catalog/blueprints/${blueprintId}.json`,
  );
  return {
    id: b.id,
    title: b.title,
    description: b.description || "",
    brand: b.brand || null,
    model: b.model || null,
    images: Array.isArray(b.images) ? b.images : [],
  };
}

const providerCache = new Map<number, number>();

/**
 * Fabricante asignado a un producto del catálogo.
 * Se elige siempre el primero que ofrece el proveedor y se memoriza, para que
 * el costo mostrado al comerciante y el costo real del pedido coincidan.
 */
export async function resolvePrintProviderId(blueprintId: number): Promise<number> {
  const cached = providerCache.get(blueprintId);
  if (cached) return cached;
  const providers = await printify<Array<{ id: number; title: string }>>(
    `/v1/catalog/blueprints/${blueprintId}/print_providers.json`,
  );
  const id = providers?.[0]?.id;
  if (!id) throw new PrintifyError("Este producto no tiene fabricante disponible.", 0, false);
  providerCache.set(blueprintId, id);
  return id;
}

export async function listBlueprintVariants(
  blueprintId: number,
  printProviderId: number,
): Promise<PrintifyVariant[]> {
  const res = await printify<{ variants: PrintifyVariant[] }>(
    `/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
  );
  return (res.variants || []).map((v) => ({
    id: v.id,
    title: v.title,
    options: v.options || {},
    placeholders: (v.placeholders || []).map((p) => ({
      position: p.position,
      width: p.width,
      height: p.height,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Costos reales de fabricación
// ---------------------------------------------------------------------------

const costCache = new Map<string, { at: number; costs: Map<number, number> }>();

/**
 * Costos reales por variante, en centavos de dólar.
 *
 * El catálogo público del proveedor no publica precios: el costo sólo aparece
 * al armar el producto. Por eso se crea un producto técnico temporal con la
 * imagen de sondeo, se leen los costos y se elimina de inmediato. El resultado
 * se memoriza media hora para no repetir la operación.
 */
export async function getVariantCosts(
  blueprintId: number,
  printProviderId: number,
  variantIds: number[],
): Promise<Map<number, number>> {
  const key = `${blueprintId}:${printProviderId}`;
  const cached = costCache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.costs;

  const costs = new Map<number, number>();
  const ids = variantIds.slice(0, 100);
  if (!ids.length) return costs;

  const shopId = await printifyShopId();
  const variants = await listBlueprintVariants(blueprintId, printProviderId);
  const position = variants.find((v) => v.placeholders.length)?.placeholders[0]?.position ?? "front";
  const imageId = await probeImage();

  let created: PrintifyProduct | null = null;
  try {
    created = await printify<PrintifyProduct>(`/v1/shops/${shopId}/products.json`, {
      method: "POST",
      body: {
        title: "DATABLE-COST-PROBE",
        description: "Consulta interna de costos. No publicar.",
        blueprint_id: blueprintId,
        print_provider_id: printProviderId,
        variants: ids.map((id) => ({ id, price: 10000, is_enabled: true })),
        print_areas: [
          {
            variant_ids: ids,
            placeholders: [{ position, images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }],
          },
        ],
      },
    });
    for (const v of created.variants || []) {
      if (typeof v.cost === "number") costs.set(v.id, v.cost);
    }
  } finally {
    if (created?.id) {
      try {
        await printify(`/v1/shops/${shopId}/products/${created.id}.json`, { method: "DELETE" });
      } catch {
        /* limpieza best-effort */
      }
    }
  }

  costCache.set(key, { at: Date.now(), costs });
  return costs;
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

const shippingCache = new Map<string, { at: number; costs: Map<number, number> }>();

/**
 * Costo de envío estándar del primer artículo, por variante, en centavos de dólar.
 * Es la parte de envío del costo base que DªTªBLe absorbe en el precio.
 */
export async function getStandardShippingCosts(
  blueprintId: number,
  printProviderId: number,
  countryCode = "MX",
): Promise<Map<number, number>> {
  const key = `${blueprintId}:${printProviderId}:${countryCode}`;
  const cached = shippingCache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.costs;

  const costs = new Map<number, number>();
  try {
    const res = await printify<{
      data: Array<{
        attributes: {
          variantId: number;
          country: { code: string };
          shippingCost: { firstItem: { amount: number } };
        };
      }>;
    }>(`/v2/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping/standard.json`);
    for (const row of res.data || []) {
      const a = row.attributes;
      if (!a) continue;
      if (a.country?.code && a.country.code !== countryCode) continue;
      const amount = a.shippingCost?.firstItem?.amount;
      if (typeof amount === "number") costs.set(a.variantId, amount);
    }
  } catch {
    /* sin datos de envío: el costo base se queda con la fabricación */
  }

  shippingCache.set(key, { at: Date.now(), costs });
  return costs;
}
