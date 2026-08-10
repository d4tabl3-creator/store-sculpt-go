import type {
  CommerceProvider,
  NormalizedWebhook,
  ProviderBinding,
  ProviderFileResult,
  ProviderOrder,
  ProviderOrderLine,
  ProviderOrderResult,
  ProviderProduct,
  ProviderProductResult,
  ProviderStoreContext,
  ProviderTemplate,
  ShippingDetails,
  ShippingRate,
  SizeGuideTable,
} from "../types";
import { NO_CAPABILITIES, OrchestratorError } from "../types";

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
 * Antes existía una búsqueda por palabras clave que "adivinaba" el producto
 * cuando faltaba la variante de origen: eso podía mandar a fabricar un
 * artículo equivocado. Se eliminó a propósito. Sin variante real de catálogo,
 * el producto se marca para revisión en lugar de inventar una.
 */




// ---------------------------------------------------------------------------
// Biblioteca de archivos, plantillas, guía de tallas y envíos (funciones reales)
// ---------------------------------------------------------------------------

/** Sube un archivo de impresión a la biblioteca permanente del proveedor. */
async function uploadFile(url: string, filename?: string | null): Promise<ProviderFileResult> {
  const created = await printful<{ id: number; url: string; preview_url: string | null; status: string }>(
    "/files",
    { method: "POST", body: JSON.stringify({ url, filename: filename || undefined, type: "default" }) },
  );
  return {
    externalFileId: String(created.id),
    url: created.url || url,
    previewUrl: created.preview_url ?? null,
    status: created.status ?? "ok",
  };
}

/** Archivo listo para adjuntar: usa el id de la biblioteca si lo hay. */
function fileEntry(design: { externalFileId?: string | null; url?: string | null; placement?: string | null } | null | undefined, fallbackUrl?: string | null) {
  const type = design?.placement || "default";
  if (design?.externalFileId) return { type, id: Number(design.externalFileId) };
  const url = design?.url || fallbackUrl;
  return url ? { type, url } : null;
}

function recipientFrom(order: ProviderOrder) {
  const s: ShippingDetails | null = order.shipping ?? null;
  if (s?.address1 && s.city && s.countryCode && s.zip) {
    return {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone || undefined,
      address1: s.address1,
      address2: s.address2 || undefined,
      city: s.city,
      state_code: s.stateCode || undefined,
      state_name: s.stateName || undefined,
      country_code: s.countryCode,
      zip: s.zip,
    };
  }
  throw new OrchestratorError(
    "El pedido no tiene una dirección de envío completa (calle, ciudad, estado, país y código postal).",
    "printful",
    false,
  );
}

async function createSyncProductVariants(
  storeId: number,
  product: ProviderProduct,
  variantId: number,
  file: { type: string; id?: number; url?: string },
) {
  return printful<{ id: number; external_id: string; sync_variants: Array<{ id: number; external_id: string }> }>(
    `/store/products?store_id=${storeId}`,
    {
      method: "POST",
      body: JSON.stringify({
        sync_product: { name: product.name, thumbnail: product.imageUrl || undefined },
        sync_variants: [
          {
            variant_id: variantId,
            retail_price: (product.priceCents / 100).toFixed(2),
            sku: `datable-${product.productId.slice(0, 8)}`,
            files: [file],
          },
        ],
      }),
    },
  );
}

async function createSyncProduct(
  storeId: number,
  product: ProviderProduct,
  variantId: number,
): Promise<{ id: number; external_product_id: string; external_variant_id: string; external_file_id: string | null }> {
  // Bloque 2: el archivo de impresión se guarda primero en la biblioteca del
  // proveedor, así deja de depender de una URL temporal nuestra.
  let file = fileEntry(product.design ?? null, product.imageUrl);
  let externalFileId: string | null = product.design?.externalFileId ?? null;
  if (!externalFileId && file && "url" in file && file.url) {
    try {
      const uploaded = await uploadFile(file.url, `${product.productId.slice(0, 8)}.png`);
      externalFileId = uploaded.externalFileId;
      file = { type: file.type, id: Number(uploaded.externalFileId) };
    } catch (err) {
      console.error("printful file upload fallback:", err);
    }
  }
  if (!file) {
    file = {
      type: "default",
      url: "https://files.cdn.printful.com/o/upload/product-catalog-img/04/04f318b62ba2242360baeb2fcc89fe2c_l",
    };
  }

  const created = await createSyncProductVariants(storeId, product, variantId, file as { type: string; id?: number; url?: string });
  return {
    id: created.id,
    external_product_id: String(created.id),
    external_variant_id: String(created.sync_variants[0]?.id || created.id),
    external_file_id: externalFileId,
  };
}

