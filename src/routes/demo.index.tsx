import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Truck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_CATEGORIES, formatMxn, type DemoProduct } from "@/lib/demo-catalog";
import { getDemoCatalog } from "@/lib/demo.functions";

const DESC =
  "Recorre una tienda de ejemplo real: categorías, productos con tallas y colores, carrito y checkout. Así se ve la tienda que te entregamos.";

export const Route = createFileRoute("/demo/")({
  validateSearch: (search: Record<string, unknown>) => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tienda demo — Prueba cómo funciona tu tienda | DªTªBLe" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Tienda demo — Prueba cómo funciona tu tienda" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoIndex,
});

function DemoIndex() {
  const { cat } = Route.useSearch();
  const [active, setActive] = useState<string | undefined>(cat);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["demo-catalog"],
    queryFn: () => getDemoCatalog(),
    staleTime: 10 * 60 * 1000,
  });

  const selected = active ?? cat;
  const products = useMemo(
    () => (data || []).filter((p) => !selected || p.category === selected),
    [data, selected],
  );

  return (
    <>
      <section className="border-b border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h1 className="font-display text-4xl sm:text-5xl">Tienda demo</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Navega, elige talla y color, agrega al carrito y llega al pago. Todo lo que ves aquí es
            exactamente lo que recibe tu cliente cuando abres tu tienda.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Truck className="size-4 text-primary" /> Envío directo del proveedor</span>
            <span className="flex items-center gap-1"><ShieldCheck className="size-4 text-primary" /> Pago seguro con tarjeta</span>
            <span className="flex items-center gap-1"><Sparkles className="size-4 text-primary" /> Sin inventario</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActive(undefined)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${!selected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
          >
            Todo
          </button>
          {DEMO_CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActive(c.slug)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selected === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              <span className="mr-1">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-border p-10 text-center">
            <p className="text-muted-foreground">El catálogo demo no está disponible en este momento.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p: DemoProduct) => (
              <Link
                key={p.id}
                to="/demo/$productId"
                params={{ productId: String(p.id) }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-pop transition hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={p.image} alt={p.title} loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold">{p.title}</h2>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-lg">{formatMxn(p.priceCents)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.colors > 0 ? `${p.colors} colores` : "Único"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !isError && products.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No hay productos en esta categoría.</p>
        )}

        <div className="mt-16 rounded-3xl border border-border bg-card/60 p-8 text-center">
          <h2 className="font-display text-2xl">¿Te gusta cómo se ve?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tu tienda se arma en minutos con tu nombre, tus colores y los productos que elijas del mismo catálogo.
          </p>
          <Button asChild className="mt-5"><Link to="/auth">Crear mi tienda</Link></Button>
        </div>
      </main>
    </>
  );
}

