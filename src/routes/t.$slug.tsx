import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { StoreEmbeddedCheckout } from "@/components/StoreEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type Store = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  shipping_options: Array<{ id: string; label: string; price_cents: number }>;
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
};

export const Route = createFileRoute("/t/$slug")({
  loader: async ({ params }) => {
    const { data: store } = await supabase
      .from("stores")
      .select("id, slug, name, niche, primary_color, shipping_options")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!store) throw notFound();
    const { data: products } = await supabase
      .from("store_products")
      .select("id, name, description, price_cents, image_url, stock")
      .eq("store_id", store.id)
      .order("sort_order");
    return { store: store as Store, products: (products as Product[]) || [] };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.store.name} — Tienda online` : "Tienda" },
      { name: "description", content: loaderData ? `${loaderData.store.name} — ${loaderData.store.niche}` : "" },
    ],
  }),
  component: Storefront,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Tienda no encontrada</h1>
        <p className="mt-2 text-muted-foreground">La tienda que buscas no existe o ya no está publicada.</p>
        <Button asChild className="mt-4"><Link to="/">Ir al inicio</Link></Button>
      </div>
    </div>
  ),
});

type CartItem = { product: Product; qty: number };

function Storefront() {
  const { store, products } = Route.useLoaderData();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);

  const subtotal = cart.reduce((s, c) => s + c.product.price_cents * c.qty, 0);
  const accent = { ["--accent-color" as any]: store.primary_color };

  function add(p: Product) {
    setCart((c) => {
      const existing = c.find((x) => x.product.id === p.id);
      if (existing) return c.map((x) => (x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { product: p, qty: 1 }];
    });
    toast.success(`${p.name} agregado`);
  }

  function setQty(pid: string, qty: number) {
    if (qty <= 0) setCart((c) => c.filter((x) => x.product.id !== pid));
    else setCart((c) => c.map((x) => (x.product.id === pid ? { ...x, qty } : x)));
  }

  return (
    <div className="min-h-screen bg-background" style={accent as React.CSSProperties}>
      <PaymentTestModeBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/t/$slug" params={{ slug: store.slug }} className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg font-bold text-white" style={{ background: store.primary_color }}>
              {store.name.slice(0, 1)}
            </span>
            <div>
              <div className="font-display text-lg font-extrabold leading-none">{store.name}</div>
              <div className="text-xs text-muted-foreground">{store.niche}</div>
            </div>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingBag className="size-4" />
                <span className="ml-2 hidden sm:inline">Carrito</span>
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle>Tu carrito</SheetTitle></SheetHeader>
              {!checkout ? (
                <>
                  <div className="flex-1 overflow-y-auto py-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground">Tu carrito está vacío</p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((c) => (
                          <div key={c.product.id} className="flex gap-3 rounded-lg border border-border p-3">
                            {c.product.image_url && <img src={c.product.image_url} alt="" className="size-16 rounded object-cover" />}
                            <div className="flex-1">
                              <div className="font-medium">{c.product.name}</div>
                              <div className="text-sm text-muted-foreground">${(c.product.price_cents / 100).toFixed(2)}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => setQty(c.product.id, c.qty - 1)}><Minus className="size-3" /></Button>
                                <span className="w-6 text-center text-sm font-bold">{c.qty}</span>
                                <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => setQty(c.product.id, c.qty + 1)}><Plus className="size-3" /></Button>
                                <Button size="sm" variant="ghost" className="ml-auto size-7 p-0" onClick={() => setQty(c.product.id, 0)}><X className="size-3" /></Button>
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
                        <span>${(subtotal / 100).toFixed(2)}</span>
                      </div>
                      <Button onClick={() => setCheckout(true)} className="mt-4 w-full" style={{ background: store.primary_color }}>
                        Continuar al pago
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <CheckoutForm
                  store={store}
                  cart={cart}
                  subtotal={subtotal}
                  onCancel={() => setCheckout(false)}
                  onDone={() => {
                    setCart([]);
                    setCheckout(false);
                    setOpen(false);
                  }}
                />
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="border-b border-border/60" style={{ background: `linear-gradient(135deg, ${store.primary_color}15, transparent)` }}>
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{store.name}</h1>
          <p className="mt-3 text-muted-foreground">Productos seleccionados con cariño. Envío a todo el país.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: Product) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
              {p.image_url && (
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={p.image_url} alt={p.name} className="size-full object-cover transition-transform hover:scale-105" loading="lazy" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-bold">${(p.price_cents / 100).toFixed(2)}</span>
                  <Button onClick={() => add(p)} size="sm" style={{ background: store.primary_color }}>
                    <Plus className="mr-1 size-3.5" /> Agregar
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Hecho con <Link to="/" className="font-bold text-foreground hover:text-primary">DªTªBLe</Link>
      </footer>
    </div>
  );
}

function CheckoutForm({
  store,
  cart,
  subtotal,
  onCancel,
  onDone,
}: {
  store: Store;
  cart: CartItem[];
  subtotal: number;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingId, setShippingId] = useState(store.shipping_options[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const shipping = useMemo(
    () => store.shipping_options.find((o) => o.id === shippingId),
    [shippingId, store.shipping_options],
  );
  const total = subtotal + (shipping?.price_cents || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase
      .from("store_orders")
      .insert({
        store_id: store.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        shipping_address: `${address}${shipping ? ` · ${shipping.label}` : ""}`,
        items: cart.map((c) => ({
          name: c.product.name,
          qty: c.qty,
          price_cents: c.product.price_cents,
        })),
        total_cents: total,
        notes: notes || null,
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("No se pudo crear el pedido: " + (error?.message || "error desconocido"));
      return;
    }
    setOrderId(data.id);
  }

  if (orderId) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Total a pagar: <span className="font-bold text-foreground">${(total / 100).toFixed(2)} MXN</span>
        </p>
        <StoreEmbeddedCheckout
          orderId={orderId}
          storeName={store.name}
          storeSlug={store.slug}
          customerEmail={email}
          items={cart.map((c) => ({
            name: c.product.name,
            qty: c.qty,
            price_cents: c.product.price_cents,
          }))}
          shippingLabel={shipping?.label}
          shippingCents={shipping?.price_cents}
        />
        <Button type="button" variant="ghost" className="mt-3" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto py-4">
      <div className="space-y-3">
        <div><Label htmlFor="n">Nombre completo</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="p">Teléfono</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label htmlFor="a">Dirección de envío</Label><Textarea id="a" required value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        {store.shipping_options.length > 0 && (
          <div>
            <Label>Método de envío</Label>
            <div className="mt-1 space-y-1">
              {store.shipping_options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded border border-border p-2 text-sm">
                  <input type="radio" checked={shippingId === o.id} onChange={() => setShippingId(o.id)} />
                  <span className="flex-1">{o.label}</span>
                  <span className="font-bold">${(o.price_cents / 100).toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div><Label htmlFor="nt">Notas (opcional)</Label><Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div>
        {shipping && <div className="flex justify-between text-sm"><span>Envío</span><span>${(shipping.price_cents / 100).toFixed(2)}</span></div>}
        <div className="mt-1 flex justify-between text-lg font-bold"><span>Total</span><span>${(total / 100).toFixed(2)}</span></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Atrás</Button>
        <Button type="submit" disabled={submitting} style={{ background: store.primary_color }}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Ir a pagar
        </Button>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Pago seguro procesado por Stripe.</p>
    </form>
  );
}

// keep onDone reference used elsewhere
void 0;
