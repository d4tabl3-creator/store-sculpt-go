/**
 * Conector de infraestructura de fabricación bajo demanda (Printify).
 *
 * Cumple el contrato `CommerceProvider`: el núcleo del orquestador no sabe
 * nada de este proveedor, sólo consulta capacidades y llama métodos neutrales.
 */
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
  ShippingDetails,
  ShippingRate,
} from "../types";
import { NO_CAPABILITIES, OrchestratorError } from "../types";
import {
  PrintifyError,
  cancelOrder as cancelProviderOrder,
  getOrder,
  getStandardShippingCosts,
  getVariantCosts,
  isPrintifyConfigured,
  listBlueprintVariants,
  printify,
  printifyShopId,
  publishProduct,
  resolvePrintProviderId,
  sendOrderToProduction as sendToProduction,
  unpublishProduct,
  uploadImageByUrl,
  type PrintifyProduct,
} from "@/lib/printify.server";


const PROVIDER = "printify" as const;

function wrap(err: unknown): never {
  if (err instanceof PrintifyError) {
    throw new OrchestratorError(err.message, PROVIDER, err.retriable, err.status);
  }
  throw err;
}

/**
 * El origen del producto se guarda como `blueprintId:printProviderId`.
 * Si viniera sólo el blueprint, se resuelve el fabricante igual que en el
 * catálogo, de modo que el costo mostrado y el costo real coincidan.
 */
async function parseSource(product: ProviderProduct): Promise<{ blueprintId: number; printProviderId: number }> {
  const raw = String(product.sourceProductId ?? "");
  const [bpRaw, ppRaw] = raw.split(":");
  const blueprintId = Number(bpRaw);
  if (!Number.isFinite(blueprintId) || blueprintId <= 0) {
    throw new OrchestratorError(
      `"${product.name}" no tiene producto de catálogo asociado. Elígelo desde el catálogo para poder fabricarlo.`,
      PROVIDER,
      false,
    );
  }
  const fromRaw = Number(ppRaw);
  const printProviderId = Number.isFinite(fromRaw) && fromRaw > 0 ? fromRaw : await resolvePrintProviderId(blueprintId);
  return { blueprintId, printProviderId };
}

function variantIdOf(product: ProviderProduct): number {
  const id = Number(product.sourceVariantId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new OrchestratorError(
      `"${product.name}" no tiene variante de catálogo asociada. Elige talla y color desde el catálogo.`,
      PROVIDER,
      false,
    );
  }
  return id;
}

function addressFrom(order: ProviderOrder) {
  const s: ShippingDetails | null = order.shipping ?? null;
  if (!s?.address1 || !s.city || !s.countryCode || !s.zip) {
    throw new OrchestratorError(
      "El pedido no tiene una dirección de envío completa (calle, ciudad, país y código postal).",
      PROVIDER,
      false,
    );
  }
  const parts = (order.customerName || "").trim().split(/\s+/);
  return {
    first_name: parts[0] || "Cliente",
    last_name: parts.slice(1).join(" ") || ".",
    email: order.customerEmail,
    phone: order.customerPhone || "",
    country: s.countryCode,
    region: s.stateCode || s.stateName || "",
    address1: s.address1,
    address2: s.address2 || "",
    city: s.city,
    zip: s.zip,
  };
}

/** Firma HMAC-SHA256 en hexadecimal, sin dependencias de Node. */
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Secreto compartido y determinista para los webhooks del espacio de fabricación. */
async function sharedWebhookSecret(): Promise<string> {
  const token = process.env["PRINTIFY_API_TOKEN"] ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`datable-printify-webhook:${token}`),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

const WEBHOOK_TOPICS = [
  "order:created",
  "order:updated",
  "order:sent-to-production",
  "order:shipment:created",
  "order:shipment:delivered",
];

