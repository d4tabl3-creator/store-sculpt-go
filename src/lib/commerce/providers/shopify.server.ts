/**
 * Conector de infraestructura de comercio externa (Shopify).
 *
 * IMPORTANTE: para el usuario final este proveedor es invisible. Nunca se
 * expone su nombre en la UI. Si no hay credenciales de plataforma
 * configuradas, `isConfigured()` devuelve false y el orquestador degrada
 * automáticamente al motor nativo, de modo que el flujo del cliente jamás
 * se rompe.
 *
 * Credenciales de plataforma esperadas (secrets del servidor):
 *  - SHOPIFY_PARTNER_API_TOKEN  → crear tiendas por cliente
 *  - SHOPIFY_PARTNER_ORG_ID     → organización donde se crean
 *  - SHOPIFY_API_VERSION        → opcional, default 2024-10
 */
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

const DEFAULT_API_VERSION = "2024-10";

function apiVersion(binding?: ProviderBinding): string {
  return binding?.credentials.apiVersion || process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
}

async function adminGraphql<T>(
  binding: ProviderBinding,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const domain = binding.externalDomain;
  const token = binding.credentials.adminToken;
  if (!domain || !token) {
    throw new OrchestratorError("Conector sin credenciales de tienda", "shopify", false);
  }
  const res = await fetch(`https://${domain}/admin/api/${apiVersion(binding)}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new OrchestratorError(
      `Proveedor respondió ${res.status}`,
      "shopify",
      res.status >= 500 || res.status === 429,
      text.slice(0, 500),
    );
  }
  const json = JSON.parse(text) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new OrchestratorError("Error del proveedor", "shopify", true, json.errors);
  }
  return json.data as T;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export const shopifyProvider: CommerceProvider = {
  id: "shopify",
  label: "Infraestructura de comercio A",

  isConfigured() {
    return !!(process.env.SHOPIFY_PARTNER_API_TOKEN && process.env.SHOPIFY_PARTNER_ORG_ID);
  },

  async provisionStore(ctx: ProviderStoreContext) {
    const token = process.env.SHOPIFY_PARTNER_API_TOKEN;
    const orgId = process.env.SHOPIFY_PARTNER_ORG_ID;
    if (!token || !orgId) {
      throw new OrchestratorError("Conector no configurado", "shopify", false);
    }

    // Partner API: crear una tienda de desarrollo aislada por cliente.
    const query = `
      mutation CreateStore($input: DevelopmentStoreCreateInput!) {
        developmentStoreCreate(input: $input) {
          shop { id myshopifyDomain }
          userErrors { field message }
        }
      }`;
    const res = await fetch(
      `https://partners.shopify.com/${orgId}/api/${apiVersion()}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query,
          variables: {
            input: {
              name: ctx.storeName,
              subdomain: `datable-${ctx.slug}`.slice(0, 40),
            },
          },
        }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      throw new OrchestratorError(
        `No se pudo crear la tienda (${res.status})`,
        "shopify",
        res.status >= 500 || res.status === 429,
        text.slice(0, 500),
      );
    }
    const parsed = JSON.parse(text) as {
      data?: {
        developmentStoreCreate?: {
          shop?: { id: string; myshopifyDomain: string };
          userErrors?: Array<{ message: string }>;
        };
      };
    };
    const payload = parsed.data?.developmentStoreCreate;
    if (!payload?.shop) {
      throw new OrchestratorError(
        payload?.userErrors?.[0]?.message || "El proveedor no devolvió una tienda",
        "shopify",
        false,
        text.slice(0, 500),
      );
    }

    const webhookSecret = crypto.randomUUID().replace(/-/g, "");
    return {
      externalStoreId: payload.shop.id,
      externalDomain: payload.shop.myshopifyDomain,
      credentials: {
        adminToken: process.env.SHOPIFY_ADMIN_TOKEN || null,
        webhookSecret,
        apiVersion: apiVersion(),
        extra: { orgId },
      },
    };
  },

  async registerWebhooks(binding: ProviderBinding, callbackUrl: string) {
    const topics = ["ORDERS_CREATE", "ORDERS_FULFILLED", "INVENTORY_LEVELS_UPDATE"];
    const mutation = `
      mutation Subscribe($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
          userErrors { message }
        }
      }`;
    for (const topic of topics) {
      await adminGraphql(binding, mutation, {
        topic,
        sub: { callbackUrl, format: "JSON" },
      });
    }
  },

  async upsertProduct(binding: ProviderBinding, product: ProviderProduct): Promise<ProviderProductResult> {
    const price = (product.priceCents / 100).toFixed(2);

    if (product.externalProductId) {
      const mutation = `
        mutation Upd($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id variants(first: 1) { nodes { id inventoryItem { id } } } }
            userErrors { message }
          }
        }`;
      const data = await adminGraphql<{
        productUpdate: { product?: { id: string; variants: { nodes: Array<{ id: string; inventoryItem: { id: string } }> } } };
      }>(binding, mutation, {
        input: {
          id: product.externalProductId,
          title: product.name,
          descriptionHtml: product.description ?? "",
        },
      });
      const v = data.productUpdate.product?.variants.nodes[0];
      return {
        externalProductId: product.externalProductId,
        externalVariantId: v?.id ?? product.externalVariantId ?? null,
        externalInventoryItemId: v?.inventoryItem?.id ?? product.externalInventoryItemId ?? null,
      };
    }

    const mutation = `
      mutation Create($input: ProductInput!) {
        productCreate(input: $input) {
          product { id variants(first: 1) { nodes { id inventoryItem { id } } } }
          userErrors { message }
        }
      }`;
    const data = await adminGraphql<{
      productCreate: { product?: { id: string; variants: { nodes: Array<{ id: string; inventoryItem: { id: string } }> } } };
    }>(binding, mutation, {
      input: {
        title: product.name,
        descriptionHtml: product.description ?? "",
        status: "ACTIVE",
        variants: [{ price, inventoryManagement: "SHOPIFY" }],
        ...(product.imageUrl ? { images: [{ src: product.imageUrl }] } : {}),
      },
    });
    const created = data.productCreate.product;
    if (!created) throw new OrchestratorError("No se creó el producto", "shopify", true);
    const v = created.variants.nodes[0];
    return {
      externalProductId: created.id,
      externalVariantId: v?.id ?? null,
      externalInventoryItemId: v?.inventoryItem?.id ?? null,
    };
  },

  async deleteProduct(binding: ProviderBinding, externalProductId: string) {
    const mutation = `
      mutation Del($input: ProductDeleteInput!) {
        productDelete(input: $input) { deletedProductId userErrors { message } }
      }`;
    await adminGraphql(binding, mutation, { input: { id: externalProductId } });
  },

  async setInventory(binding: ProviderBinding, product: ProviderProduct, stock: number) {
    if (!product.externalInventoryItemId) return;
    const mutation = `
      mutation Set($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) { userErrors { message } }
      }`;
    await adminGraphql(binding, mutation, {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [{ inventoryItemId: product.externalInventoryItemId, quantity: Math.max(0, stock) }],
      },
    });
  },

  async createOrder(binding: ProviderBinding, order: ProviderOrder): Promise<ProviderOrderResult> {
    const lines = order.lines
      .filter((l) => !!l.externalVariantId)
      .map((l) => ({ variantId: l.externalVariantId, quantity: l.qty }));
    if (!lines.length) {
      return { externalOrderId: null, fulfillmentStatus: "unfulfilled" };
    }
    const mutation = `
      mutation Draft($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) { draftOrder { id } userErrors { message } }
      }`;
    const data = await adminGraphql<{ draftOrderCreate: { draftOrder?: { id: string } } }>(
      binding,
      mutation,
      {
        input: {
          email: order.customerEmail,
          lineItems: lines,
          note: `DªTªBLe order ${order.orderId}`,
          tags: ["datable"],
        },
      },
    );
    return {
      externalOrderId: data.draftOrderCreate.draftOrder?.id ?? null,
      fulfillmentStatus: "unfulfilled",
    };
  },

  async verifyAndParseWebhook(rawBody, headers, secret): Promise<NormalizedWebhook | null> {
    const signature = headers.get("x-shopify-hmac-sha256");
    if (!secret || !signature) return null;
    const expected = await hmacHex(secret, rawBody);
    if (!timingSafeEqual(signature, expected)) return null;
    return {
      topic: headers.get("x-shopify-topic") || "unknown",
      externalStoreId: null,
      externalDomain: headers.get("x-shopify-shop-domain"),
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    };
  },

  async teardown() {
    // Las tiendas de desarrollo se archivan desde la organización; nada que hacer en runtime.
  },
};
