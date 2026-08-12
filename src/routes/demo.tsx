import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Minus, Plus, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DEMO_CATEGORIES, formatMxn } from "@/lib/demo-catalog";
import { DEMO_THEMES, themeStyle } from "@/lib/demo-themes";
import { setDemoQty, useDemoCart } from "@/lib/demo-cart";

export const Route = createFileRoute("/demo")({
  component: DemoLayout,
});

function DemoLayout() {
  const cart = useDemoCart();
  const [open, setOpen] = useState(false);
  const [wall, setWall] = useState(false);
  const [themeId, setThemeId] = useState(DEMO_THEMES[0].id);
  const navigate = useNavigate();
  const theme = DEMO_THEMES.find((t) => t.id === themeId) ?? DEMO_THEMES[0];
  const subtotal = cart.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de control DªTªBLe (fuera de la tienda) */}
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-card px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs">
        <span>
          Vista previa de una tienda de cliente · el diseño es 100% tuyo
        </span>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          {DEMO_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemeId(t.id)}
              className={`rounded-full px-3 py-1 transition ${t.id === themeId ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link to="/auth" className="underline underline-offset-2 hover:text-foreground">
          Crear la mía
        </Link>
      </div>

      <div
        data-demo-theme={theme.id}
        style={themeStyle(theme)}
        className="min-h-screen bg-background text-foreground"
      >
        <style>{`[data-demo-theme] .font-display,[data-demo-theme] h1,[data-demo-theme] h2,[data-demo-theme] h3{font-family:${theme.headingFont};letter-spacing:0}`}</style>

        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
            <Link to="/demo" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {theme.initials}
              </span>
              <div className="leading-tight">
                <div className="font-display text-lg tracking-tight">{theme.brand}</div>
                <div className="text-[11px] text-muted-foreground">{theme.tagline}</div>
              </div>
            </Link>

            <nav className="ml-auto hidden items-center gap-5 lg:flex">
              {DEMO_CATEGORIES.slice(0, 5).map((c) => (
                <Link
                  key={c.slug}
                  to="/demo"
                  search={{ cat: c.slug }}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {c.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:ml-6">
              <Search className="hidden size-5 text-muted-foreground sm:block" />
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <ShoppingBag className="size-5" />
                    {count > 0 && (
                      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  style={themeStyle(theme)}
                  className="flex w-full flex-col bg-background text-foreground sm:max-w-md"
                >
                  <SheetHeader>
                    <SheetTitle>Tu bolsa</SheetTitle>
                  </SheetHeader>

                  {wall ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                      <Sparkles className="size-10 text-primary" />
                      <h3 className="font-display text-2xl">Hasta aquí llega la demo</h3>
                      <p className="text-sm text-muted-foreground">
                        En tu tienda real este botón cobra el pedido y Datable coordina la
                        operación para que llegue hasta tu cliente. Tú solo recibes tu dinero.
                      </p>

                      <Button
                        className="w-full"
                        onClick={() => {
                          setOpen(false);
                          navigate({ to: "/auth" });
                        }}
                      >
                        Crear mi tienda real <ArrowRight className="ml-1 size-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => setWall(false)}>
                        Seguir explorando
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto py-4">
                        {cart.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground">
                            Tu bolsa está vacía.
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
                            <span>Subtotal</span>
                            <span>{formatMxn(subtotal)}</span>
                          </div>
                          <Button className="mt-4 w-full" onClick={() => setWall(true)}>
                            Pagar
                          </Button>
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
          </div>
        </header>

        <Outlet />

        <footer className="border-t border-border py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center">
            <div className="font-display text-xl">{theme.brand}</div>
            <p className="text-xs text-muted-foreground">
              Envíos a todo México · Devoluciones 30 días · Pago seguro con tarjeta
            </p>
            <Link to="/auth" className="mt-4 text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground">
              Esta tienda funciona con DªTªBLe — crea la tuya
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