export const printifyProvider: CommerceProvider = {
  id: PROVIDER,
  label: "Fulfillment bajo demanda",

  capabilities: {
    ...NO_CAPABILITIES,
    catalog: true,
    variants: true,
    fileLibrary: true,
    mockups: true,
    shippingRates: true,
    orderTracking: true,
    webhooks: true,
    // El proveedor no expone tablas de tallas ni plantillas por API.
    templates: false,
    sizeGuide: false,
    embeddedDesigner: false,
  },

  isConfigured() {
    return isPrintifyConfigured();
  },

  async uploadDesignFile(_binding: ProviderBinding, input: { url: string; filename?: string | null }) {
    try {
      const up = await uploadImageByUrl(input.url, input.filename || `datable-${Date.now()}.png`);
      const result: ProviderFileResult = {
        externalFileId: up.id,
        url: input.url,
        previewUrl: up.preview_url ?? null,
        status: "ok",
      };
      return result;
    } catch (err) {
      wrap(err);
    }
  },

  async provisionStore(ctx: ProviderStoreContext) {
    try {
      const shopId = await printifyShopId();
      return {
        externalStoreId: String(shopId),
        externalDomain: `shop/${shopId}/${ctx.slug}`,
        credentials: {
          adminToken: null,
          webhookSecret: null,
          apiVersion: "v1",
          extra: { shopId },
        },
      };
    } catch (err) {
      wrap(err);
    }
  },

  async registerWebhooks(binding: ProviderBinding, callbackUrl: string) {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) return;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // El espacio de fabricación es compartido por todas las tiendas, así que
      // el secreto se deriva de forma determinista: todas verifican igual y no
      // se pisan entre registros.
      const secret = await sharedWebhookSecret();
      if (binding.credentials.webhookSecret !== secret) {
        await supabaseAdmin
          .from("commerce_store_credentials")
          .update({ webhook_secret: secret })
          .eq("store_id", binding.storeId);
      }

      const existing = await printify<Array<{ id: string; topic: string; url: string }>>(
        `/v1/shops/${shopId}/webhooks.json`,
      );
      const have = new Set((existing || []).filter((w) => w.url === callbackUrl).map((w) => w.topic));

      for (const topic of WEBHOOK_TOPICS) {
        if (have.has(topic)) continue;
        await printify(`/v1/shops/${shopId}/webhooks.json`, {
          method: "POST",
          body: { topic, url: callbackUrl, secret },
        }).catch(() => null);
      }
    } catch (err) {
      wrap(err);
    }
  },

  async upsertProduct(binding: ProviderBinding, product: ProviderProduct): Promise<ProviderProductResult> {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) throw new OrchestratorError("Espacio de fabricación no disponible", PROVIDER, false);

    try {
      const variantId = variantIdOf(product);

      // Producto ya creado: sólo se refresca precio/estado.
      if (product.externalProductId) {
        await printify(`/v1/shops/${shopId}/products/${product.externalProductId}.json`, {
          method: "PUT",
          body: {
            title: product.name,
            description: product.description || "",
            variants: [{ id: variantId, price: product.priceCents, is_enabled: true }],
          },
        });
        return {
          externalProductId: String(product.externalProductId),
          externalVariantId: String(variantId),
          externalInventoryItemId: null,
        };
      }

      const { blueprintId, printProviderId } = await parseSource(product);

      // El archivo de impresión se guarda en la biblioteca del proveedor: deja
      // de depender de una URL temporal nuestra.
      let imageId = product.design?.externalFileId ?? null;
      const designUrl = product.design?.url ?? null;
      if (!imageId && designUrl) {
        const up = await uploadImageByUrl(designUrl, `${product.productId.slice(0, 8)}.png`);
        imageId = up.id;
      }
      if (!imageId) {
        throw new OrchestratorError(
          `"${product.name}" no tiene diseño cargado. Sube o crea el diseño antes de publicarlo.`,
          PROVIDER,
          false,
        );
      }

      const variants = await listBlueprintVariants(blueprintId, printProviderId);
      const chosen = variants.find((v) => v.id === variantId);
      const position =
        product.design?.placement ||
        chosen?.placeholders[0]?.position ||
        variants.find((v) => v.placeholders.length)?.placeholders[0]?.position ||
        "front";

      const created = await printify<PrintifyProduct>(`/v1/shops/${shopId}/products.json`, {
        method: "POST",
        body: {
          title: product.name,
          description: product.description || "",
          blueprint_id: blueprintId,
          print_provider_id: printProviderId,
          variants: [{ id: variantId, price: product.priceCents, is_enabled: true }],
          print_areas: [
            {
              variant_ids: [variantId],
              placeholders: [
                { position, images: [{ id: imageId, x: 0.5, y: 0.5, scale: 0.9, angle: 0 }] },
              ],
            },
          ],
        },
      });

      if (!created?.id) {
        throw new OrchestratorError("El proveedor no devolvió el producto creado", PROVIDER, true);
      }

      return {
        externalProductId: String(created.id),
        externalVariantId: String(variantId),
        externalInventoryItemId: null,
        externalFileId: imageId,
      };
    } catch (err) {
      wrap(err);
    }
  },

  async deleteProduct(binding: ProviderBinding, externalProductId: string) {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) return;
    try {
      await printify(`/v1/shops/${shopId}/products/${externalProductId}.json`, { method: "DELETE" });
    } catch {
      /* el producto ya no existe */
    }
  },

  async setInventory() {
    // El proveedor fabrica bajo demanda: no hay inventario que sincronizar.
  },

  async createOrder(binding: ProviderBinding, order: ProviderOrder): Promise<ProviderOrderResult> {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) throw new OrchestratorError("Espacio de fabricación no disponible", PROVIDER, false);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const lineItems: Array<Record<string, unknown>> = [];

      for (const line of order.lines) {
        if (!line.productId) continue;
        const { data: pb } = await supabaseAdmin
          .from("commerce_product_bindings")
          .select("external_product_id, external_variant_id")
          .eq("provider", PROVIDER)
          .eq("product_id", line.productId)
          .maybeSingle();
        const externalProductId = (pb?.external_product_id as string | null) ?? null;
        const externalVariantId = Number(pb?.external_variant_id ?? line.externalVariantId ?? 0);
        if (!externalProductId || !externalVariantId) continue;
        lineItems.push({
          product_id: externalProductId,
          variant_id: externalVariantId,
          quantity: line.qty,
        });
      }

      if (!lineItems.length) {
        return { externalOrderId: null, fulfillmentStatus: "unfulfilled" };
      }

      const created = await printify<{ id: string }>(`/v1/shops/${shopId}/orders.json`, {
        method: "POST",
        body: {
          external_id: order.orderId,
          label: order.orderId.slice(0, 8),
          line_items: lineItems,
          shipping_method: 1,
          is_printify_express: false,
          is_economy_shipping: false,
          send_shipping_notification: false,
          address_to: addressFrom(order),
        },
      });

      // NUNCA se manda a fabricar aquí. El pedido queda en espera hasta que
      // DªTªBLe confirme el pago del cliente y el orquestador llame a
      // `sendOrderToProduction`.
      return { externalOrderId: String(created.id), fulfillmentStatus: "on_hold" };

    } catch (err) {
      wrap(err);
    }
  },

  /** Fabricación autorizada. El orquestador sólo llega aquí con el pago confirmado. */
  async sendOrderToProduction(binding: ProviderBinding, externalOrderId: string) {
    const shopId = Number(binding.externalStoreId);
    if (!shopId || !externalOrderId) return;
    try {
      await sendToProduction(shopId, externalOrderId);
    } catch (err) {
      wrap(err);
    }
  },



  async estimateShipping(
    binding: ProviderBinding,
    input: { shipping: ShippingDetails; lines: ProviderOrderLine[] },
  ): Promise<ShippingRate[]> {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) return [];
    if (!input.lines.length) return [];


    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const lineItems: Array<Record<string, unknown>> = [];
      for (const line of input.lines) {
        const { data: pb } = await supabaseAdmin
          .from("commerce_product_bindings")
          .select("external_product_id, external_variant_id")
          .eq("provider", PROVIDER)
          .eq("product_id", line.productId)
          .maybeSingle();
        const externalProductId = (pb?.external_product_id as string | null) ?? null;
        const externalVariantId = Number(pb?.external_variant_id ?? line.externalVariantId ?? 0);
        if (!externalProductId || !externalVariantId) continue;
        lineItems.push({ product_id: externalProductId, variant_id: externalVariantId, quantity: line.qty });
      }
      if (!lineItems.length) return [];

      const res = await printify<Record<string, number>>(`/v1/shops/${shopId}/orders/shipping.json`, {
        method: "POST",
        body: {
          line_items: lineItems,
          address_to: {
            first_name: "Cliente",
            last_name: ".",
            email: "pedidos@datable.com.mx",
            phone: "",
            country: input.shipping.countryCode,
            region: input.shipping.stateCode || "",
            address1: input.shipping.address1,
            address2: input.shipping.address2 || "",
            city: input.shipping.city,
            zip: input.shipping.zip,
          },
        },
      });

      // Sólo se traduce el nombre del servicio. Los tiempos de entrega no se
      // inventan: si el proveedor no los publica, no se muestran.
      const LABELS: Record<string, string> = {
        economy: "Económico",
        standard: "Estándar",
        priority: "Prioritario",
        printify_express: "Exprés",
        express: "Exprés",
      };

      return Object.entries(res || {})
        .filter(([, cents]) => typeof cents === "number" && cents > 0)
        .map(([key, cents]) => ({
          id: key,
          label: LABELS[key] ?? key,
          costUsd: cents / 100,
          currency: "USD",
          minDays: null,
          maxDays: null,
        }));

    } catch (err) {
      console.error("printify estimateShipping error:", err);
      return [];
    }
  },

  async verifyAndParseWebhook(rawBody, headers, secret): Promise<NormalizedWebhook | null> {
    const header = headers.get("x-pfy-signature") || "";
    const provided = header.startsWith("sha256=") ? header.slice(7) : header;
    if (secret) {
      if (!provided) return null;
      const expected = await hmacHex(secret, rawBody);
      if (!timingSafeEqual(provided.toLowerCase(), expected)) return null;
    }

    let event: {
      type?: string;
      resource?: { id?: string; type?: string; data?: Record<string, unknown> };
    };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      return null;
    }

    const resource = event.resource ?? {};
    const data = (resource.data ?? {}) as Record<string, unknown>;
    const carrier = (data["carrier"] as Record<string, unknown> | undefined) ?? {};

    // Se normaliza a la forma neutral que entiende el orquestador.
    return {
      topic: event.type ?? "unknown",
      externalStoreId: data["shop_id"] != null ? String(data["shop_id"]) : null,
      externalDomain: null,
      payload: {
        order: { id: resource.id ?? null, status: data["status"] ?? null },
        shipment: {
          tracking_number: carrier["tracking_number"] ?? null,
          tracking_url: carrier["tracking_url"] ?? null,
        },
        raw: event,
      },
    };
  },

  async teardown(binding: ProviderBinding) {
    const shopId = Number(binding.externalStoreId);
    if (!shopId) return;
    try {
      const hooks = await printify<Array<{ id: string; url: string }>>(`/v1/shops/${shopId}/webhooks.json`);
      for (const hook of hooks || []) {
        if (!hook.url.includes("/api/public/commerce/webhook/printify")) continue;
        const host = new URL(hook.url).host;
        await printify(`/v1/shops/${shopId}/webhooks/${hook.id}.json?host=${host}`, { method: "DELETE" }).catch(
          () => null,
        );
      }
    } catch {
      /* nada que liberar */
    }
  },
};

/** Costo base real (fabricación + envío) de una variante, en centavos USD. */
export async function printifyBaseCostUsdCents(
  blueprintId: number,
  variantId: number,
): Promise<{ productionCents: number; shippingCents: number; printProviderId: number }> {
  const printProviderId = await resolvePrintProviderId(blueprintId);
  const variants = await listBlueprintVariants(blueprintId, printProviderId);
  const [costs, shipping] = await Promise.all([
    getVariantCosts(blueprintId, printProviderId, variants.map((v) => v.id)),
    getStandardShippingCosts(blueprintId, printProviderId, "MX"),
  ]);
  return {
    productionCents: costs.get(variantId) ?? 0,
    shippingCents: shipping.get(variantId) ?? 0,
    printProviderId,
  };
}
