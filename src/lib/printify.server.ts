/**
 * Cliente de bajo nivel del proveedor de fabricación bajo demanda (Printify).
 *
 * Server-only. Nunca se importa desde el navegador: usa el token privado.
 * Todo lo que sabe de Printify vive aquí o en el conector
 * `src/lib/commerce/providers/printify.server.ts`; el resto de DªTªBLe
 * sigue hablando en términos neutrales (catálogo, variante, área, maqueta).
 */

import { cached, mapToRecord, recordToMap } from "@/lib/provider-cache.server";

const BASE_URL = "https://api.printify.com";

/** Imagen mínima válida usada sólo para sondear costos reales del catálogo. */
const PROBE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export type PrintifyVariant = {
  id: number;
  title: string;
  options: Record<string, string>;
  placeholders: Array<{ position: string; width: number; height: number }>;
  /** false cuando el fabricante la reporta agotada: no se puede vender. */
  available: boolean;
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

type RawBlueprint = { id: number; title: string; description: string; brand: string; model: string; images: string[] };

function mapBlueprint(b: RawBlueprint): PrintifyBlueprint {
  return {
    id: b.id,
    title: b.title,
    description: b.description || "",
    brand: b.brand || null,
    model: b.model || null,
    images: Array.isArray(b.images) ? b.images : [],
  };
}

export type BlueprintFetch = {
  items: PrintifyBlueprint[];
  /** Páginas realmente solicitadas al catálogo. */
  pagesFetched: number;
  /** true si el catálogo respondió con envoltura paginada ({data, last_page}). */
  paginated: boolean;
  /** last_page informado por el catálogo, cuando existe. */
  reportedLastPage: number | null;
  fromCache: boolean;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 60;
/** El catálogo cambia poco: se conserva un día completo en base de datos. */
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Recorre TODAS las páginas del catálogo base.
 *
 * El endpoint del catálogo puede responder de dos formas según la cuenta:
 * un arreglo completo, o una envoltura paginada `{ data, current_page,
 * last_page }`. Aquí se soportan ambas y se deduplica por id, de modo que
 * DªTªBLe siempre termine con el catálogo íntegro disponible para la cuenta.
 *
 * El resultado se guarda en base de datos: el catálogo del proveedor tiene un
 * límite de 100 consultas por minuto y recorrerlo son decenas de páginas.
 */
export async function fetchAllBlueprints(force = false): Promise<BlueprintFetch> {
  const key = "catalog:blueprints";
  const before = force ? null : await import("@/lib/provider-cache.server").then((m) => m.readCache<BlueprintFetch>(key));
  if (before) return { ...before, fromCache: true };

  return cached<BlueprintFetch>(
    key,
    CATALOG_TTL_MS,
    async () => {
      const items: PrintifyBlueprint[] = [];
      const seen = new Set<number>();
      let pagesFetched = 0;
      let paginated = false;
      let reportedLastPage: number | null = null;

      for (let page = 1; page <= MAX_PAGES; page++) {
        const raw = await printify<
          RawBlueprint[] | { data?: RawBlueprint[]; last_page?: number; current_page?: number }
        >(`/v1/catalog/blueprints.json?page=${page}&limit=${PAGE_SIZE}`);
        pagesFetched = page;

        const isArray = Array.isArray(raw);
        const list: RawBlueprint[] = isArray ? raw : Array.isArray(raw?.data) ? raw.data! : [];
        if (!isArray) {
          paginated = true;
          const last = (raw as { last_page?: number }).last_page;
          if (typeof last === "number") reportedLastPage = last;
        }

        let added = 0;
        for (const b of list) {
          if (!b || typeof b.id !== "number" || seen.has(b.id)) continue;
          seen.add(b.id);
          items.push(mapBlueprint(b));
          added++;
        }

        if (!list.length) break;
        // El catálogo ignoró la paginación y devolvió todo de una vez.
        if (!added) break;
        if (reportedLastPage !== null && page >= reportedLastPage) break;
        if (isArray && list.length < PAGE_SIZE) break;
      }

      return { items, pagesFetched, paginated, reportedLastPage, fromCache: false } satisfies BlueprintFetch;
    },
    force,
  );
}


export async function listBlueprints(): Promise<PrintifyBlueprint[]> {
  return (await fetchAllBlueprints()).items;
}

export async function getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
  const all = await listBlueprints();
  const found = all.find((b) => b.id === blueprintId);
  if (found) return found;
  const b = await printify<RawBlueprint>(`/v1/catalog/blueprints/${blueprintId}.json`);
  return mapBlueprint(b);
}

export type PrintProviderOption = { id: number; title: string; location: string | null };

/** Fabricantes disponibles para un producto del catálogo. */
export async function listPrintProviders(blueprintId: number): Promise<PrintProviderOption[]> {
  return cached<PrintProviderOption[]>(`catalog:providers:${blueprintId}`, CATALOG_TTL_MS, async () => {
    const raw = await printify<Array<{ id: number; title: string; location?: { country?: string } }>>(
      `/v1/catalog/blueprints/${blueprintId}/print_providers.json`,
    );
    return (raw || []).map((p) => ({
      id: p.id,
      title: p.title,
      location: p.location?.country ?? null,
    }));
  });
}

/**
 * Fabricante asignado a un producto del catálogo.
 * Se elige siempre el primero que ofrece el proveedor y se memoriza, para que
 * el costo mostrado al comerciante y el costo real del pedido coincidan.
 */
export async function resolvePrintProviderId(blueprintId: number): Promise<number> {
  const providers = await listPrintProviders(blueprintId);
  const id = providers[0]?.id;
  if (!id) throw new PrintifyError("Este producto no tiene fabricante disponible.", 0, false);
  return id;
}

type RawVariant = {
  id: number;
  title: string;
  options?: Record<string, string>;
  placeholders?: Array<{ position: string; width: number; height: number }>;
};

/**
 * Variantes de un producto del catálogo, marcando cuáles están agotadas.
 *
 * El catálogo omite por omisión las variantes sin existencias. Se pide también
 * la lista completa (`show-out-of-stock=1`) para poder MOSTRAR la talla/color
 * agotado sin dejar que se compre. Las existencias cambian seguido, así que
 * esta consulta se guarda menos tiempo que el resto del catálogo.
 */
const STOCK_TTL_MS = 60 * 60 * 1000;

export async function listBlueprintVariants(
  blueprintId: number,
  printProviderId: number,
): Promise<PrintifyVariant[]> {
  return cached<PrintifyVariant[]>(
    `catalog:variants:${blueprintId}:${printProviderId}`,
    STOCK_TTL_MS,
    async () => {
      const base = `/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`;
      const [all, inStock] = await Promise.all([
        printify<{ variants: RawVariant[] }>(`${base}?show-out-of-stock=1`),
        printify<{ variants: RawVariant[] }>(base).catch(() => ({ variants: [] as RawVariant[] })),
      ]);

      const list = all.variants?.length ? all.variants : inStock.variants || [];
      const availableIds = new Set((inStock.variants || []).map((v) => v.id));
      // Si la consulta de existencias falló, no se marca nada como agotado:
      // más vale mostrar todo que ocultar catálogo por un error temporal.
      const knowsStock = (inStock.variants || []).length > 0;

      return (list || []).map((v) => ({
        id: v.id,
        title: v.title,
        options: v.options || {},
        placeholders: (v.placeholders || []).map((p) => ({
          position: p.position,
          width: p.width,
          height: p.height,
        })),
        available: knowsStock ? availableIds.has(v.id) : true,
      }));
    },
  );
}


// ---------------------------------------------------------------------------
// Costos reales de fabricación
// ---------------------------------------------------------------------------

/** Los costos de fabricación cambian poco: se guardan una semana en base. */
const COST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Costos reales por variante, en centavos de dólar.
 *
 * El catálogo público del proveedor no publica precios: el costo sólo aparece
 * al armar el producto. Por eso se crea un producto técnico temporal con la
 * imagen de sondeo, se leen los costos y se elimina de inmediato. El resultado
 * queda GUARDADO EN BASE DE DATOS: esa operación es la más cara de todas y
 * repetirla por cada visita al catálogo provoca bloqueos por exceso de uso.
 */
export async function getVariantCosts(
  blueprintId: number,
  printProviderId: number,
  variantIds: number[],
): Promise<Map<number, number>> {
  const ids = variantIds.slice(0, 100);
  if (!ids.length) return new Map();

  const record = await cached<Record<string, number>>(
    `costs:${blueprintId}:${printProviderId}`,
    COST_TTL_MS,
    async () => {
      const costs = new Map<number, number>();
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
      return mapToRecord(costs);
    },
  );

  return recordToMap(record);
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

/**
 * Costo de envío estándar del primer artículo, por variante, en centavos de dólar.
 * Es la parte de envío del costo base que DªTªBLe absorbe en el precio.
 * Se guarda en base de datos igual que los costos de fabricación.
 */
export async function getStandardShippingCosts(
  blueprintId: number,
  printProviderId: number,
  countryCode = "MX",
): Promise<Map<number, number>> {
  const record = await cached<Record<string, number>>(
    `shipping:${blueprintId}:${printProviderId}:${countryCode}`,
    COST_TTL_MS,
    async () => {
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
      return mapToRecord(costs);
    },
  );
  return recordToMap(record);
}

// ---------------------------------------------------------------------------
// Publicación de productos
// ---------------------------------------------------------------------------

/**
 * Cierra el ciclo de publicación del proveedor.
 *
 * DªTªBLe es el comerciante de registro: la tienda visible es la nuestra, no
 * un canal externo. Aun así el proveedor exige marcar el producto como
 * publicado; si no, queda bloqueado en estado "publicando" y no se puede
 * editar ni pedir. Por eso: publish → publishing_succeeded con la referencia
 * de DªTªBLe.
 */
export async function publishProduct(
  shopId: number,
  externalProductId: string,
  ref: { handle: string; externalId: string },
): Promise<void> {
  await printify(`/v1/shops/${shopId}/products/${externalProductId}/publish.json`, {
    method: "POST",
    body: { title: true, description: true, images: true, variants: true, tags: true, keyFeatures: true, shipping_template: true },
  });
  await printify(`/v1/shops/${shopId}/products/${externalProductId}/publishing_succeeded.json`, {
    method: "POST",
    body: { external: { id: ref.externalId, handle: ref.handle } },
  });
}

/** Marca el producto como no publicado (antes de borrarlo o al ocultarlo). */
export async function unpublishProduct(shopId: number, externalProductId: string): Promise<void> {
  await printify(`/v1/shops/${shopId}/products/${externalProductId}/unpublish.json`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Producción y pedidos
// ---------------------------------------------------------------------------

/**
 * Manda un pedido ya creado a la línea de producción.
 *
 * Se aísla aquí a propósito: crear el pedido en el proveedor NO debe producirlo.
 * Sólo el orquestador, después de confirmar el pago, puede llamar a esto.
 */
export async function sendOrderToProduction(shopId: number, externalOrderId: string): Promise<void> {
  await printify(`/v1/shops/${shopId}/orders/${externalOrderId}/send_to_production.json`, { method: "POST" });
}

export type PrintifyOrder = {
  id: string;
  status: string;
  external_id?: string | null;
  shipments?: Array<{ carrier?: string; number?: string; url?: string; delivered_at?: string | null }>;
};

/** Estado real de un pedido en el proveedor (reconciliación). */
export async function getOrder(shopId: number, externalOrderId: string): Promise<PrintifyOrder | null> {
  try {
    return await printify<PrintifyOrder>(`/v1/shops/${shopId}/orders/${externalOrderId}.json`);
  } catch (err) {
    if (err instanceof PrintifyError && err.status === 404) return null;
    throw err;
  }
}

/** Listado de pedidos del espacio de fabricación (reconciliación por lotes). */
export async function listOrders(shopId: number, page = 1, limit = 20): Promise<PrintifyOrder[]> {
  const res = await printify<{ data?: PrintifyOrder[] } | PrintifyOrder[]>(
    `/v1/shops/${shopId}/orders.json?page=${page}&limit=${Math.min(limit, 50)}`,
  );
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

/**
 * Cancela un pedido en el proveedor.
 * Sólo funciona mientras no haya entrado a producción; devuelve false si ya no
 * es posible, para que el flujo de reembolso lo informe con claridad.
 */
export async function cancelOrder(shopId: number, externalOrderId: string): Promise<boolean> {
  try {
    await printify(`/v1/shops/${shopId}/orders/${externalOrderId}/cancel.json`, { method: "POST" });
    return true;
  } catch (err) {
    if (err instanceof PrintifyError && err.status >= 400 && err.status < 500) return false;
    throw err;
  }
}

/** Webhooks registrados en el espacio de fabricación (para diagnóstico interno). */
export async function listWebhooks(shopId: number): Promise<Array<{ id: string; topic: string; url: string }>> {

  return printify<Array<{ id: string; topic: string; url: string }>>(`/v1/shops/${shopId}/webhooks.json`);
}
