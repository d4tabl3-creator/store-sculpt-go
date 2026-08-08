/**
 * Commerce Orchestrator — núcleo.
 *
 * DªTªBLe es el cerebro y la única interfaz. Este módulo:
 *  1. Provisiona la tienda independiente de cada cliente contra el conector elegido.
 *  2. Mantiene el mapeo DªTªBLe ↔ proveedor (bindings).
 *  3. Encola y ejecuta trabajos de sincronización con reintentos.
 *  4. Normaliza webhooks entrantes de cualquier conector.
 *
 * Todo el código aquí es server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  ProviderBinding,
  ProviderId,
  ProviderOrder,
  ProviderProduct,
  ProvisioningStatus,
} from "./types";
import { OrchestratorError, PROVISION_STEPS } from "./types";
import { getProvider, pickProvider } from "./providers/registry.server";

type Json = Record<string, unknown>;

function progressFor(step: ProvisioningStatus): number {
  return PROVISION_STEPS.find((s) => s.key === step)?.progress ?? 0;
}

export function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    "https://store-sculpt-go.lovable.app"
  ).replace(/\/$/, "");
}

async function log(
  storeId: string | null,
  provider: ProviderId | null,
  event: string,
  level: "info" | "warn" | "error",
  detail: Json = {},
) {
  await supabaseAdmin.from("commerce_event_log").insert({
    store_id: storeId,
    provider,
    direction: "outbound",
    event,
    level,
    detail: detail as never,
  });
}

async function setStep(storeId: string, step: ProvisioningStatus, error?: string | null) {
  await supabaseAdmin
    .from("commerce_store_bindings")
    .update({
      provisioning_status: step,
      provisioning_step: step,
      provisioning_progress: progressFor(step),
      provisioning_error: error ?? null,
      ...(step === "ready" ? { ready_at: new Date().toISOString() } : {}),
    })
    .eq("store_id", storeId);
}

async function loadBinding(storeId: string): Promise<ProviderBinding | null> {
  const { data: b } = await supabaseAdmin
    .from("commerce_store_bindings")
    .select("store_id, provider, external_store_id, external_domain")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!b) return null;
  const { data: c } = await supabaseAdmin
    .from("commerce_store_credentials")
    .select("admin_token, webhook_secret, api_version, extra")
    .eq("store_id", storeId)
    .maybeSingle();
  return {
    storeId: b.store_id as string,
    provider: b.provider as ProviderId,
    externalStoreId: (b.external_store_id as string | null) ?? null,
    externalDomain: (b.external_domain as string | null) ?? null,
    credentials: {
      adminToken: (c?.admin_token as string | null) ?? null,
      webhookSecret: (c?.webhook_secret as string | null) ?? null,
      apiVersion: (c?.api_version as string | null) ?? null,
      extra: (c?.extra as Record<string, unknown>) ?? {},
    },
  };
}

// ---------------------------------------------------------------------------
// Cola de trabajos
// ---------------------------------------------------------------------------

export type SyncJobKind =
  | "provision_store"
  | "sync_product"
  | "delete_product"
  | "sync_inventory"
  | "push_order";

export async function enqueue(
  storeId: string,
  provider: ProviderId,
  kind: SyncJobKind,
  payload: Json = {},
  delayMs = 0,
) {
  await supabaseAdmin.from("commerce_sync_jobs").insert({
    store_id: storeId,
    provider,
    kind,
    payload: payload as never,
    status: "pending",
    run_after: new Date(Date.now() + delayMs).toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Provisión
// ---------------------------------------------------------------------------

/**
 * Registra el binding en estado "queued" y encola la provisión.
 * Es idempotente: si ya existe binding, no lo duplica.
 */
export async function requestProvisioning(storeId: string, ownerId: string, preferred?: ProviderId) {
  const provider = pickProvider(preferred);
  const { data: existing } = await supabaseAdmin
    .from("commerce_store_bindings")
    .select("store_id, provisioning_status")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("commerce_store_bindings").insert({
      store_id: storeId,
      owner_id: ownerId,
      provider: provider.id,
      provisioning_status: "queued",
      provisioning_step: "queued",
      provisioning_progress: progressFor("queued"),
    });
  } else if (existing.provisioning_status === "ready") {
    return { provider: provider.id, alreadyReady: true };
  } else {
    await setStep(storeId, "queued", null);
  }

  await enqueue(storeId, provider.id, "provision_store", {});
  await log(storeId, provider.id, "provision.requested", "info");
  return { provider: provider.id, alreadyReady: false };
}

