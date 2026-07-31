import type {
  CommerceProvider,
  NormalizedWebhook,
  ProviderBinding,
  ProviderOrder,
  ProviderOrderResult,
  ProviderProduct,
  ProviderProductResult,
  ProviderStoreContext,
} from "../types";
import { OrchestratorError } from "../types";

const BASE_URL = "https://api.printful.com";

type PrintfulResponse<T> = { result?: T; error?: { message: string } };

function apiToken() {
  return process.env.PRINTFUL_API_TOKEN;
}

async function printful<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = apiToken();
  if (!token) {
    throw new OrchestratorError("Printful no está configurado", "printful", false);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  let json: PrintfulResponse<T> | null = null;
  try {
    json = JSON.parse(text) as PrintfulResponse<T>;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.error?.message || text || `Printful ${res.status}`;
    throw new OrchestratorError(msg, "printful", res.status >= 500 || res.status === 429, text.slice(0, 500));
  }
  return (json?.result ?? json) as T;
}


/**
 * El proveedor no permite crear cuentas por API: DªTªBLe opera como
 * comerciante de registro y aísla cada tienda por producto/pedido dentro
 * de su espacio de fulfillment. Elegimos el espacio configurado o el primero
 * disponible de la cuenta.
 */
async function findStore(ctx: ProviderStoreContext): Promise<{ id: number; name: string }> {
  const stores = await printful<Array<{ id: number; name: string; type: string }>>("/stores");
  if (!Array.isArray(stores) || !stores.length) {
    throw new OrchestratorError("No hay espacio de fulfillment disponible", "printful", false);
  }
  const configured = process.env.PRINTFUL_STORE_ID;
  const byEnv = configured ? stores.find((s) => String(s.id) === String(configured)) : null;
  const byName = stores.find((s) => s.name.toLowerCase().includes(ctx.slug.toLowerCase()));
  const preferred = stores.find((s) => !/personal orders/i.test(s.name));
  return byEnv || byName || preferred || stores[0];
}


/**
 * Búsqueda de respaldo en el catálogo real cuando el producto no trae
 * variante de origen (tiendas creadas antes del catálogo abierto).
 */
async function findCatalogVariantByKeyword(name: string): Promise<{ product_id: number; variant_id: number; name: string } | null> {
  try {
    const { listCatalog, getCatalogVariants } = await import("@/lib/catalog.server");
    const items = await listCatalog();
    const normalized = name.toLowerCase();
    const keywords: Array<{ test: RegExp; hint: RegExp }> = [
      { test: /hoodie|sudadera/i, hint: /hoodie/i },
      { test: /t[- ]?shirt|tee|playera/i, hint: /t-shirt|tee/i },
      { test: /cap|gorra|trucker|snapback/i, hint: /cap|hat/i },
      { test: /mug|taza/i, hint: /mug/i },
      { test: /tote|bag|bolsa|mochila/i, hint: /tote|bag/i },
      { test: /poster|cuadro|lienzo|canvas/i, hint: /poster|canvas/i },
    ];
    const hint = keywords.find((k) => k.test.test(normalized))?.hint ?? /t-shirt|tee/i;
    const candidates = items
      .filter((p) => hint.test(`${p.title} ${p.typeName ?? ""}`))
      .slice(0, 5);
    for (const candidate of candidates) {
      const { variants } = await getCatalogVariants(candidate.id);
      const variant = variants.find((v) => v.inStock) || variants[0];
      if (variant) return { product_id: candidate.id, variant_id: variant.id, name: variant.name };
    }
    return null;
  } catch (err) {
    console.error("Printful catalog search error:", err);
    return null;
  }
}

async function getDefaultVariant(): Promise<{ product_id: number; variant_id: number; name: string }> {
  const fallback = await findCatalogVariantByKeyword("Unisex Staple T-Shirt");
  if (fallback) return fallback;
  throw new OrchestratorError("No se encontró un producto base en Printful", "printful", true);
}


