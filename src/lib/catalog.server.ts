/**
 * Catálogo abierto del proveedor de fulfillment.
 * Server-only: usa el token privado y nunca lo expone al navegador.
 */

import { priceBreakdown, suggestedPriceCents } from "@/lib/pricing";

const BASE_URL = "https://api.printful.com";

export { suggestedPriceCents };



export type CatalogItem = {
  id: number;
  title: string;
  brand: string | null;
  type: string;
  typeName: string;
  image: string;
  variantCount: number;
  description: string;
};

export type CatalogVariant = {
  id: number;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  image: string;
  costUsd: number;
  priceCents: number;
  inStock: boolean;
};

let cache: { at: number; items: CatalogItem[] } | null = null;
const TTL_MS = 30 * 60 * 1000;

function token(): string {
  const t = process.env.PRINTFUL_API_TOKEN;
  if (!t) throw new Error("El catálogo no está disponible por ahora.");
  return t;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Catálogo no disponible (${res.status})`);
  const json = JSON.parse(text) as { result?: T };
  return (json.result ?? (json as unknown)) as T;
}



export async function listCatalog(): Promise<CatalogItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const raw = await api<
    Array<{
      id: number;
      title: string;
      brand: string | null;
      type: string;
      type_name: string;
      image: string;
      variant_count: number;
      description: string;
      is_discontinued: boolean;
    }>
  >("/products");
  const items = raw
    .filter((p) => !p.is_discontinued)
    .map((p) => ({
      id: p.id,
      title: p.title,
      brand: p.brand ?? null,
      type: p.type,
      typeName: p.type_name,
      image: p.image,
      variantCount: p.variant_count,
      description: (p.description || "").slice(0, 400),
    }));
  cache = { at: Date.now(), items };
  return items;
}

export async function getCatalogVariants(productId: number): Promise<{
  product: CatalogItem;
  variants: CatalogVariant[];
}> {
  const data = await api<{
    product: {
      id: number;
      title: string;
      brand: string | null;
      type: string;
      type_name: string;
      image: string;
      variant_count: number;
      description: string;
    };
    variants: Array<{
      id: number;
      name: string;
      size: string | null;
      color: string | null;
      color_code: string | null;
      image: string;
      price: string;
      in_stock: boolean;
    }>;
  }>(`/products/${productId}`);

  return {
    product: {
      id: data.product.id,
      title: data.product.title,
      brand: data.product.brand ?? null,
      type: data.product.type,
      typeName: data.product.type_name,
      image: data.product.image,
      variantCount: data.product.variant_count,
      description: (data.product.description || "").slice(0, 400),
    },
    variants: data.variants.map((v) => {
      const costUsd = Number(v.price) || 0;
      return {
        id: v.id,
        name: v.name,
        size: v.size ?? null,
        color: v.color ?? null,
        colorCode: v.color_code ?? null,
        image: v.image,
        costUsd,
        priceCents: suggestedPriceCents(costUsd),
        inStock: v.in_stock,
      };
    }),
  };
}