/** Ejecuta la provisión completa de una tienda. */
export async function runProvisioning(storeId: string): Promise<void> {
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, owner_id, name, slug, primary_color")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) throw new OrchestratorError("Tienda inexistente", "internal", false);

  const binding0 = await loadBinding(storeId);
  const provider = getProvider(binding0?.provider);

  try {
    await setStep(storeId, "creating");
    const created = await provider.provisionStore({
      storeId: store.id as string,
      ownerId: store.owner_id as string,
      storeName: store.name as string,
      slug: store.slug as string,
      primaryColor: store.primary_color as string,
    });

    await setStep(storeId, "linking");
    await supabaseAdmin
      .from("commerce_store_bindings")
      .update({
        external_store_id: created.externalStoreId,
        external_domain: created.externalDomain,
      })
      .eq("store_id", storeId);
    await supabaseAdmin.from("commerce_store_credentials").upsert(
      {
        store_id: storeId,
        provider: provider.id,
        admin_token: created.credentials.adminToken ?? null,
        webhook_secret: created.credentials.webhookSecret ?? null,
        api_version: created.credentials.apiVersion ?? null,
        extra: (created.credentials.extra ?? {}) as never,
      },
      { onConflict: "store_id" },
    );

    const binding = (await loadBinding(storeId))!;

    await setStep(storeId, "seeding");
    const { data: products } = await supabaseAdmin
      .from("store_products")
      .select("id, name, description, price_cents, image_url, stock")
      .eq("store_id", storeId)
      .order("sort_order");
    for (const p of products || []) {
      await syncProductToProvider(binding, p.id as string);
    }

    await setStep(storeId, "webhooks");
    if (provider.id !== "internal") {
      await provider.registerWebhooks(
        binding,
        `${publicBaseUrl()}/api/public/commerce/webhook/${provider.id}`,
      );
    }

    await setStep(storeId, "ready");
    await supabaseAdmin
      .from("commerce_store_bindings")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("store_id", storeId);
    await log(storeId, provider.id, "provision.ready", "info");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const retriable = err instanceof OrchestratorError ? err.retriable : true;
    await log(storeId, provider.id, "provision.failed", "error", { message, retriable });

    // Degradación garantizada: si el conector externo no puede, el motor
    // nativo asume la tienda para que el cliente nunca se quede varado.
    if (provider.id !== "internal") {
      await supabaseAdmin
        .from("commerce_store_bindings")
        .update({ provider: "internal", provisioning_error: null })
        .eq("store_id", storeId);
      await log(storeId, "internal", "provision.fallback_internal", "warn", { message });
      await runProvisioning(storeId);
      return;
    }
    await setStep(storeId, "failed", message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Productos / inventario / pedidos
// ---------------------------------------------------------------------------

function hashProduct(p: {
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
}): string {
  return `${p.name}|${p.description ?? ""}|${p.price_cents}|${p.image_url ?? ""}|${p.stock}`;
}

export async function syncProductToProvider(binding: ProviderBinding, productId: string) {
  const provider = getProvider(binding.provider);
  const { data: row } = await supabaseAdmin
    .from("store_products")
    .select("id, store_id, name, description, price_cents, image_url, stock, source_provider, source_product_id, source_variant_id")
    .eq("id", productId)
    .maybeSingle();
  if (!row) return;

  const { data: existing } = await supabaseAdmin
    .from("commerce_product_bindings")
    .select("external_product_id, external_variant_id, external_inventory_item_id, sync_hash")
    .eq("product_id", productId)
    .eq("provider", binding.provider)
    .maybeSingle();

  const hash = hashProduct(row as never);
  if (existing?.sync_hash === hash) return;

  const product: ProviderProduct = {
    productId: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceCents: row.price_cents as number,
    imageUrl: (row.image_url as string | null) ?? null,
    stock: row.stock as number,
    externalProductId: (existing?.external_product_id as string | null) ?? null,
    externalVariantId: (existing?.external_variant_id as string | null) ?? null,
    externalInventoryItemId: (existing?.external_inventory_item_id as string | null) ?? null,
    sourceProvider: (row.source_provider as string | null) ?? null,
    sourceProductId: (row.source_product_id as string | null) ?? null,
    sourceVariantId: (row.source_variant_id as string | null) ?? null,
  };

  try {
    const result = await provider.upsertProduct(binding, product);
    await provider.setInventory(binding, { ...product, ...camel(result) }, product.stock);
    await supabaseAdmin.from("commerce_product_bindings").upsert(
      {
        store_id: row.store_id as string,
        product_id: productId,
        provider: binding.provider,
        external_product_id: result.externalProductId,
        external_variant_id: result.externalVariantId,
        external_inventory_item_id: result.externalInventoryItemId,
        sync_hash: hash,
        sync_status: "synced",
        sync_error: null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "product_id,provider" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de sincronización";
    await supabaseAdmin.from("commerce_product_bindings").upsert(
      {
        store_id: row.store_id as string,
        product_id: productId,
        provider: binding.provider,
        sync_status: "error",
        sync_error: message,
      },
      { onConflict: "product_id,provider" },
    );
    throw err;
  }
}

function camel(r: {
  externalProductId: string | null;
  externalVariantId: string | null;
  externalInventoryItemId: string | null;
}) {
  return {
    externalProductId: r.externalProductId,
    externalVariantId: r.externalVariantId,
    externalInventoryItemId: r.externalInventoryItemId,
  };
}

export async function pushOrderToProvider(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from("store_orders")
    .select("id, store_id, customer_name, customer_email, customer_phone, shipping_address, items, total_cents")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const binding = await loadBinding(order.store_id as string);
  if (!binding) return;
  const provider = getProvider(binding.provider);

  const rawItems = (order.items as Array<{ productId?: string; name: string; qty: number; price_cents: number }>) || [];
  const ids = rawItems.map((i) => i.productId).filter(Boolean) as string[];
  const { data: pbs } = ids.length
    ? await supabaseAdmin
        .from("commerce_product_bindings")
        .select("product_id, external_variant_id")
        .eq("provider", binding.provider)
        .in("product_id", ids)
    : { data: [] as Array<{ product_id: string; external_variant_id: string | null }> };
  const variantByProduct = new Map((pbs || []).map((p) => [p.product_id as string, p.external_variant_id as string | null]));

  const payload: ProviderOrder = {
    orderId: order.id as string,
    customerName: order.customer_name as string,
    customerEmail: order.customer_email as string,
    customerPhone: (order.customer_phone as string | null) ?? null,
    shippingAddress: (order.shipping_address as string | null) ?? null,
    totalCents: order.total_cents as number,
    lines: rawItems.map((i) => ({
      productId: i.productId ?? "",
      name: i.name,
      qty: i.qty,
      priceCents: i.price_cents,
      externalVariantId: i.productId ? variantByProduct.get(i.productId) ?? null : null,
    })),
  };

  try {
    const res = await provider.createOrder(binding, payload);
    await supabaseAdmin.from("commerce_order_bindings").upsert(
      {
        store_id: order.store_id as string,
        order_id: orderId,
        provider: binding.provider,
        external_order_id: res.externalOrderId,
        fulfillment_status: res.fulfillmentStatus,
        sync_status: "synced",
        sync_error: null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "order_id,provider" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al enviar pedido";
    await supabaseAdmin.from("commerce_order_bindings").upsert(
      {
        store_id: order.store_id as string,
        order_id: orderId,
        provider: binding.provider,
        sync_status: "error",
        sync_error: message,
      },
      { onConflict: "order_id,provider" },
    );
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export async function processJobs(limit = 5): Promise<{ processed: number; failed: number }> {
  const { data: jobs } = await supabaseAdmin
    .from("commerce_sync_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("run_after")
    .limit(limit);

  let processed = 0;
  let failed = 0;

  for (const job of jobs || []) {
    await supabaseAdmin
      .from("commerce_sync_jobs")
      .update({ status: "running", attempts: (job.attempts as number) + 1 })
      .eq("id", job.id as string);
    try {
      await runJob(job as never);
      await supabaseAdmin.from("commerce_sync_jobs").update({ status: "done", last_error: null }).eq("id", job.id as string);
      processed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Error";
      const attempts = (job.attempts as number) + 1;
      const dead = attempts >= (job.max_attempts as number);
      await supabaseAdmin
        .from("commerce_sync_jobs")
        .update({
          status: dead ? "failed" : "pending",
          last_error: message,
          run_after: new Date(Date.now() + Math.min(2 ** attempts, 60) * 1000).toISOString(),
        })
        .eq("id", job.id as string);
      await log(job.store_id as string, job.provider as ProviderId, `job.${job.kind}.error`, "error", { message, attempts });
    }
  }
  return { processed, failed };
}

async function runJob(job: { store_id: string; kind: SyncJobKind; payload: Json }) {
  switch (job.kind) {
    case "provision_store":
      await runProvisioning(job.store_id);
      return;
    case "sync_product": {
      const binding = await loadBinding(job.store_id);
      if (binding) await syncProductToProvider(binding, job.payload.productId as string);
      return;
    }
    case "sync_inventory": {
      const binding = await loadBinding(job.store_id);
      if (binding) await syncProductToProvider(binding, job.payload.productId as string);
      return;
    }
    case "delete_product": {
      const binding = await loadBinding(job.store_id);
      const externalId = job.payload.externalProductId as string | undefined;
      if (binding && externalId) await getProvider(binding.provider).deleteProduct(binding, externalId);
      return;
    }
    case "push_order":
      await pushOrderToProvider(job.payload.orderId as string);
      return;
    default:
      return;
  }
}

// ---------------------------------------------------------------------------
// Webhooks entrantes
// ---------------------------------------------------------------------------

export async function handleInboundWebhook(
  providerId: ProviderId,
  rawBody: string,
  headers: Headers,
): Promise<{ ok: boolean; reason?: string }> {
  const provider = getProvider(providerId);

  // Shopify identifica la tienda por dominio en header.
  const domain = headers.get("x-shopify-shop-domain");

  // Printful envía el id de tienda en el payload (`store` o `store_id`).
  let printfulStoreId: string | null = null;
  if (providerId === "printful") {
    try {
      const payload = JSON.parse(rawBody) as { store_id?: number; store?: number };
      const sid = payload.store_id ?? payload.store;
      if (sid) printfulStoreId = String(sid);
    } catch {
      printfulStoreId = null;
    }
  }


  let bindingQuery;
  if (domain) {
    bindingQuery = supabaseAdmin
      .from("commerce_store_bindings")
      .select("store_id")
      .eq("provider", providerId)
      .eq("external_domain", domain);
  } else if (printfulStoreId) {
    bindingQuery = supabaseAdmin
      .from("commerce_store_bindings")
      .select("store_id")
      .eq("provider", providerId)
      .eq("external_store_id", printfulStoreId);
  } else {
    bindingQuery = null;
  }

  const { data: bindingRow } = bindingQuery ? await bindingQuery.maybeSingle() : { data: null };
  if (!bindingRow) return { ok: false, reason: "unknown store" };

  const binding = await loadBinding(bindingRow.store_id as string);
  const parsed = await provider.verifyAndParseWebhook(rawBody, headers, binding?.credentials.webhookSecret ?? null);
  if (!parsed) return { ok: false, reason: "invalid signature" };

  await supabaseAdmin.from("commerce_event_log").insert({
    store_id: bindingRow.store_id as string,
    provider: providerId,
    direction: "inbound",
    event: parsed.topic,
    level: "info",
    detail: parsed.payload as never,
  });

  const topic = parsed.topic.toLowerCase();
  if (topic.includes("fulfill") || topic.includes("package_shipped") || topic.includes("shipment")) {
    // Printful envuelve el evento en `data`; Shopify manda el objeto plano.
    const root = parsed.payload as Record<string, unknown>;
    const body = (root["data"] as Record<string, unknown> | undefined) ?? root;
    const order = (body["order"] as Record<string, unknown> | undefined) ?? root;
    const shipment = (body["shipment"] as Record<string, unknown> | undefined) ?? body;

    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const note = typeof order["note"] === "string" ? (order["note"] as string) : "";
    // 1) external_id que enviamos al crear el pedido, 2) nota, 3) id externo del proveedor.
    const externalId = order["external_id"] != null ? String(order["external_id"]) : "";
    const internalFromNote = UUID_RE.exec(`${externalId} ${note}`)?.[0] ?? null;
    const providerOrderId = order["id"] != null ? String(order["id"]) : null;

    let orderId = internalFromNote;
    if (!orderId && providerOrderId) {
      const { data: ob } = await supabaseAdmin
        .from("commerce_order_bindings")
        .select("order_id")
        .eq("provider", providerId)
        .eq("external_order_id", providerOrderId)
        .maybeSingle();
      orderId = (ob?.order_id as string | undefined) ?? null;
    }

    if (orderId) {
      const tracking = shipment["tracking_number"] ?? order["tracking_number"] ?? null;
      const trackingUrl = shipment["tracking_url"] ?? order["tracking_url"] ?? null;
      await supabaseAdmin
        .from("commerce_order_bindings")
        .update({
          fulfillment_status: "fulfilled",
          tracking_number: tracking ? String(tracking) : null,
          tracking_url: trackingUrl ? String(trackingUrl) : null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("provider", providerId);
      await supabaseAdmin.from("store_orders").update({ status: "shipped" }).eq("id", orderId);
    } else {
      await supabaseAdmin.from("commerce_event_log").insert({
        store_id: bindingRow.store_id as string,
        provider: providerId,
        direction: "inbound",
        event: `${parsed.topic}:unmatched_order`,
        level: "warn",
        detail: parsed.payload as never,
      });
    }
  }


  return { ok: true };
}
