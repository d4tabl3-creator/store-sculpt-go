/** Categorías de la tienda de demostración (client-safe). */
export type DemoCategory = {
  slug: string;
  label: string;
  emoji: string;
  match: string[];
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  { slug: "playeras", label: "Playeras", emoji: "👕", match: ["t-shirt", "tank", "polo", "shirt"] },
  { slug: "sudaderas", label: "Sudaderas", emoji: "🧥", match: ["hoodie", "sweatshirt", "jacket"] },
  { slug: "gorras", label: "Gorras", emoji: "🧢", match: ["hat", "cap", "beanie", "visor"] },
  { slug: "tazas", label: "Tazas y botellas", emoji: "☕", match: ["mug", "drinkware", "bottle", "tumbler"] },
  { slug: "arte", label: "Arte y pósters", emoji: "🖼️", match: ["poster", "canvas", "framed", "print"] },
  { slug: "hogar", label: "Hogar", emoji: "🛋️", match: ["pillow", "blanket", "towel", "apron", "mat"] },
  { slug: "accesorios", label: "Accesorios", emoji: "🎒", match: ["bag", "tote", "case", "sticker", "socks", "mousepad", "backpack"] },
];

export function categoryOf(text: string): string | null {
  const t = text.toLowerCase();
  for (const c of DEMO_CATEGORIES) {
    if (c.match.some((m) => t.includes(m))) return c.slug;
  }
  return null;
}

export type DemoProduct = {
  id: number;
  title: string;
  brand: string | null;
  image: string;
  category: string;
  description: string;
  priceCents: number;
  colors: number;
  sizes: number;
};

export function formatMxn(cents: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
