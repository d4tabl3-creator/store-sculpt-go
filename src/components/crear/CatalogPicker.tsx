import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import type { CatalogItem } from "@/lib/product-draft";

/** Primera pantalla del flujo: explorar y elegir qué vender. */
export function CatalogPicker({
  items,
  loading,
  error,
  onPick,
}: {
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  onPick: (item: CatalogItem) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visible, setVisible] = useState(48);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of items) map.set(p.category || p.typeName, (map.get(p.category || p.typeName) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (p) =>
        (category === "all" || (p.category || p.typeName) === category) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          (p.typeName || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold uppercase">{t("Elige qué quieres vender", "Choose what you want to sell")}</h1>
      <p className="mt-1 text-muted-foreground">
        {t("Explora productos y elige qué quieres agregar a tu tienda.", "Browse products and choose what you want to add to your store.")}
      </p>

      <div className="sticky top-0 z-10 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("Buscar: playera, taza, hoodie, poster…", "Search: shirt, mug, hoodie, poster…")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(48);
            }}
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setCategory("all");
              setVisible(48);
            }}
            className={`whitespace-nowrap rounded-full border-2 px-3 py-1 text-xs font-bold ${category === "all" ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
          >
            {t("Todo", "All")} ({items.length})
          </button>
          {categories.map(([name, n]) => (
            <button
              key={name}
              onClick={() => {
                setCategory(name);
                setVisible(48);
              }}
              className={`whitespace-nowrap rounded-full border-2 px-3 py-1 text-xs font-bold ${category === name ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
            >
              {name} ({n})
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("Cargando productos…", "Loading products…")}
        </div>
      )}
      {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.slice(0, visible).map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="group overflow-hidden rounded-2xl border-2 border-border bg-card text-left transition-all hover:border-primary hover:shadow-pop"
          >
            <div className="aspect-square bg-muted">
              <img src={p.image} alt={p.title} loading="lazy" className="size-full object-cover" />
            </div>
            <div className="p-3">
              <div className="line-clamp-2 text-xs font-bold leading-snug">{p.title}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{p.category || p.typeName}</div>
              <div className="mt-2 text-[11px] font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                {t("Crear este producto →", "Create this product →")}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length > visible && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setVisible((v) => v + 48)}>
            {t("Ver más", "See more")} ({filtered.length - visible} {t("restantes", "left")})
          </Button>
        </div>
      )}
    </section>
  );
}
