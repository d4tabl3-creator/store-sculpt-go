import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-fA-F-]{36}$/;

/** Catálogo completo disponible para armar la tienda. */
export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listCatalog } = await import("@/lib/catalog.server");
    return listCatalog();
  });

/** Variantes (talla/color) y precio sugerido de un producto del catálogo. */
export const getCatalogProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: number; printProviderId?: number }) => {
    if (!Number.isInteger(data.productId)) throw new Error("productId inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { getCatalogVariants, getProductProviders } = await import("@/lib/catalog.server");
    const [result, providers] = await Promise.all([
      getCatalogVariants(data.productId, data.printProviderId),
      getProductProviders(data.productId).catch(() => []),
    ]);
    return { ...result, providers };
  });

/** Zonas donde se puede estampar el diseño (frente, espalda, mangas…). */
export const getProductPlacements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: number; variantId?: number; printProviderId?: number }) => {
    if (!Number.isInteger(data.productId)) throw new Error("productId inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { getPlacements } = await import("@/lib/catalog.server");
    try {
      return await getPlacements(data.productId, data.variantId, data.printProviderId);
    } catch {
      return [];
    }
  });

/** Genera la foto del producto con el diseño del comerciante encima. */
export const createProductMockup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      productId: number;
      variantIds: number[];
      placement: string;
      imageUrl: string;
      scale?: number;
      offsetX?: number;
      offsetY?: number;
      printProviderId?: number;
    }) => {
      if (!Number.isInteger(data.productId)) throw new Error("Producto inválido");
      if (!Array.isArray(data.variantIds) || !data.variantIds.length) throw new Error("Elige al menos una variante");
      if (!/^https:\/\//.test(data.imageUrl)) throw new Error("Diseño inválido");
      if (!data.placement) throw new Error("Elige dónde va el diseño");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { generateMockups } = await import("@/lib/catalog.server");
    return generateMockups(data);
  });

/**
 * Inserta productos elegidos del catálogo en la tienda del comerciante.
 * El precio se calcula en el servidor a partir del costo real del proveedor.
 */
export const addCatalogProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      storeId: string;
      items: Array<{
        productId: number;
        variantId?: number;
        name?: string;
        description?: string;
        priceCents?: number;
        designUrl?: string;
        mockupUrl?: string;
        placement?: string;
        printProviderId?: number;
      }>;
    }) => {
      if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
      if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Elige al menos un producto");
      if (data.items.length > 40) throw new Error("Máximo 40 productos por tienda");
      for (const it of data.items) {
        if (!Number.isInteger(it.productId)) throw new Error("Producto inválido");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCatalogVariants } = await import("@/lib/catalog.server");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || store.owner_id !== context.userId) throw new Error("No autorizado");

    /** Copia la maqueta temporal del proveedor a nuestro almacén para que no expire. */
    const mockupCache = new Map<string, string | null>();
    async function persistMockup(url: string, productId: number): Promise<string | null> {
      // Varias tallas del mismo diseño comparten maqueta: se guarda una sola vez.
      if (mockupCache.has(url)) return mockupCache.get(url) ?? null;
      let result: string | null = null;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const path = `${context.userId}/mockups/${productId}-${Date.now()}.jpg`;
          const up = await supabaseAdmin.storage.from("disenos").upload(path, bytes, { contentType: "image/jpeg" });
          if (!up.error) {
            const signed = await supabaseAdmin.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
            result = signed.data?.signedUrl ?? null;
          }
        }
      } catch {
        result = null;
      }
      mockupCache.set(url, result);
      return result;
    }


    const { count } = await supabaseAdmin
      .from("store_products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", data.storeId);

    const rows: Array<Record<string, unknown>> = [];
    let i = count ?? 0;
    for (const item of data.items) {
      const { product, variants, printProviderId } = await getCatalogVariants(item.productId, item.printProviderId);
      const variant =
        variants.find((v) => v.id === item.variantId) ||
        variants.find((v) => v.inStock) ||
        variants[0];
      if (!variant) continue;

      const mockup = item.mockupUrl ? await persistMockup(item.mockupUrl, product.id) : null;

      // El precio nunca puede quedar por debajo del costo base (fabricación +
      // envío): así la ganancia del vendedor jamás es negativa.
      const requested =
        typeof item.priceCents === "number" && item.priceCents > 0
          ? Math.round(item.priceCents)
          : variant.priceCents;
      const priceCents = Math.max(requested, variant.costCents);

      rows.push({
        store_id: data.storeId,
        name: item.name?.trim() || product.title,
        description: item.description?.trim() || product.description,
        price_cents: priceCents,
        base_cost_cents: variant.costCents,
        image_url: mockup || variant.image || product.image,
        mockup_url: mockup,
        design_url: item.designUrl ?? null,
        placement: item.placement ?? null,
        stock: 999,
        sort_order: i++,
        source_provider: "printify",
        source_product_id: `${product.id}:${printProviderId}`,
        source_variant_id: String(variant.id),
      });
    }
    if (!rows.length) throw new Error("No se pudo cargar el catálogo elegido");

    const { error } = await supabaseAdmin.from("store_products").insert(rows as never);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });
