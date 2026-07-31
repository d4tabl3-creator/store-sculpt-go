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

/**
 * Inserta productos elegidos del catálogo en la tienda del comerciante.
 * El precio se calcula en el servidor a partir del costo real del proveedor.
 */
export const addCatalogProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string; items: Array<{ productId: number; variantId?: number }> }) => {
    if (!UUID.test(data.storeId)) throw new Error("storeId inválido");
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Elige al menos un producto");
    if (data.items.length > 40) throw new Error("Máximo 40 productos por tienda");
    for (const it of data.items) {
      if (!Number.isInteger(it.productId)) throw new Error("Producto inválido");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCatalogVariants } = await import("@/lib/catalog.server");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || store.owner_id !== context.userId) throw new Error("No autorizado");

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
      rows.push({
        store_id: data.storeId,
        name: product.title,
        description: product.description,
        price_cents: variant.priceCents,
        image_url: variant.image || product.image,
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
