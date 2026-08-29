import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedStripe } from "@/components/EmbeddedStripe";
import { getStripeEnvironment } from "@/lib/stripe";
import { startStoreCheckout } from "@/lib/payments.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useT } from "@/lib/i18n";

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
  shipping_cost_cents: number;
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
      .select("id, name, description, price_cents, image_url, stock, shipping_cost_cents")
      .eq("store_id", store.id)
      .order("sort_order");
    return { store: store as Store, products: (products as Product[]) || [] };
  },
  head: ({ params, loaderData }) => {
    const url = `https://store-sculpt-go.lovable.app/t/${params.slug}`;
    const title = loaderData ? `${loaderData.store.name} — Tienda online` : "Tienda";
    const desc = loaderData
      ? `${loaderData.store.name}: catálogo de ${loaderData.store.niche}. Compra directo con envío incluido.`
      : "Tienda online.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: loaderData.store.name,
                url,
                about: loaderData.store.niche,
                hasPart: loaderData.products.slice(0, 20).map((p) => ({
                  "@type": "Product",
                  name: p.name,
                  ...(p.description ? { description: p.description } : {}),
                  ...(p.image_url ? { image: p.image_url } : {}),
                  offers: {
                    "@type": "Offer",
                    priceCurrency: "MXN",
                    price: (p.price_cents / 100).toFixed(2),
                    availability: p.stock > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                  },
                })),
              }),
            },
          ]
        : [],
    };
  },
  component: Storefront,
  notFoundComponent: () => <StoreNotFound />,
});

type CartItem = { product: Product; qty: number };

function StoreNotFound() {
  const t = useT();
  return (
    <div className="grid min-h-screen place-items-center bg-background p-8 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("Tienda no encontrada", "Store not found")}</h1>
        <p className="mt-2 text-muted-foreground">{t("La tienda que buscas no existe o ya no está publicada.", "The store you're looking for doesn't exist or is no longer published.")}</p>
        <Button asChild className="mt-4"><Link to="/">{t("Ir al inicio", "Go home")}</Link></Button>
      </div>
    </div>
  );
}

function Storefront() {
  const t = useT();
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
    toast.success(t(`${p.name} agregado`, `${p.name} added`));
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
                <span className="ml-2 hidden sm:inline">{t("Carrito", "Cart")}</span>
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle>{t("Tu carrito", "Your cart")}</SheetTitle></SheetHeader>
              {!checkout ? (
                <>
                  <div className="flex-1 overflow-y-auto py-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground">{t("Tu carrito está vacío", "Your cart is empty")}</p>
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
                        <span>{t("Subtotal", "Subtotal")}</span>
                        <span>${(subtotal / 100).toFixed(2)}</span>
                      </div>
                      <Button onClick={() => setCheckout(true)} className="mt-4 w-full" style={{ background: store.primary_color }}>
                        {t("Continuar al pago", "Continue to payment")}
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
          <p className="mt-3 text-muted-foreground">{t("Productos seleccionados con cariño. Envío a todo el país.", "Products handpicked with care. Nationwide shipping.")}</p>
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
                    <Plus className="mr-1 size-3.5" /> {t("Agregar", "Add")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        {t("Hecho con", "Made with")} <Link to="/" className="font-bold text-foreground hover:text-primary">DªTªBLe</Link>
      </footer>
    </div>
  );
}

function CheckoutForm({
  store,
  cart,
  subtotal,
  onCancel,
  onDone: _onDone,
}: {
  store: Store;
  cart: CartItem[];
  subtotal: number;
  onCancel: () => void;
  onDone: () => void;
}) {
  void _onDone;
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ orderId: string; clientSecret: string } | null>(null);

  // Envío separado: suma del costo real de envío de cada producto.
  const shippingCents = useMemo(
    () => cart.reduce((acc, c) => acc + (c.product.shipping_cost_cents || 0) * c.qty, 0),
    [cart],
  );
  const total = subtotal + shippingCents;

  const fetchClientSecret = useCallback(async () => {
    if (!orderInfo) throw new Error(t("Sin sesión", "No session"));
    return orderInfo.clientSecret;
  }, [orderInfo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await startStoreCheckout({
      data: {
        storeId: store.id,
        items: cart.map((c) => ({ productId: c.product.id, qty: c.qty })),
        customer: { name, email, phone: phone || undefined, address, notes: notes || undefined },
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&slug=${store.slug}`,
        environment: getStripeEnvironment(),
      },
    });
    setSubmitting(false);
    if ("error" in res) { toast.error(res.error); return; }
    setOrderInfo({ orderId: res.orderId, clientSecret: res.clientSecret });
  }

  if (orderInfo) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        <p className="mb-3 text-sm text-muted-foreground">
          {t("Total a pagar:", "Total to pay:")} <span className="font-bold text-foreground">${(total / 100).toFixed(2)} MXN</span>
        </p>
        <EmbeddedStripe fetchClientSecret={fetchClientSecret} minHeight={500} />
        <Button type="button" variant="ghost" className="mt-3" onClick={onCancel}>{t("Cancelar", "Cancel")}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto py-4">
      <div className="space-y-3">
        <div><Label htmlFor="n">{t("Nombre completo", "Full name")}</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="e">{t("Email", "Email")}</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="p">{t("Teléfono", "Phone")}</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label htmlFor="a">{t("Dirección de envío", "Shipping address")}</Label><Textarea id="a" required value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label htmlFor="nt">{t("Notas (opcional)", "Notes (optional)")}</Label><Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <div className="flex justify-between text-sm"><span>{t("Subtotal", "Subtotal")}</span><span>${(subtotal / 100).toFixed(2)}</span></div>
        <div className="flex justify-between text-sm"><span>{t("Envío", "Shipping")}</span><span>${(shippingCents / 100).toFixed(2)}</span></div>
        <div className="mt-1 flex justify-between text-lg font-bold"><span>{t("Total", "Total")}</span><span>${(total / 100).toFixed(2)}</span></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t("Atrás", "Back")}</Button>
        <Button type="submit" disabled={submitting} style={{ background: store.primary_color }}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("Ir a pagar", "Go to payment")}
        </Button>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Pago seguro procesado por Stripe.", "Secure payment processed by Stripe.")}</p>
    </form>
  );
}