async function createSyncProduct(
  storeId: number,
  product: ProviderProduct,
  variantId: number,
): Promise<{ id: number; external_product_id: string; external_variant_id: string }> {
  const body = {
    sync_product: {
      name: product.name,
      thumbnail: product.imageUrl || undefined,
    },
    sync_variants: [
      {
        variant_id: variantId,
        retail_price: (product.priceCents / 100).toFixed(2),
        sku: `datable-${product.productId.slice(0, 8)}`,
        // El proveedor exige al menos un archivo de impresión por variante.
        files: [{ type: "default", url: product.imageUrl || `${publicBase()}/placeholder.svg` }],
      },
    ],

  };
  const created = await printful<{ id: number; external_id: string; sync_variants: Array<{ id: number; external_id: string }> }>(`/store/products?store_id=${storeId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    id: created.id,
    external_product_id: String(created.id),
    external_variant_id: String(created.sync_variants[0]?.id || created.id),
  };
}

export const printfulProvider: CommerceProvider = {
  id: "printful",
  label: "Fulfillment bajo demanda",

  isConfigured() {
    return !!apiToken();
  },

  async provisionStore(ctx: ProviderStoreContext) {
    const store = await findStore(ctx);
    return {
      externalStoreId: String(store.id),
      externalDomain: `store/${store.id}`,
      credentials: {
        adminToken: apiToken() || null,
        webhookSecret: null,
        apiVersion: "v2",
        extra: { storeName: store.name },
      },
    };
  },

  async registerWebhooks(binding: ProviderBinding, callbackUrl: string) {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) return;
    await printful(`/webhooks?store_id=${storeId}`, {
      method: "POST",
      body: JSON.stringify({
        url: callbackUrl,
        types: ["package_shipped", "order_created", "order_updated", "order_failed", "order_canceled"],
      }),
    });
  },

  async upsertProduct(binding: ProviderBinding, product: ProviderProduct): Promise<ProviderProductResult> {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) throw new OrchestratorError("Tienda Printful no disponible", "printful", false);

    if (product.externalProductId) {
      const syncProduct = await printful<{ id: number; sync_variants: Array<{ id: number; external_id: string }> }>(`/store/products/${product.externalProductId}?store_id=${storeId}`);
      return {
        externalProductId: String(syncProduct.id),
        externalVariantId: String(syncProduct.sync_variants[0]?.id || syncProduct.id),
        externalInventoryItemId: null,
      };
    }

    // Si el producto vino del catálogo abierto, ya conocemos la variante real.
    const chosen = Number(product.sourceVariantId);
    let variantId: number;
    if (product.sourceProvider === "printful" && Number.isFinite(chosen) && chosen > 0) {
      variantId = chosen;
    } else {
      const catalog = await findCatalogVariantByKeyword(product.name);
      variantId = (catalog || (await getDefaultVariant())).variant_id;
    }
    const created = await createSyncProduct(storeId, product, variantId);
    return {
      externalProductId: created.external_product_id,
      externalVariantId: created.external_variant_id,
      externalInventoryItemId: null,
    };
  },

  async deleteProduct(binding: ProviderBinding, externalProductId: string) {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) return;
    await printful(`/store/products/${externalProductId}?store_id=${storeId}`, { method: "DELETE" });
  },

  async setInventory() {
    // Printful calcula inventario por su cuenta; no hay nada que actualizar.
  },

  async createOrder(binding: ProviderBinding, order: ProviderOrder): Promise<ProviderOrderResult> {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) throw new OrchestratorError("Tienda Printful no disponible", "printful", false);

    const items = await Promise.all(
      order.lines
        .filter((l) => !!l.externalVariantId)
        .map(async (l) => {
          const { data: pb } = await import("@/integrations/supabase/client.server")
            .then((m) => m.supabaseAdmin)
            .then((sb) =>
              sb
                .from("commerce_product_bindings")
                .select("external_product_id")
                .eq("provider", "printful")
                .eq("product_id", l.productId)
                .maybeSingle(),
            );
          return {
            sync_variant_id: Number(l.externalVariantId),
            quantity: l.qty,
            retail_price: (l.priceCents / 100).toFixed(2),
            files: [] as unknown[],
            product_id: pb?.external_product_id ? Number(pb.external_product_id) : undefined,
          };
        }),
    );

    if (!items.length) {
      return { externalOrderId: null, fulfillmentStatus: "unfulfilled" };
    }

    const nameParts = order.customerName.trim().split(/\s+/);
    const recipient = {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone || undefined,
      address1: order.shippingAddress || "Dirección no proporcionada",
      city: "Ciudad de México",
      country_code: "MX",
      zip: "01000",
    };

    const payload = {
      external_id: order.orderId,
      shipping: "STANDARD",
      recipient,
      items,
      retail_costs: {
        currency: "USD",
        subtotal: (order.totalCents / 100).toFixed(2),
      },
    };

    const created = await printful<{ id: number; status: string }>(`/orders?store_id=${storeId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      externalOrderId: String(created.id),
      fulfillmentStatus: created.status === "pending" ? "unfulfilled" : created.status,
    };
  },

  async verifyAndParseWebhook(rawBody, headers): Promise<NormalizedWebhook | null> {
    const type = headers.get("x-printful-topic") || headers.get("x-webhook-type") || "unknown";
    try {
      return {
        topic: type,
        externalStoreId: null,
        externalDomain: null,
        payload: JSON.parse(rawBody) as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  },

  async teardown() {
    // Printful no expone borrado de tienda programático; se archiva manualmente.
  },
};
