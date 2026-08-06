import { createServerFn } from "@tanstack/react-start";

/**
 * Catálogo público de la tienda de demostración.
 * Sin auth: cualquiera puede recorrer la demo antes de registrarse.
 */
export const getDemoCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { buildDemoCatalog } = await import("@/lib/demo.server");
  return buildDemoCatalog();
});

export const getDemoProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { productId: number }) => {
    if (!Number.isInteger(data.productId)) throw new Error("Producto inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { getCatalogVariants } = await import("@/lib/catalog.server");
    const { product, variants } = await getCatalogVariants(data.productId);
    return {
      product,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color,
        colorCode: v.colorCode,
        image: v.image,
        priceCents: v.priceCents,
        costCents: v.costCents,
        marginCents: v.marginCents,
        marginPct: v.marginPct,
        inStock: v.inStock,
      })),
    };
  });
