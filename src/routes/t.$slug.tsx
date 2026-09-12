import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeUsuario } from "@/lib/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedStripe } from "@/components/EmbeddedStripe";
import { getStripeEnvironment, paymentsAvailable } from "@/lib/stripe";
import { startStoreCheckout, quoteStoreCart } from "@/lib/payments.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useT } from "@/lib/i18n";
import { publicUrlFor } from "@/lib/public-url";
import { StoreTemplate } from "@/components/store-templates";

type Store = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  template: string;
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
      .select("id, slug, name, niche, primary_color, template")
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
    const url = publicUrlFor(`/t/${params.slug}`);
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
  const storageKey = `datable-cart-${store.slug}`;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);

  // El carrito se conserva en el navegador de la clienta: si cierra el
  // carrito, va y vuelve dentro de la tienda, o recarga la página, sus
  // productos siguen ahí. Solo se vacía al completar la compra.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as CartItem[];
        if (Array.isArray(saved)) {
          const valid = saved
            .filter((c) => products.some((p) => p.id === c.product.id))
            .map((c) => {
              const current = products.find((p) => p.id === c.product.id)!;
              return { ...c, product: current };
            });
          if (valid.length > 0) setCart(valid);
        }
      }
    } catch {
      // Si no se puede leer, el carrito simplemente empieza vacío.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    try {
      if (cart.length > 0) window.localStorage.setItem(storageKey, JSON.stringify(cart));
      else window.localStorage.removeItem(storageKey);
    } catch {
      // Sin espacio o modo privado: el carrito vive solo en memoria.
    }
  }, [cart, storageKey]);

  // Si el carrito queda vacío estando en la pantalla de datos, regresar a la
  // vista del carrito (que mostrará el estado vacío amable).
  useEffect(() => {
    if (cart.length === 0 && checkout) setCheckout(false);
  }, [cart.length, checkout]);

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

  const cartButton = (
    <button
      onClick={() => setOpen(true)}
      className="relative flex items-center gap-2"
      aria-label={t("Abrir carrito", "Open cart")}
    >
      <ShoppingBag className="size-5" />
      {cart.reduce((s, c) => s + c.qty, 0) > 0 && (
        <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-black">
          {cart.reduce((s, c) => s + c.qty, 0)}
        </span>
      )}
    </button>
  );

  return (
    <div style={accent as React.CSSProperties}>
      <PaymentTestModeBanner />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><span className="sr-only" /></SheetTrigger>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader><SheetTitle>{t("Tu carrito", "Your cart")}</SheetTitle></SheetHeader>
          {!checkout ? (
            <>
              <div className="flex-1 overflow-y-auto py-4">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <ShoppingBag className="size-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t("Tu carrito está vacío", "Your cart is empty")}</p>
                    <p className="text-sm text-muted-foreground">{t("Explora los productos y agrega lo que te guste.", "Browse the products and add what you like.")}</p>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      {t("Ver productos", "View products")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((c) => (
                      <div key={c.product.id} className="flex gap-3 rounded-lg border border-border p-3">
                        {c.product.image_url && <img src={c.product.image_url} alt="" className="size-16 rounded object-cover" />}
                        <div className="flex-1">
                          <div className="font-medium">{c.product.name}</div>
                          <div className="text-sm text-muted-foreground">${(c.product.price_cents / 100).toFixed(2)}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" variant="outline" className="size-7 p-0" aria-label={t("Quitar uno", "Remove one")} onClick={() => setQty(c.product.id, c.qty - 1)}><Minus className="size-3" /></Button>
                            <span className="w-6 text-center text-sm font-bold">{c.qty}</span>
                            <Button size="sm" variant="outline" className="size-7 p-0" aria-label={t("Agregar uno", "Add one")} onClick={() => setQty(c.product.id, c.qty + 1)}><Plus className="size-3" /></Button>
                            <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => setQty(c.product.id, 0)}>
                              <X className="mr-1 size-3" /> {t("Quitar", "Remove")}
                            </Button>
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
      <StoreTemplate store={store} products={products} onAdd={add} cartButton={cartButton} />
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

  // Cotización del servidor: Productos + Envío = Total. El envío es el costo
  // real de entrega del pedido; se muestra como concepto separado. No se
  // muestra ningún cálculo local provisional.
  const [quote, setQuote] = useState<{ subtotalCents: number; shippingCents: number; totalCents: number } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const cartKey = useMemo(() => cart.map((c) => `${c.product.id}:${c.qty}`).join(","), [cart]);
  useEffect(() => {
    let alive = true;
    setQuote(null);
    setQuoteError(null);
    quoteStoreCart({ data: { storeId: store.id, items: cart.map((c) => ({ productId: c.product.id, qty: c.qty })) } })
      .then((res) => {
        if (!alive) return;
        if ("error" in res) setQuoteError(mensajeUsuario(res.error));
        else setQuote(res);
      })
      .catch(() => alive && setQuoteError(t("No pudimos calcular el envío.", "We could not calculate shipping.")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, store.id]);

  const shippingCents = quote?.shippingCents ?? 0;
  const total = quote?.totalCents ?? subtotal;




  const fetchClientSecret = useCallback(async () => {
    if (!orderInfo) throw new Error(t("Sin sesión", "No session"));
    return orderInfo.clientSecret;
  }, [orderInfo]);

  const canPay = paymentsAvailable();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay) {
      toast.error(t(
        "Los pagos de esta tienda están en mantenimiento. Vuelve a intentarlo más tarde.",
        "Payments for this store are temporarily unavailable. Please try again later.",
      ));
      return;
    }
    setSubmitting(true);
    try {
      const res = await startStoreCheckout({
        data: {
          storeId: store.id,
          items: cart.map((c) => ({ productId: c.product.id, qty: c.qty })),
          customer: { name, email, phone: phone || undefined, address, notes: notes || undefined },
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&slug=${store.slug}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) { toast.error(mensajeUsuario(res.error)); return; }
      setOrderInfo({ orderId: res.orderId, clientSecret: res.clientSecret });
    } catch (err) {
      console.error("checkout error:", err);
      toast.error(t(
        "No pudimos abrir el pago. Tu pedido no se registró; inténtalo de nuevo.",
        "We couldn't open the payment. Your order was not created; please try again.",
      ));
    } finally {
      setSubmitting(false);
    }
  }


  if (orderInfo) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto py-4">
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
        <div className="flex justify-between text-sm"><span>{t("Productos", "Products")}</span><span>${(subtotal / 100).toFixed(2)}</span></div>
        <div className="flex justify-between text-sm">
          <span>{t("Envío", "Shipping")}</span>
          <span>
            {!quote && !quoteError
              ? t("Calculando…", "Calculating…")
              : quoteError
              ? "—"
              : shippingCents > 0
              ? `$${(shippingCents / 100).toFixed(2)}`
              : t("se calcula al confirmar", "calculated at checkout")}
          </span>
        </div>
        {quoteError && <p className="mt-1 text-xs text-destructive">{quoteError}</p>}
        <div className="mt-1 flex justify-between text-lg font-bold"><span>{t("Total", "Total")}</span><span>${(total / 100).toFixed(2)}</span></div>
        {shippingCents === 0 && quote && !quoteError && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "El envío se suma al confirmar tu dirección.",
              "Shipping is added when your address is confirmed.",
            )}
          </p>
        )}
      </div>
      {!canPay && (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-center text-xs text-warning">
          {t(
            "Los pagos de esta tienda están en mantenimiento. Vuelve a intentarlo más tarde.",
            "Payments for this store are temporarily unavailable. Please try again later.",
          )}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {t("Al comprar aceptas las", "By purchasing you accept the")}{" "}
        <a href="/politicas" className="underline">
          {t("políticas de compra", "purchase policies")}
        </a>
        .
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t("Atrás", "Back")}</Button>
        <Button type="submit" disabled={submitting || !quote || !canPay} style={{ background: store.primary_color }}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("Ir a pagar", "Go to payment")}
        </Button>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Pago seguro y cifrado.", "Secure, encrypted payment.")}</p>
    </form>
  );
}
