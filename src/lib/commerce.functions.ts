import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  ProviderId,
  ProvisioningStatus,
  ProvisioningView,
  ShippingDetails,
  ShippingRate,
  SizeGuideTable,
} from "@/lib/commerce/types";

const UUID = /^[0-9a-fA-F-]{36}$/;

/** Costos y tiempos de envío reales para un carrito de una tienda publicada. */
export const estimateShippingRates = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { storeId: string; shipping: ShippingDetails; items: Array<{ productId: string; qty: number }> }) => {
      if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
      if (!data.items?.length) throw new Error("Carrito vacío");
      const s = data.shipping;
      if (!s?.address1?.trim() || !s?.city?.trim() || !s?.countryCode?.trim() || !s?.zip?.trim()) {
        throw new Error("Dirección incompleta");
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<ShippingRate[]> => {
    const { estimateShippingForStore } = await import("@/lib/commerce/orchestrator.server");
    try {
      return await estimateShippingForStore(data.storeId, data.shipping, data.items);
    } catch (err) {
      console.error("estimateShippingRates error:", err);
      return [];
    }
  });

/** Guía de tallas real del producto de catálogo. */
export const getProductSizeGuide = createServerFn({ method: "GET" })
  .inputValidator((data: { provider: string; externalProductId: string }) => {
    if (!data.externalProductId?.trim()) throw new Error("Producto inválido");
    return data;
  })
  .handler(async ({ data }): Promise<SizeGuideTable[]> => {
    const { getSizeGuideForProduct } = await import("@/lib/commerce/orchestrator.server");
    return getSizeGuideForProduct(data.provider as ProviderId, data.externalProductId);
  });


async function readStatus(storeId: string): Promise<ProvisioningView | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("commerce_store_bindings")
    .select("store_id, provisioning_status, provisioning_step, provisioning_progress, provisioning_error, ready_at")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return null;
  return {
    storeId: data.store_id as string,
    status: data.provisioning_status as ProvisioningStatus,
    step: data.provisioning_step as ProvisioningStatus,
    progress: data.provisioning_progress as number,
    error: (data.provisioning_error as string | null) ?? null,
    readyAt: (data.ready_at as string | null) ?? null,
  };
}

async function assertOwner(storeId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("stores").select("owner_id").eq("id", storeId).maybeSingle();
  if (!data || data.owner_id !== userId) throw new Error("No autorizado");
  return data.owner_id as string;
}

/** Arranca la preparación de la tienda. Idempotente. */
export const startProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ownerId = await assertOwner(data.storeId, context.userId);
    const { requestProvisioning } = await import("@/lib/commerce/orchestrator.server");
    return requestProvisioning(data.storeId, ownerId);
  });

/**
 * Avanza la cola y devuelve el estado actual. La página de preparación llama
 * a esta función en intervalos: así el orquestador progresa aunque no haya
 * un worker externo corriendo.
 */
export const tickProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ProvisioningView | null> => {
    await assertOwner(data.storeId, context.userId);
    const { processJobs } = await import("@/lib/commerce/orchestrator.server");
    try {
      await processJobs(3);
    } catch (err) {
      console.error("processJobs error:", err);
    }
    return readStatus(data.storeId);
  });

/** Sólo lectura del estado (sin avanzar la cola). */
export const getProvisioningStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ProvisioningView | null> => {
    await assertOwner(data.storeId, context.userId);
    return readStatus(data.storeId);
  });

/** Reencola la sincronización del catálogo completo de una tienda. */
export const resyncCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(data.storeId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueue, processJobs } = await import("@/lib/commerce/orchestrator.server");
    const { data: binding } = await supabaseAdmin
      .from("commerce_store_bindings")
      .select("provider")
      .eq("store_id", data.storeId)
      .maybeSingle();
    if (!binding) return { queued: 0 };
    const { data: products } = await supabaseAdmin
      .from("store_products")
      .select("id")
      .eq("store_id", data.storeId);
    for (const p of products || []) {
      await enqueue(data.storeId, binding.provider as never, "sync_product", { productId: p.id as string });
    }
    await processJobs(10);
    return { queued: (products || []).length };
  });

/** Encola la sincronización de un producto tras editarlo en DªTªBLe. */
export const syncProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string; productId: string }) => {
    if (!UUID.test(data.storeId) || !UUID.test(data.productId)) throw new Error("id inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(data.storeId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueue, processJobs } = await import("@/lib/commerce/orchestrator.server");
    const { data: binding } = await supabaseAdmin
      .from("commerce_store_bindings")
      .select("provider")
      .eq("store_id", data.storeId)
      .maybeSingle();
    if (!binding) return { ok: false };
    await enqueue(data.storeId, binding.provider as never, "sync_product", { productId: data.productId });
    await processJobs(3);
    return { ok: true };
  });

/** Salud del conector de una tienda, para el panel del comerciante. */
export const getCommerceHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(data.storeId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: binding }, { count: pending }, { count: errored }] = await Promise.all([
      supabaseAdmin
        .from("commerce_store_bindings")
        .select("provisioning_status, last_synced_at")
        .eq("store_id", data.storeId)
        .maybeSingle(),
      supabaseAdmin
        .from("commerce_sync_jobs")
        .select("id", { count: "exact", head: true })
        .eq("store_id", data.storeId)
        .eq("status", "pending"),
      supabaseAdmin
        .from("commerce_product_bindings")
        .select("id", { count: "exact", head: true })
        .eq("store_id", data.storeId)
        .eq("sync_status", "error"),
    ]);
    return {
      status: (binding?.provisioning_status as ProvisioningStatus | undefined) ?? null,
      lastSyncedAt: (binding?.last_synced_at as string | null) ?? null,
      pendingJobs: pending ?? 0,
      erroredProducts: errored ?? 0,
    };
  });
