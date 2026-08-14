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
  .inputValidator((data: { productId: number }) => {
    if (!Number.isInteger(data.productId)) throw new Error("productId inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { getCatalogVariants } = await import("@/lib/catalog.server");
    return getCatalogVariants(data.productId);
  });

/** Zonas donde se puede estampar el diseño (frente, espalda, mangas…). */
export const getProductPlacements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: number; variantId?: number }) => {
    if (!Number.isInteger(data.productId)) throw new Error("productId inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { getPlacements } = await import("@/lib/catalog.server");
    try {
      return await getPlacements(data.productId, data.variantId);
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
    async function persistMockup(url: string, productId: number): Promise<string | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        const path = `${context.userId}/mockups/${productId}-${Date.now()}.jpg`;
        const up = await supabaseAdmin.storage.from("disenos").upload(path, bytes, { contentType: "image/jpeg" });
        if (up.error) return null;
        const signed = await supabaseAdmin.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
        return signed.data?.signedUrl ?? null;
      } catch {
        return null;
      }
    }

    const { count } = await supabaseAdmin
      .from("store_products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", data.storeId);

    const rows: Array<Record<string, unknown>> = [];
    let i = count ?? 0;
    for (const item of data.items) {
      const { product, variants } = await getCatalogVariants(item.productId);
      const variant =
        variants.find((v) => v.id === item.variantId) ||
        variants.find((v) => v.inStock) ||
        variants[0];
      if (!variant) continue;

      const mockup = item.mockupUrl ? await persistMockup(item.mockupUrl, product.id) : null;

      rows.push({
        store_id: data.storeId,
        name: item.name?.trim() || product.title,
        description: product.description,
        price_cents: variant.priceCents,
        image_url: mockup || variant.image || product.image,
        mockup_url: mockup,
        design_url: item.designUrl ?? null,
        placement: item.placement ?? null,
        stock: 999,
        sort_order: i++,
        source_provider: "printful",
        source_product_id: String(product.id),
        source_variant_id: String(variant.id),
      });
    }
    if (!rows.length) throw new Error("No se pudo cargar el catálogo elegido");

    const { error } = await supabaseAdmin.from("store_products").insert(rows as never);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });
