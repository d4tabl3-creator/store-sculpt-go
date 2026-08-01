import { DEMO_CATEGORIES, categoryOf, type DemoProduct } from "@/lib/demo-catalog";

let cache: { at: number; items: DemoProduct[] } | null = null;
const TTL_MS = 30 * 60 * 1000;
const PER_CATEGORY = 6;

/**
 * Arma un catálogo curado (pocos productos por categoría) con precios reales
 * calculados desde el costo del proveedor.
 */
export async function buildDemoCatalog(): Promise<DemoProduct[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;

  const { listCatalog, getCatalogVariants } = await import("@/lib/catalog.server");
  const all = await listCatalog();

  const picked: Array<{ id: number; category: string }> = [];
  for (const cat of DEMO_CATEGORIES) {
    const matches = all.filter((p) => categoryOf(`${p.typeName} ${p.type} ${p.title}`) === cat.slug);
    for (const p of matches.slice(0, PER_CATEGORY)) picked.push({ id: p.id, category: cat.slug });
  }

  const items: DemoProduct[] = [];
  const BATCH = 6;
  for (let i = 0; i < picked.length; i += BATCH) {
    const batch = picked.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (entry) => {
        try {
          const { product, variants } = await getCatalogVariants(entry.id);
          const available = variants.filter((v) => v.inStock);
          const pool = available.length ? available : variants;
          if (!pool.length) return null;
          const priceCents = Math.min(...pool.map((v) => v.priceCents));
          return {
            id: product.id,
            title: product.title,
            brand: product.brand,
            image: product.image,
            category: entry.category,
            description: product.description,
            priceCents,
            colors: new Set(pool.map((v) => v.color).filter(Boolean)).size,
            sizes: new Set(pool.map((v) => v.size).filter(Boolean)).size,
          } satisfies DemoProduct;
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) if (r) items.push(r);
  }

  cache = { at: Date.now(), items };
  return items;
}
