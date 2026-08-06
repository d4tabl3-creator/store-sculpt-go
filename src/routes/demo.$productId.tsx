import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMxn } from "@/lib/demo-catalog";
import { addToDemoCart } from "@/lib/demo-cart";
import { getDemoProduct } from "@/lib/demo.functions";

export const Route = createFileRoute("/demo/$productId")({
  head: () => ({
    meta: [
      { title: "Producto demo — así compra tu cliente | DªTªBLe" },
      { name: "description", content: "Página de producto de la tienda demo: elige color y talla, mira el precio real y agrega al carrito." },
      { property: "og:title", content: "Producto demo — así compra tu cliente" },
      { property: "og:description", content: "Elige color y talla, mira el precio real y agrega al carrito en la tienda de ejemplo." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoProductPage,
});

/** Orden natural de tallas (XS → 6XL); lo demás va al final alfabético. */
const SIZE_ORDER = ["XXS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
function sizeRank(size: string | null): number {
  if (!size) return 999;
  const i = SIZE_ORDER.indexOf(size.toUpperCase().trim());
  return i === -1 ? 500 : i;
}

function DemoProductPage() {

  const { productId } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["demo-product", productId],
    queryFn: () => getDemoProduct({ data: { productId: Number(productId) } }),
    staleTime: 10 * 60 * 1000,
  });

  const variants = data?.variants ?? [];
  const colors = useMemo(() => {
    const map = new Map<string, { color: string; code: string | null }>();
    for (const v of variants) if (v.color && !map.has(v.color)) map.set(v.color, { color: v.color, code: v.colorCode });
    return [...map.values()];
  }, [variants]);

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    if (variants.length && color === null) {
      const first = variants.find((v) => v.inStock) ?? variants[0];
      setColor(first.color);
      setSize(first.size);
    }
  }, [variants, color]);

  const sizes = useMemo(
    () =>
      variants
        .filter((v) => (color ? v.color === color : true))
        .slice()
        .sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
    [variants, color],
  );

  const current = useMemo(
    () => sizes.find((v) => v.size === size) ?? sizes.find((v) => v.inStock) ?? sizes[0] ?? variants[0],
    [sizes, size, variants],
  );


  if (isLoading) {
    return (
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  if (isError || !data || !current) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Producto no disponible</h1>
        <Button asChild className="mt-4"><Link to="/demo">Volver a la tienda demo</Link></Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/demo" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Seguir comprando
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-muted">
          <img src={current.image || data.product.image} alt={data.product.title} className="size-full object-cover" />
        </div>

        <div>
          {data.product.brand && (
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{data.product.brand}</div>
          )}
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">{data.product.title}</h1>
          <div className="mt-3 font-display text-3xl text-primary">{formatMxn(current.priceCents)}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-widest">
            {current.inStock ? (
              <span className="text-emerald-600">Disponible</span>
            ) : (
              <span className="text-muted-foreground">Agotado en esta variante</span>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            <div className="mb-1 font-semibold uppercase tracking-widest">Solo para ti (no lo ve tu cliente)</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>Costo proveedor: <strong className="text-foreground">{formatMxn(current.costCents)}</strong></span>
              <span>Tu ganancia: <strong className="text-foreground">{formatMxn(current.marginCents)}</strong></span>
              <span>Margen: <strong className="text-foreground">{current.marginPct}%</strong></span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.product.description}</p>


          {colors.length > 1 && (
            <div className="mt-6">
              <div className="text-sm font-semibold">Color: <span className="text-muted-foreground">{color}</span></div>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map((c) => {
                  const available = variants.some((v) => v.color === c.color && v.inStock);
                  return (
                    <button
                      key={c.color}
                      onClick={() => { setColor(c.color); setSize(null); }}
                      title={available ? c.color : `${c.color} · agotado`}
                      className={`size-8 rounded-full border-2 transition ${color === c.color ? "border-primary scale-110" : "border-border"} ${available ? "" : "opacity-30"}`}
                      style={{ background: c.code || "#ccc" }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {sizes.some((v) => v.size) && (
            <div className="mt-6">
              <div className="text-sm font-semibold">Talla</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.filter((v) => v.size).map((v) => (
                  <button
                    key={v.id}
                    disabled={!v.inStock}
                    onClick={() => setSize(v.size)}
                    title={v.inStock ? v.size ?? "" : "Agotado"}
                    className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${current.id === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="mt-8 w-full"
            size="lg"
            disabled={!current.inStock}
            onClick={() => {
              addToDemoCart({
                productId: data.product.id,
                variantId: current.id,
                title: data.product.title,
                variantLabel: [current.color, current.size].filter(Boolean).join(" · ") || "Único",
                image: current.image || data.product.image,
                priceCents: current.priceCents,
              });
              toast.success("Agregado al carrito");
            }}
          >
            {current.inStock ? "Agregar al carrito" : "Agotado"}
          </Button>


          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Truck className="size-4 text-primary" /> Se produce y envía cuando alguien compra</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Pago con tarjeta procesado de forma segura</li>
            <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Sin inventario ni dinero adelantado</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
