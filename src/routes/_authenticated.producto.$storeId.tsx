import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { startProvisioning } from "@/lib/commerce.functions";
import { addCatalogProducts, getCatalog } from "@/lib/catalog.functions";
import { useT } from "@/lib/i18n";
import { CatalogPicker } from "@/components/crear/CatalogPicker";
import { CustomizeStep } from "@/components/crear/CustomizeStep";
import { MockupsStep } from "@/components/crear/MockupsStep";
import {
  currentVariant,
  draftToProduct,
  money,
  newDraft,
  type CatalogItem,
  type ProductDraft,
} from "@/lib/product-draft";

export const Route = createFileRoute("/_authenticated/producto/$storeId")({
  head: () => ({
    meta: [
      { title: "Elige qué vender — DªTªBLe" },
      { name: "description", content: "Elige productos, personalízalos con tu diseño y agrégalos a tu tienda." },
      { property: "og:title", content: "Elige qué vender — DªTªBLe" },
      { property: "og:description", content: "Personaliza productos con tu diseño y publícalos en tu tienda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreProductsPage,
});

type Stage = "catalog" | "customize" | "mockups" | "info" | "price";
const STAGES: Stage[] = ["catalog", "customize", "mockups", "info", "price"];
const MAX_PRODUCTS = 40;

type StoreRow = { id: string; name: string; status: string; logo_url: string | null };
type StoreProductRow = { id: string; name: string; price_cents: number; image_url: string | null };

/**
 * Paso 2 del recorrido: la tienda ya existe; aquí se eligen y personalizan
 * los productos que se van a vender, y se publica la tienda.
 */
function StoreProductsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { storeId } = useParams({ from: "/_authenticated/producto/$storeId" });

  const [store, setStore] = useState<StoreRow | null>(null);
  const [products, setProducts] = useState<StoreProductRow[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);

  const [stage, setStage] = useState<Stage>("catalog");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [draft, setDraft] = useState<ProductDraft | null>(null);

  async function reloadProducts() {
    const { data } = await supabase
      .from("store_products")
      .select("id, name, price_cents, image_url")
      .eq("store_id", storeId)
      .order("sort_order");
    setProducts((data as StoreProductRow[]) || []);
  }

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase
        .from("stores")
        .select("id, name, status, logo_url, owner_id")
        .eq("id", storeId)
        .maybeSingle();
      if (!data || data.owner_id !== u.id) {
        toast.error(t("Esa tienda no es tuya.", "That store is not yours."));
        navigate({ to: "/dashboard" });
        return;
      }
      setStore(data as StoreRow);
      await reloadProducts();
      setLoadingStore(false);
    })();
  }, [storeId, navigate]);

  useEffect(() => {
    if (loadingStore) return;
    (async () => {
      try {
        setCatalog((await getCatalog()) as CatalogItem[]);
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : t("No se pudieron cargar los productos", "Could not load products"),
        );
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [loadingStore]);

  function update(patch: Partial<ProductDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function pick(item: CatalogItem) {
    if (products.length >= MAX_PRODUCTS) {
      toast.error(t(`Máximo ${MAX_PRODUCTS} productos por tienda.`, `Maximum ${MAX_PRODUCTS} products per store.`));
      return;
    }
    setDraft(newDraft(item));
    setStage("customize");
  }

  const stageIndex = STAGES.indexOf(stage);
  const variant = draft ? currentVariant(draft) : undefined;
  const price = draft?.priceCents ?? variant?.priceCents ?? 0;
  // Costo de fabricación = precio mínimo y base de la ganancia. El envío se
  // cobra aparte al cliente y no forma parte de la ganancia.
  const cost = variant?.productionCents ?? variant?.costCents ?? 0;
  const shippingToCustomer = variant?.shippingCents ?? 0;
  const profit = Math.max(0, price - cost);

  const canContinue =
    (stage === "customize" && !!draft && draft.variants.length > 0) ||
    (stage === "mockups" && !!draft) ||
    (stage === "info" && !!draft && draft.name.trim().length >= 2) ||
    (stage === "price" && price >= cost && price > 0);

  async function addToStore() {
    if (!draft) return;
    setSaving(true);
    try {
      const p = draftToProduct(draft);
      // Cada talla/color elegido se guarda como una opción vendible propia:
      // si el comerciante marcó S, M y L, las tres quedan disponibles.
      const chosen = p.selectedVariantIds.length ? p.selectedVariantIds : p.variantId ? [p.variantId] : [];
      const byId = new Map(draft.variants.map((v) => [v.id, v]));
      const items = (chosen.length ? chosen : [null]).map((variantId) => {
        const v = variantId != null ? byId.get(variantId) : undefined;
        const suffix = v?.size ? ` — ${v.size}` : v?.color && chosen.length > 1 ? ` — ${v.color}` : "";
        return {
          productId: p.productId,
          printProviderId: p.printProviderId ?? undefined,
          variantId: variantId ?? undefined,
          name: `${p.name}${chosen.length > 1 ? suffix : ""}`,
          description: p.description || undefined,
          priceCents: p.priceCents ?? undefined,
          designUrl: p.designUrl,
          mockupUrl: p.mockupUrl,
          placement: p.placement,
        };
      });
      await addCatalogProducts({ data: { storeId, items } });
      await reloadProducts();
      setDraft(null);
      setStage("catalog");
      toast.success(
        items.length > 1
          ? t(`Se agregaron ${items.length} opciones a tu tienda.`, `${items.length} options added to your store.`)
          : t("Producto agregado a tu tienda.", "Product added to your store."),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo agregar", "Could not add it"));
    } finally {
      setSaving(false);
    }
  }


  function next() {
    if (!draft) return;
    if (stage === "price") {
      void addToStore();
      return;
    }
    setStage(STAGES[stageIndex + 1]);
  }

  function back() {
    if (stage === "customize") {
      setDraft(null);
      setStage("catalog");
      return;
    }
    setStage(STAGES[Math.max(0, stageIndex - 1)]);
  }

  async function publish() {
    setPublishing(true);
    try {
      if (!products.length) throw new Error(t("Agrega al menos un producto", "Add at least one product"));
      // El envío se calcula en el checkout con el costo real de cada producto.
      await supabase.from("stores").update({ shipping_options: [] }).eq("id", storeId);
      await startProvisioning({ data: { storeId } });
      navigate({ to: "/preparando/$id", params: { id: storeId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo publicar", "Could not publish"));
    } finally {
      setPublishing(false);
    }
  }

  const stageLabels: Record<Stage, string> = useMemo(
    () => ({
      catalog: t("Producto", "Product"),
      customize: t("Personalizar", "Customize"),
      mockups: t("Maquetas", "Mockups"),
      info: t("Información", "Details"),
      price: t("Precio", "Price"),
    }),
    [t],
  );

  if (loadingStore) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {t("Abriendo tu tienda…", "Opening your store…")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Salir", "Exit")}
          </Link>
          <div className="min-w-0 flex-1 truncate text-center text-sm font-bold">{store?.name}</div>
          <span className="whitespace-nowrap text-xs font-bold text-primary">
            {products.length} {t(products.length === 1 ? "producto" : "productos", products.length === 1 ? "product" : "products")}
          </span>
        </div>
        {draft && (
          <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 pb-2">
            {STAGES.slice(1).map((sg, i) => (
              <div key={sg} className="flex items-center gap-1">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    i + 1 === stageIndex ? "bg-primary text-primary-foreground" : i + 1 < stageIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {stageLabels[sg]}
                </span>
                {i < STAGES.length - 2 && <span className="text-border">→</span>}
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {stage === "catalog" && (
          <>
            {products.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display text-xl font-extrabold uppercase">{t("En tu tienda", "In your store")}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3">
                      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" loading="lazy" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{money(p.price_cents)} MXN</div>
                      </div>
                      <Check className="size-4 text-primary" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={publish} disabled={publishing} className="shadow-cta shine-on-hover">
                    {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
                    {t("Publicar mi tienda", "Publish my store")}
                  </Button>
                  <Link to="/tienda/$id" params={{ id: storeId }}>
                    <Button variant="outline">{t("Administrar tienda", "Manage store")}</Button>
                  </Link>
                </div>
              </section>
            )}
            <h1 className="font-display text-3xl font-extrabold uppercase">
              {products.length ? t("Agrega otro producto", "Add another product") : t("Elige qué quieres vender", "Choose what you want to sell")}
            </h1>
            <p className="mb-6 mt-1 text-muted-foreground">
              {t("Elige un producto, ponle tu diseño y define tu precio.", "Pick a product, add your design and set your price.")}
            </p>
            <CatalogPicker items={catalog} loading={loadingCatalog} error={catalogError} onPick={pick} />
          </>
        )}

        {stage === "customize" && draft && <CustomizeStep draft={draft} update={update} />}

        {stage === "mockups" && draft && <MockupsStep draft={draft} update={update} />}

        {stage === "info" && draft && (
          <section>
            <h1 className="font-display text-3xl font-extrabold uppercase">{t("Información del producto", "Product details")}</h1>
            <p className="mt-1 text-muted-foreground">
              {t("Así lo verán tus clientes en tu tienda.", "This is what your customers will see in your store.")}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl border-2 border-border bg-muted">
                <img src={draft.mockupUrl || variant?.image || draft.image} alt={draft.name} className="aspect-square size-full object-cover" />
              </div>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="pname">{t("Título del producto", "Product title")}</Label>
                  <Input id="pname" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pdesc">{t("Descripción", "Description")}</Label>
                  <Textarea id="pdesc" rows={8} value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Cuenta para quién es, de qué está hecho y por qué vale la pena.", "Say who it's for, what it's made of and why it's worth it.")}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {stage === "price" && draft && (
          <section>
            <h1 className="font-display text-3xl font-extrabold uppercase">{t("Precio y ganancia", "Price and profit")}</h1>
            <p className="mt-1 text-muted-foreground">
              {t("Define tu precio de venta. Puedes cambiarlo después.", "Set your selling price. You can change it later.")}
            </p>
            <div className="mt-6 grid max-w-md gap-4">
              <div>
                <Label htmlFor="price">{t("Precio de venta (MXN)", "Selling price (MXN)")}</Label>
                <Input
                  id="price"
                  type="number"
                  min={Math.ceil(cost / 100)}
                  value={price ? Math.round(price / 100) : ""}
                  onChange={(e) => update({ priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                />
                {price < cost && (
                  <p className="mt-1 text-xs text-destructive">
                    {t(
                      `El precio no puede ser menor al costo de producción (${money(cost)} MXN).`,
                      `The price cannot be lower than the production cost (${money(cost)} MXN).`,
                    )}
                  </p>
                )}
              </div>
              <div className="rounded-xl border-2 border-border bg-card p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Costo de producción y envío", "Production and shipping cost")}</span>
                  <span>{money(cost)} MXN</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Este costo lo define la producción: es fijo y no se puede editar.",
                    "This cost is set by production: it is fixed and cannot be edited.",
                  )}
                </p>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
                  <span>{t("Tu ganancia por venta", "Your profit per sale")}</span>
                  <span>
                    {money(profit)} {price > 0 ? `(${Math.round((profit / price) * 100)}%)` : ""}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {draft && (
          <div className="mt-10 flex items-center justify-between">
            <Button variant="outline" disabled={saving} onClick={back}>
              <ArrowLeft className="mr-1 size-4" /> {t("Atrás", "Back")}
            </Button>
            <Button disabled={!canContinue || saving} onClick={next} className="shine-on-hover">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : stage === "price" ? <Plus className="mr-2 size-4" /> : null}
              {stage === "price" ? t("Agregar a mi tienda", "Add to my store") : t("Continuar", "Continue")}
              {stage !== "price" && <ArrowRight className="ml-1 size-4" />}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
