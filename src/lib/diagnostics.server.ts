/**
 * Diagnóstico interno de la infraestructura de fabricación de DªTªBLe Stores.
 *
 * Server-only. Nunca devuelve tokens ni secretos: sólo el resultado de cada
 * comprobación. Esta información es para el equipo, no para el cliente final.
 */

import {
  fetchAllBlueprints,
  getVariantCosts,
  getStandardShippingCosts,
  isPrintifyConfigured,
  listBlueprintVariants,
  listPrintProviders,
  listWebhooks,
  printify,
  printifyShopId,
  type PrintifyProduct,
} from "@/lib/printify.server";
import { listCatalog } from "@/lib/catalog.server";

export type CheckStatus = "ok" | "warn" | "fail" | "skipped";

export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  data?: Record<string, string | number | boolean | null | string[] | Record<string, number>>;
};

async function run(
  id: string,
  label: string,
  fn: () => Promise<Omit<Check, "id" | "label">>,
): Promise<Check> {
  try {
    return { id, label, ...(await fn()) };
  } catch (err) {
    return {
      id,
      label,
      status: "fail",
      detail: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export type DiagnosticsReport = {
  generatedAt: string;
  configured: boolean;
  checks: Check[];
};

export async function runCommerceDiagnostics(options: { productTest?: boolean } = {}): Promise<DiagnosticsReport> {
  const configured = isPrintifyConfigured();
  const checks: Check[] = [];

  const wellFormed = printifyTokenLooksValid();
  checks.push({
    id: "token",
    label: "Credencial de fabricación",
    status: configured ? (wellFormed ? "ok" : "fail") : "fail",
    detail: !configured
      ? "Falta la credencial de la infraestructura de fabricación."
      : wellFormed
        ? "Credencial presente y con formato válido (nunca se expone al navegador)."
        : "La credencial está guardada pero incompleta o mal copiada: hay que volver a pegarla completa, en una sola línea.",
  });

  if (!configured) {
    return { generatedAt: new Date().toISOString(), configured, checks };
  }


  let shopId = 0;
  checks.push(
    await run("shop", "Espacio de fabricación (shop_id)", async () => {
      shopId = await printifyShopId();
      return { status: "ok", detail: `shop_id = ${shopId}`, data: { shopId } };
    }),
  );

  let sampleBlueprintId = 0;
  checks.push(
    await run("catalog", "Catálogo base (paginación completa)", async () => {
      const fetched = await fetchAllBlueprints(true);
      sampleBlueprintId = fetched.items[0]?.id ?? 0;
      return {
        status: fetched.items.length > 0 ? "ok" : "fail",
        detail: `${fetched.items.length} productos base recuperados en ${fetched.pagesFetched} página(s).`,
        data: {
          blueprints: fetched.items.length,
          pagesFetched: fetched.pagesFetched,
          paginated: fetched.paginated,
          reportedLastPage: fetched.reportedLastPage,
        },
      };
    }),
  );

  checks.push(
    await run("categories", "Categorías mostradas en Datable", async () => {
      const items = await listCatalog();
      const cats = new Map<string, number>();
      for (const it of items) cats.set(it.category, (cats.get(it.category) || 0) + 1);
      const other = cats.get("Otros") || 0;
      return {
        status: cats.size > 1 ? "ok" : "warn",
        detail: `${items.length} productos visibles en ${cats.size} categorías (${other} sin clasificar).`,
        data: { visible: items.length, categories: Object.fromEntries(cats) },
      };
    }),
  );

  let providerId = 0;
  let variantIds: number[] = [];
  checks.push(
    await run("variants", "Fabricantes y variantes", async () => {
      if (!sampleBlueprintId) return { status: "skipped", detail: "Sin producto base de muestra." };
      const providers = await listPrintProviders(sampleBlueprintId);
      providerId = providers[0]?.id ?? 0;
      if (!providerId) return { status: "fail", detail: "El producto de muestra no tiene fabricante." };
      const variants = await listBlueprintVariants(sampleBlueprintId, providerId);
      variantIds = variants.map((v) => v.id);
      const areas = new Set(variants.flatMap((v) => v.placeholders.map((p) => p.position)));
      return {
        status: variants.length > 0 ? "ok" : "fail",
        detail: `Producto ${sampleBlueprintId}: ${providers.length} fabricante(s), ${variants.length} variantes, ${areas.size} área(s) de impresión.`,
        data: { blueprintId: sampleBlueprintId, providers: providers.length, variants: variants.length, areas: [...areas] },
      };
    }),
  );

  checks.push(
    await run("costs", "Costos reales de producción", async () => {
      if (!sampleBlueprintId || !providerId) return { status: "skipped", detail: "Sin muestra disponible." };
      const costs = await getVariantCosts(sampleBlueprintId, providerId, variantIds.slice(0, 20));
      const values = [...costs.values()];
      if (!values.length) return { status: "warn", detail: "No se obtuvieron costos para la muestra." };
      return {
        status: "ok",
        detail: `${values.length} costos reales leídos (mín ${Math.min(...values) / 100} USD, máx ${Math.max(...values) / 100} USD).`,
        data: { count: values.length },
      };
    }),
  );

  checks.push(
    await run("shipping", "Costos de envío reales (MX)", async () => {
      if (!sampleBlueprintId || !providerId) return { status: "skipped", detail: "Sin muestra disponible." };
      const ship = await getStandardShippingCosts(sampleBlueprintId, providerId, "MX");
      const values = [...ship.values()];
      if (!values.length)
        return { status: "warn", detail: "La infraestructura no publicó envío a México para esta muestra." };
      return {
        status: "ok",
        detail: `${values.length} tarifas reales de envío (mín ${Math.min(...values) / 100} USD).`,
        data: { count: values.length },
      };
    }),
  );

  checks.push(
    await run("product", "Creación de producto (prueba segura)", async () => {
      if (!options.productTest) {
        return { status: "skipped", detail: "Prueba no solicitada. Crea y borra un producto técnico al activarla." };
      }
      if (!shopId || !sampleBlueprintId || !providerId || !variantIds.length) {
        return { status: "skipped", detail: "Sin muestra disponible." };
      }
      const variants = await listBlueprintVariants(sampleBlueprintId, providerId);
      const withArea = variants.find((v) => v.placeholders.length) ?? variants[0];
      const position = withArea?.placeholders[0]?.position ?? "front";
      const up = await printify<{ id: string }>("/v1/uploads/images.json", {
        method: "POST",
        body: {
          file_name: "datable-diagnostic.png",
          contents:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      });
      let created: PrintifyProduct | null = null;
      try {
        created = await printify<PrintifyProduct>(`/v1/shops/${shopId}/products.json`, {
          method: "POST",
          body: {
            title: "DATABLE-DIAGNOSTIC",
            description: "Prueba interna. No publicar.",
            blueprint_id: sampleBlueprintId,
            print_provider_id: providerId,
            variants: [{ id: withArea?.id ?? variantIds[0], price: 10000, is_enabled: true }],
            print_areas: [
              {
                variant_ids: [withArea?.id ?? variantIds[0]],
                placeholders: [{ position, images: [{ id: up.id, x: 0.5, y: 0.5, scale: 0.9, angle: 0 }] }],
              },
            ],
          },
        });
        return {
          status: created?.id ? "ok" : "fail",
          detail: created?.id
            ? "Producto técnico creado y eliminado correctamente (no se publicó ni generó cobro)."
            : "No se recibió producto creado.",
        };
      } finally {
        if (created?.id) {
          await printify(`/v1/shops/${shopId}/products/${created.id}.json`, { method: "DELETE" }).catch(() => null);
        }
      }
    }),
  );

  checks.push(
    await run("webhooks", "Webhooks registrados", async () => {
      if (!shopId) return { status: "skipped", detail: "Sin espacio de fabricación." };
      const hooks = await listWebhooks(shopId);
      const mine = (hooks || []).filter((h) => h.url.includes("/api/public/commerce/webhook/"));
      return {
        status: mine.length ? "ok" : "warn",
        detail: mine.length
          ? `${mine.length} webhook(s) apuntando a Datable: ${[...new Set(mine.map((h) => h.topic))].join(", ")}.`
          : "No hay webhooks apuntando a Datable todavía (se registran al preparar la primera tienda).",
        data: { topics: [...new Set(mine.map((h) => h.topic))] },
      };
    }),
  );

  return { generatedAt: new Date().toISOString(), configured, checks };
}
