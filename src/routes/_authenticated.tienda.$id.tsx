import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Rocket,
  Store as StoreIcon,
  Trash2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getMyPlan } from "@/lib/plans.functions";
import { syncProduct, getCommerceHealth, getProductSyncIssues } from "@/lib/commerce.functions";
import { commissionLabelFor } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tienda/$id")({
  head: () => ({
    meta: [
      { title: "Administrar tienda — DªTªBLe" },
      { name: "description", content: "Administra productos, precios, cobros y configuración de tu tienda." },
      { property: "og:title", content: "Administrar tienda — DªTªBLe" },
      { property: "og:description", content: "Productos, precios, cobros y configuración de tu tienda en DªTªBLe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreManage,
});

type ExternalLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  amazon?: string;
  mercadolibre?: string;
};

type Store = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  status: string;
  logo_url: string | null;
  external_links: ExternalLinks | null;
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  base_cost_cents: number;
  production_cost_cents: number;
  shipping_cost_cents: number;
  image_url: string | null;
  stock: number;
};
type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  items: Array<{ name: string; qty: number; price_cents: number }>;
  total_cents: number;
  status: string;
  created_at: string;
};
type SyncIssue = { productId: string; status: string; error: string | null };

const LINK_FIELDS: Array<{ key: keyof ExternalLinks; label: string; placeholder: string }> = [
  { key: "website", label: "Sitio web", placeholder: "https://" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "amazon", label: "Amazon", placeholder: "https://amazon.com.mx/…" },
  { key: "mercadolibre", label: "Mercado Libre", placeholder: "https://mercadolibre.com.mx/…" },
];

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StoreManage() {
  const t = useT();
  const { id } = Route.useParams();
  const logoRef = useRef<HTMLInputElement>(null);

  const [store, setStore] = useState<Store | null>(null);
  const [paymentEmail, setPaymentEmail] = useState<string>("");
  const [links, setLinks] = useState<ExternalLinks>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [issues, setIssues] = useState<SyncIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [health, setHealth] = useState<{ status: string | null; pendingJobs: number; erroredProducts: number } | null>(null);
  const hasPlan = plan === "starter" || plan === "pro";

  const storeUrl = store ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${store.slug}` : "";

  useEffect(() => {
    load();
    getMyPlan().then((p) => setPlan(p.plan as PlanId | null));
    refreshHealth();
  }, [id]);

  async function refreshHealth() {
    try {
      setHealth((await getCommerceHealth({ data: { storeId: id } })) as never);
    } catch {
      setHealth(null);
    }
    try {
      setIssues((await getProductSyncIssues({ data: { storeId: id } })) as SyncIssue[]);
    } catch {
      setIssues([]);
    }
  }

  async function load() {
    const { data: s } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
    const st = s as Store | null;
    setStore(st);
    setLinks(((st?.external_links as ExternalLinks | null) || {}) as ExternalLinks);
    const { data: ps } = await supabase.from("store_payment_settings").select("payment_email").eq("store_id", id).maybeSingle();
    setPaymentEmail((ps?.payment_email as string | null) || "");
    const { data: p } = await supabase.from("store_products").select("*").eq("store_id", id).order("sort_order");
    setProducts((p as Product[]) || []);
    const { data: o } = await supabase.from("store_orders").select("*").eq("store_id", id).order("created_at", { ascending: false });
    setOrders(((o as unknown) as Order[]) || []);
  }

  async function uploadLogo(file: File) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Inicia sesión otra vez", "Please sign in again"));
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("disenos").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (!signed.data?.signedUrl) throw new Error(t("No se pudo preparar tu logo", "Could not prepare your logo"));
      setStore((s) => (s ? { ...s, logo_url: signed.data!.signedUrl } : s));
      toast.success(t("Logo listo. Guarda los cambios.", "Logo ready. Save your changes."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo subir el logo", "Could not upload the logo"));
    }
  }

  async function saveStore() {
    if (!store) return;
    setSaving(true);
    const clean: ExternalLinks = {};
    for (const f of LINK_FIELDS) {
      const v = (links[f.key] || "").trim();
      if (v) clean[f.key] = v;
    }
    const { error } = await supabase
      .from("stores")
      .update({ name: store.name, niche: store.niche, logo_url: store.logo_url, external_links: clean } as never)
      .eq("id", id);
    if (!error) {
      const { error: pe } = await supabase
        .from("store_payment_settings")
        .upsert({ store_id: id, payment_email: paymentEmail || null }, { onConflict: "store_id" });
      if (pe) {
        setSaving(false);
        toast.error(pe.message);
        return;
      }
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("Cambios guardados", "Changes saved"));
  }

  async function togglePublish() {
    if (!store) return;
    const nextStatus = store.status === "published" ? "draft" : "published";
    if (nextStatus === "published") {
      if (!paymentEmail) {
        toast.error(t("Configura primero un correo de cobros (pestaña Configuración).", "First set a payments email (Settings tab)."));
        return;
      }
      const invalid = products.filter((p) => p.price_cents <= 0 || p.price_cents < p.production_cost_cents);
      if (invalid.length) {
        toast.error(
          t(
            `Hay ${invalid.length} producto(s) con precio por debajo de su costo real. Corrígelos antes de publicar.`,
            `${invalid.length} product(s) are priced below their real cost. Fix them before publishing.`,
          ),
        );
        return;
      }
      const errored = issues.filter((i) => i.status === "error");
      if (errored.length) {
        toast.error(
          t(
            `Hay ${errored.length} producto(s) con error de sincronización. Reintenta desde la pestaña Productos.`,
            `${errored.length} product(s) have a sync error. Retry from the Products tab.`,
          ),
        );
        return;
      }
      if (!hasPlan) {
        const ok = confirm(
          t(
            `Vas a publicar sin plan mensual. Comisión aplicable: ${commissionLabelFor(plan)} sobre tu ganancia.\n\n¿Continuar?`,
            `You're about to publish without a monthly plan. Applicable commission: ${commissionLabelFor(plan)} of your profit.\n\nContinue?`,
          ),
        );
        if (!ok) return;
      }
    }
    setPublishing(true);
    const { error } = await supabase.from("stores").update({ status: nextStatus }).eq("id", id);
    setPublishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStore({ ...store, status: nextStatus });
    toast.success(
      nextStatus === "published"
        ? t("¡Tienda publicada! Ya recibes pedidos.", "Store published! You can now receive orders.")
        : t("Tienda despublicada.", "Store unpublished."),
    );
  }

  async function updateProduct(p: Product) {
    if (p.price_cents <= 0) {
      toast.error(t("El precio debe ser mayor a cero.", "Price must be greater than zero."));
      return;
    }
    if (p.price_cents < p.production_cost_cents) {
      toast.error(
        t(
          `Precio mínimo permitido: ${money(p.production_cost_cents)} MXN (costo de fabricación).`,
          `Minimum allowed price: ${money(p.production_cost_cents)} MXN (production cost).`,
        ),
      );
      return;
    }
    const { error } = await supabase
      .from("store_products")
      .update({ name: p.name, price_cents: p.price_cents, stock: p.stock })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Producto actualizado", "Product updated"));
    void retrySync(p.id, false);
  }

  async function retrySync(productId: string, notify = true) {
    setRetrying(productId);
    try {
      await syncProduct({ data: { storeId: id, productId } });
      await refreshHealth();
      if (notify) toast.success(t("Sincronización reintentada.", "Sync retried."));
    } catch (err) {
      if (notify) toast.error(err instanceof Error ? err.message : t("No se pudo reintentar", "Could not retry"));
    } finally {
      setRetrying(null);
    }
  }

  async function deleteProduct(pid: string) {
    if (!confirm(t("¿Eliminar este producto?", "Delete this product?"))) return;
    await supabase.from("store_products").delete().eq("id", pid);
    setProducts(products.filter((x) => x.id !== pid));
  }

  async function setOrderStatus(orderId: string, status: string) {
    await supabase.from("store_orders").update({ status }).eq("id", orderId);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  if (!store) return <div className="grid min-h-screen place-items-center">{t("Cargando…", "Loading…")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Mis tiendas", "My stores")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="shine-on-hover shadow-cta">
              <Link to="/producto/$storeId" params={{ storeId: id }}>
                <Plus className="mr-1 size-3.5" /> {t("Agregar productos", "Add products")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/guia/$id" params={{ id }}>{t("Guía de inicio", "Getting started guide")}</Link>
            </Button>
            {store.status === "published" ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/t/$slug" params={{ slug: store.slug }} target="_blank">
                  {t("Ver tienda", "View store")} <ExternalLink className="ml-1 size-3.5" />
                </Link>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={store.status === "published" ? "outline" : "default"}
              onClick={togglePublish}
              disabled={publishing}
            >
              {store.status === "published" ? (
                <><EyeOff className="mr-1 size-3.5" /> {t("Despublicar", "Unpublish")}</>
              ) : (
                <><Rocket className="mr-1 size-3.5" /> {t("Publicar", "Publish")}</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold">{store.name}</h1>
          <Badge variant={store.status === "published" ? "default" : "secondary"}>
            {store.status === "published" ? t("Publicada", "Published") : t("Borrador", "Draft")}
          </Badge>
        </div>
        <p className="text-muted-foreground">/t/{store.slug}</p>
        {health && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span
              className={`size-2 rounded-full ${
                health.erroredProducts > 0 ? "bg-destructive" : health.pendingJobs > 0 ? "bg-accent" : "bg-primary"
              }`}
            />
            {health.erroredProducts > 0
              ? t(`${health.erroredProducts} producto(s) con error de sincronización`, `${health.erroredProducts} product(s) with sync error`)
              : health.pendingJobs > 0
                ? t(`Sincronizando ${health.pendingJobs} cambio(s)…`, `Syncing ${health.pendingJobs} change(s)…`)
                : t("Todo sincronizado", "Everything synced")}
          </div>
        )}

        <Tabs defaultValue="products" className="mt-6">
          <TabsList>
            <TabsTrigger value="products">{t("Productos", "Products")} ({products.length})</TabsTrigger>
            <TabsTrigger value="orders">{t("Pedidos", "Orders")} ({orders.length})</TabsTrigger>
            <TabsTrigger value="settings">{t("Configuración", "Settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-card p-4">
              <div>
                <div className="font-display text-base font-bold">{t("Tu tienda puede tener todos los productos que quieras", "Your store can have as many products as you want")}</div>
                <p className="text-sm text-muted-foreground">
                  {t("Abre el catálogo completo y agrega otro producto a esta misma tienda.", "Open the full catalog and add another product to this same store.")}
                </p>
              </div>
              <Button asChild className="shine-on-hover">
                <Link to="/producto/$storeId" params={{ storeId: id }}>
                  <Plus className="mr-1 size-4" /> {t("Agregar productos", "Add products")}
                </Link>
              </Button>
            </div>

            {products.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                {t("Todavía no hay productos en esta tienda.", "No products in this store yet.")}
              </div>
            )}

            {products.map((p) => {
              const issue = issues.find((i) => i.productId === p.id);
              const min = p.production_cost_cents;
              const belowCost = p.price_cents <= 0 || p.price_cents < min;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-4">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="size-16 rounded-lg object-cover" />}
                    <div className="min-w-[180px] flex-1">
                      <Label className="text-xs">{t("Nombre", "Name")}</Label>
                      <Input value={p.name} onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                    </div>
                    <div className="w-36">
                      <Label className="text-xs">{t("Tu precio de venta ($)", "Your selling price ($)")}</Label>
                      <Input
                        type="number"
                        min={Math.ceil(min / 100)}
                        value={p.price_cents / 100}
                        onChange={(e) =>
                          setProducts(products.map((x) => (x.id === p.id ? { ...x, price_cents: Math.round(Number(e.target.value) * 100) } : x)))
                        }
                      />
                      <p className={`mt-1 text-[11px] ${belowCost ? "text-destructive" : "text-muted-foreground"}`}>
                        {min > 0
                          ? t(`Costo mínimo: ${money(min)} MXN`, `Minimum cost: ${money(min)} MXN`)
                          : t("Costo no disponible", "Cost unavailable")}
                      </p>
                    </div>
                    <div className="w-20">
                      <Label className="text-xs">{t("Stock", "Stock")}</Label>
                      <Input type="number" value={p.stock} onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, stock: Number(e.target.value) } : x)))} />
                    </div>
                    <div className="flex gap-2 self-end">
                      <Button size="sm" disabled={belowCost} onClick={() => updateProduct(p)}>{t("Guardar", "Save")}</Button>
                      <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>

                  {min === 0 && (
                    <p className="mt-2 text-xs text-destructive">
                      {t(
                        "No tenemos un costo confiable para este producto: no debe publicarse hasta corregirlo.",
                        "We don't have a reliable cost for this product: it should not be published until fixed.",
                      )}
                    </p>
                  )}

                  {issue?.status === "error" && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <div>
                          <div className="font-bold text-destructive">{t("Error de sincronización", "Sync error")}</div>
                          <div className="text-muted-foreground">
                            {issue.error || t("Motivo no reportado.", "Reason not reported.")}
                          </div>
                          {belowCost && (
                            <div className="mt-1 text-muted-foreground">
                              {t(
                                "Causa probable: el precio de venta es cero o menor al costo real. Corrígelo y reintenta.",
                                "Likely cause: the selling price is zero or below the real cost. Fix it and retry.",
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled={retrying === p.id} onClick={() => retrySync(p.id)}>
                        <RefreshCw className={`mr-1 size-3.5 ${retrying === p.id ? "animate-spin" : ""}`} />
                        {t("Reintentar", "Retry")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                {t("Aún no hay pedidos. Comparte la dirección de tu tienda para empezar.", "No orders yet. Share your store address to get started.")}
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{o.customer_name}</div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {o.customer_email}</span>
                        {o.customer_phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {o.customer_phone}</span>}
                      </div>
                      {o.shipping_address && <div className="mt-1 text-sm">{o.shipping_address}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold">{money(o.total_cents)}</div>
                      <Badge variant={o.status === "completed" ? "default" : "secondary"}>{o.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {o.items.map((it, i) => (
                      <div key={i}>{it.qty}× {it.name}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "shipped")}>{t("Marcar enviado", "Mark shipped")}</Button>
                    <Button size="sm" onClick={() => setOrderStatus(o.id, "completed")}>{t("Completar", "Complete")}</Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            {/* A) Identidad */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Identidad", "Identity")}</h2>
              <div className="mt-4 grid gap-4 max-w-xl">
                <div>
                  <Label>{t("Nombre de la tienda", "Store name")}</Label>
                  <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
                </div>
                <div>
                  <Label>{t("Descripción o eslogan", "Description or tagline")}</Label>
                  <Textarea rows={3} value={store.niche} onChange={(e) => setStore({ ...store, niche: e.target.value })} />
                </div>
                <div>
                  <Label>{t("Logo", "Logo")}</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-border bg-muted">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={t("Logo de tu tienda", "Your store logo")} className="size-full object-cover" />
                      ) : (
                        <StoreIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadLogo(f);
                      }}
                    />
                    <Button variant="outline" onClick={() => logoRef.current?.click()}>
                      {store.logo_url ? t("Cambiar logo", "Change logo") : t("Subir logo", "Upload logo")}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* B) Contacto */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Contacto", "Contact")}</h2>
              <div className="mt-4 max-w-xl">
                <Label>{t("Correo de notificaciones y cobros", "Notifications and payments email")}</Label>
                <Input value={paymentEmail} onChange={(e) => setPaymentEmail(e.target.value)} placeholder="tu@correo.com" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Aquí te avisamos de cada pedido y de tus cobros.", "We notify you here about every order and payment.")}
                </p>
              </div>
            </section>

            {/* C) Dominio y URL */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Dominio y dirección", "Domain and address")}</h2>
              <div className="mt-4 max-w-xl space-y-3">
                <div>
                  <Label>{t("Dirección actual de tu tienda", "Your store's current address")}</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={storeUrl} />
                    <Button
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(storeUrl);
                        toast.success(t("Dirección copiada", "Address copied"));
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <Globe className="mb-1 size-4" />
                  {t(
                    "Dominio propio (ej. mitienda.com): próximamente. Requiere que tú registres el dominio y apuntes sus DNS. Mientras tanto tu tienda funciona con la dirección de arriba.",
                    "Custom domain (e.g. mystore.com): coming soon. It requires you to register the domain and point its DNS. Meanwhile your store works with the address above.",
                  )}
                </div>
              </div>
            </section>

            {/* D) Canales de venta / presencia externa */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Canales y presencia externa", "Channels and external presence")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Guarda tus enlaces para tenerlos a la mano y mostrarlos en tu tienda. Guardar un enlace NO conecta ese canal: una integración real (catálogo, inventario y pedidos sincronizados) es una fase posterior.",
                  "Save your links to keep them handy and show them in your store. Saving a link does NOT connect that channel: a real integration (synced catalog, inventory and orders) is a later phase.",
                )}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {LINK_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <Input
                      value={links[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setLinks({ ...links, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* E) Cobros */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Cobros", "Payments")}</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={paymentEmail ? "default" : "secondary"}>
                    {paymentEmail ? t("Configurado", "Configured") : t("Pendiente", "Pending")}
                  </Badge>
                  <span className="text-muted-foreground">
                    {t(
                      "DªTªBLe procesa el pago con tarjeta de tus clientes y te liquida tu ganancia.",
                      "DªTªBLe processes your customers' card payments and settles your profit to you.",
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Los datos bancarios para tu liquidación se capturan en tu Cuenta.",
                    "Your bank details for settlement are captured in your Account.",
                  )}{" "}
                  <Link to="/cuenta" className="font-semibold text-primary hover:underline">{t("Ir a mi cuenta", "Go to my account")}</Link>
                </p>
              </div>
            </section>

            {/* F) Plan */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Plan", "Plan")}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary" className="uppercase">{plan ?? t("Gratis", "Free")}</Badge>
                <span className="text-muted-foreground">
                  {t("Comisión sobre tu ganancia:", "Commission on your profit:")}{" "}
                  <span className="font-semibold text-foreground">{commissionLabelFor(plan)}</span>
                </span>
                <Link to="/planes" className="font-semibold text-primary hover:underline">{t("Ver planes", "View plans")}</Link>
              </div>
            </section>

            <Button onClick={saveStore} disabled={saving}>{t("Guardar cambios", "Save changes")}</Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