export const printfulProvider: CommerceProvider = {
  id: "printful",
  label: "Fulfillment bajo demanda",

  capabilities: {
    ...NO_CAPABILITIES,
    catalog: true,
    variants: true,
    fileLibrary: true,
    templates: true,
    mockups: true,
    sizeGuide: true,
    shippingRates: true,
    orderTracking: true,
    webhooks: true,
    // El Creador de Diseños Integrado requiere acuerdo Enterprise: aún no.
    embeddedDesigner: false,
  },

  isConfigured() {
    return !!apiToken();
  },

  async uploadDesignFile(_binding: ProviderBinding, input: { url: string; filename?: string | null }) {
    return uploadFile(input.url, input.filename ?? null);
  },

  async listTemplates(binding: ProviderBinding): Promise<ProviderTemplate[]> {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) return [];
    const res = await printful<{
      items: Array<{ id: number; title: string; product_id: number; mockup_file_url: string | null }>;
    }>(`/product-templates?store_id=${storeId}&limit=100`);
    return (res.items ?? []).map((t) => ({
      externalTemplateId: String(t.id),
      title: t.title,
      externalProductId: t.product_id != null ? String(t.product_id) : null,
      previewUrl: t.mockup_file_url ?? null,
    }));
  },

  async getTemplate(binding: ProviderBinding, externalTemplateId: string): Promise<ProviderTemplate | null> {
    const storeId = Number(binding.externalStoreId);
    if (!storeId) return null;
    try {
      const t = await printful<{ id: number; title: string; product_id: number; mockup_file_url: string | null }>(
        `/product-templates/${externalTemplateId}?store_id=${storeId}`,
      );
      return {
        externalTemplateId: String(t.id),
        title: t.title,
        externalProductId: t.product_id != null ? String(t.product_id) : null,
        previewUrl: t.mockup_file_url ?? null,
      };
    } catch {
      return null;
    }
  },

  async getSizeGuide(externalProductId: string): Promise<SizeGuideTable[]> {
    const res = await printful<{
      size_tables?: Array<{
        type: string;
        unit: string;
        description?: string;
        measurements?: Array<{ type_label: string; values: Array<{ size: string; value?: string; min_value?: string; max_value?: string }> }>;
      }>;
    }>(`/products/${externalProductId}/sizes?unit=cm`);

    return (res.size_tables ?? []).map((table) => {
      const bySize = new Map<string, Record<string, string>>();
      for (const m of table.measurements ?? []) {
        for (const v of m.values) {
          const row = bySize.get(v.size) ?? { Talla: v.size };
          row[m.type_label] = v.value ?? [v.min_value, v.max_value].filter(Boolean).join(" – ");
          bySize.set(v.size, row);
        }
      }
      return {
        type: table.type,
        unit: table.unit,
        description: (table.description || "").replace(/<[^>]+>/g, "").trim() || null,
        rows: [...bySize.values()],
      };
    });
  },

  async estimateShipping(
    _binding: ProviderBinding,
    input: { shipping: ShippingDetails; lines: ProviderOrderLine[] },
  ): Promise<ShippingRate[]> {
    const items = input.lines
      .filter((l) => !!l.externalVariantId)
      .map((l) => ({ variant_id: Number(l.externalVariantId), quantity: l.qty }));
    if (!items.length) return [];
    const rates = await printful<
      Array<{ id: string; name: string; rate: string; currency: string; minDeliveryDays?: number; maxDeliveryDays?: number }>
    >("/shipping/rates", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          address1: input.shipping.address1,
          city: input.shipping.city,
          country_code: input.shipping.countryCode,
          state_code: input.shipping.stateCode || undefined,
          zip: input.shipping.zip,
        },
        items,
        currency: "USD",
        locale: "es_ES",
      }),
    });
    return (rates ?? []).map((r) => ({
      id: r.id,
      label: r.name,
      costUsd: Number(r.rate) || 0,
      currency: r.currency || "USD",
      minDays: r.minDeliveryDays ?? null,
      maxDays: r.maxDeliveryDays ?? null,
    }));
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

    // El producto debe traer su variante real de catálogo. Sin ella no se
    // fabrica nada: es preferible marcarlo para revisión que enviar a producir
    // un artículo distinto al que eligió el comerciante.
    const chosen = Number(product.sourceVariantId);
    if (product.sourceProvider !== "printful" || !Number.isFinite(chosen) || chosen <= 0) {
      throw new OrchestratorError(
        `"${product.name}" no tiene variante de catálogo asociada. Elige el producto desde el catálogo para poder fabricarlo.`,
        "printful",
        false,
      );
    }
    const variantId = chosen;
    const created = await createSyncProduct(storeId, product, variantId);
    return {
      externalProductId: created.external_product_id,
      externalVariantId: created.external_variant_id,
      externalInventoryItemId: null,
      externalFileId: created.external_file_id,
    } as ProviderProductResult;
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = await Promise.all(
      order.lines
        .filter((l) => !!l.externalVariantId)
        .map(async (l) => {
          const { data: pb } = await supabaseAdmin
            .from("commerce_product_bindings")
            .select("external_product_id")
            .eq("provider", "printful")
            .eq("product_id", l.productId)
            .maybeSingle();
          const file = fileEntry(l.design ?? null);
          return {
            sync_variant_id: Number(l.externalVariantId),
            quantity: l.qty,
            retail_price: (l.priceCents / 100).toFixed(2),
            // Sin archivo explícito, el proveedor usa el del producto sincronizado.
            files: file ? [file] : [],
            product_id: pb?.external_product_id ? Number(pb.external_product_id) : undefined,
          };
        }),
    );

    if (!items.length) {
      return { externalOrderId: null, fulfillmentStatus: "unfulfilled" };
    }

    const payload = {
      external_id: order.orderId,
      shipping: "STANDARD",
      recipient: recipientFrom(order),
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
