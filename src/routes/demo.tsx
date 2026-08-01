import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DEMO_CATEGORIES, formatMxn } from "@/lib/demo-catalog";
import { setDemoQty, useDemoCart } from "@/lib/demo-cart";

export const Route = createFileRoute("/demo")({
  component: DemoLayout,
});

function DemoLayout() {
  const cart = useDemoCart();
  const [open, setOpen] = useState(false);
  const [wall, setWall] = useState(false);
  const navigate = useNavigate();
  const subtotal = cart.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-4 py-2 text-center text-xs font-bold text-primary-foreground sm:text-sm">
        Tienda de demostración · así se ve y funciona la tienda que te entregamos ·{" "}
        <Link to="/auth" className="underline underline-offset-2">Crear la mía</Link>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/demo" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm text-primary-foreground">
              DL
            </span>
            <div className="leading-none">
              <div className="font-display text-base">Tienda Demo</div>
              <div className="text-[11px] text-muted-foreground">Ejemplo en vivo</div>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {DEMO_CATEGORIES.slice(0, 5).map((c) => (
              <Link
                key={c.slug}
                to="/demo"
                search={{ cat: c.slug }}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {c.label}
              </Link>
            ))}
          </nav>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative ml-auto lg:ml-2">
                <ShoppingBag className="size-4" />
                <span className="ml-2 hidden sm:inline">Carrito</span>
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle>Tu carrito (demo)</SheetTitle></SheetHeader>

              {wall ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                  <Sparkles className="size-10 text-primary" />
                  <h3 className="font-display text-2xl">Hasta aquí llega la demo</h3>
                  <p className="text-sm text-muted-foreground">
                    En una tienda real este botón cobra con tarjeta y manda la orden al proveedor,
                    que produce y envía al cliente. Tú solo recibes tu dinero.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => { setOpen(false); navigate({ to: "/auth" }); }}
                  >
                    Crear mi tienda real <ArrowRight className="ml-1 size-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setWall(false)}>Seguir explorando la demo</Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto py-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">
                        Tu carrito está vacío. Agrega productos para ver cómo funciona.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((i) => (
                          <div key={i.key} className="flex gap-3 rounded-xl border border-border p-3">
                            <img src={i.image} alt="" className="size-16 rounded-lg object-cover" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{i.title}</div>
                              <div className="text-xs text-muted-foreground">{i.variantLabel}</div>
                              <div className="mt-1 text-sm font-bold">{formatMxn(i.priceCents)}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => setDemoQty(i.key, i.qty - 1)}><Minus className="size-3" /></Button>
                                <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                                <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => setDemoQty(i.key, i.qty + 1)}><Plus className="size-3" /></Button>
                                <Button size="sm" variant="ghost" className="ml-auto size-7 p-0" onClick={() => setDemoQty(i.key, 0)}><X className="size-3" /></Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Subtotal</span><span>{formatMxn(subtotal)}</span>
                      </div>
                      <Button className="mt-4 w-full" onClick={() => setWall(true)}>Finalizar compra</Button>
                      <p className="mt-2 text-center text-[11px] text-muted-foreground">
                        En la demo no se cobra nada.
                      </p>
                    </div>
                  )}
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <Outlet />

      <footer className="border-t border-border/60 py-10 text-center">
        <p className="text-sm text-muted-foreground">Esta tienda de ejemplo funciona con el mismo motor que tu tienda.</p>
        <Button asChild className="mt-4"><Link to="/auth">Quiero una igual <ArrowRight className="ml-1 size-4" /></Link></Button>
      </footer>
    </div>
  );
}
