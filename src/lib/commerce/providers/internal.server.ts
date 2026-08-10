/**
 * Conector nativo DªTªBLe.
 *
 * Es el proveedor por defecto y el fallback siempre disponible: la base de
 * datos de DªTªBLe ES la tienda. No hace llamadas externas, por eso nunca
 * bloquea el lanzamiento de un Activo Digital.
 */
import type {
  CommerceProvider,
  NormalizedWebhook,
  ProviderBinding,
  ProviderCredentials,
  ProviderOrder,
  ProviderOrderResult,
  ProviderProduct,
  ProviderProductResult,
  ProviderStoreContext,
} from "../types";
import { NO_CAPABILITIES } from "../types";

export const internalProvider: CommerceProvider = {
  id: "internal",
  label: "Motor nativo DªTªBLe",

  capabilities: { ...NO_CAPABILITIES, catalog: true, variants: true },

  isConfigured() {
    return true;
  },


  async provisionStore(ctx: ProviderStoreContext) {
    const credentials: ProviderCredentials = { extra: { engine: "native" } };
    return {
      externalStoreId: ctx.storeId,
      externalDomain: `/t/${ctx.slug}`,
      credentials,
    };
  },

  async registerWebhooks() {
    // El motor nativo no necesita webhooks: los pedidos entran por el checkout propio.
  },

  async upsertProduct(_binding: ProviderBinding, product: ProviderProduct): Promise<ProviderProductResult> {
    return {
      externalProductId: product.productId,
      externalVariantId: product.productId,
      externalInventoryItemId: product.productId,
    };
  },

  async deleteProduct() {
    // El borrado real ocurre en la tabla store_products.
  },

  async setInventory() {
    // El stock vive en store_products.
  },

  async createOrder(_binding: ProviderBinding, order: ProviderOrder): Promise<ProviderOrderResult> {
    return { externalOrderId: order.orderId, fulfillmentStatus: "unfulfilled" };
  },

  async verifyAndParseWebhook(): Promise<NormalizedWebhook | null> {
    return null;
  },

  async teardown() {
    // Nada que liberar.
  },
};
