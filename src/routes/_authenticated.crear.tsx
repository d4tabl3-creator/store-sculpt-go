import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, slugify } from "@/lib/kits";
import { getMyPlan } from "@/lib/plans.functions";
import { planLimit } from "@/lib/plans";
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
  type ReadyProduct,
} from "@/lib/product-draft";

export const Route = createFileRoute("/_authenticated/crear")({
  head: () => ({ meta: [{ title: "Crear producto — DªTªBLe" }] }),
  component: CreateProductPage,
});

type Stage = "catalog" | "customize" | "mockups" | "info" | "price" | "publish";

const STAGES: Stage[] = ["catalog", "customize", "mockups", "info", "price", "publish"];
const MAX_PRODUCTS = 40;

function CreateProductPage() {
  const t = useT();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("catalog");
  const [gateChecked, setGateChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [ready, setReady] = useState<ReadyProduct[]>([]);

  const [storeName, setStoreName] = useState("");
  const [themeId, setThemeId] = useState("berry");
  const [primaryColor, setPrimaryColor] = useState("#CF3790");
  const [paymentEmail, setPaymentEmail] = useState("");

  const slug = useMemo(() => slugify(storeName), [storeName]);

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) {
        navigate({ to: "/auth" });
        return;
      }
      const plan = await getMyPlan();
      const limit = planLimit(plan.plan);
      if (limit !== null) {
        const { count } = await supabase.from("stores").select("id", { count: "exact", head: true }).eq("owner_id", u.id);
        if ((count || 0) >= limit) {
          toast.error(
            plan.plan
              ? t(`Tu plan actual permite ${limit} tienda${limit === 1 ? "" : "s"}. Sube a Pro para más.`, `Your current plan allows ${limit} store${limit === 1 ? "" : "s"}. Upgrade to Pro for more.`)
              : t(`Sin plan solo puedes tener 1 tienda. Activa Pro para crear más.`, `Without a plan you can only have 1 store. Activate Pro to create more.`),
          );
          navigate({ to: plan.plan ? "/planes" : "/dashboard" });
          return;
        }
      }
      if (!paymentEmail && u.email) setPaymentEmail(u.email);
      setGateChecked(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!gateChecked) return;
    (async () => {
      try {
        setCatalog((await getCatalog()) as CatalogItem[]);
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : t("No se pudieron cargar los productos", "Could not load products"));
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [gateChecked]);

  function update(patch: Partial<ProductDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function pick(item: CatalogItem) {
    if (ready.length >= MAX_PRODUCTS) {
      toast.error(t(`Máximo ${MAX_PRODUCTS} productos por tienda.`, `Maximum ${MAX_PRODUCTS} products per store.`));
      return;
    }
    setDraft(newDraft(item));
    setStage("customize");
  }

  const stageIndex = STAGES.indexOf(stage);
  const variant = draft ? currentVariant(draft) : undefined;
  const price = draft?.priceCents ?? variant?.priceCents ?? 0;
  const cost = variant?.costCents ?? 0;
  const profit = Math.max(0, price - cost);

  const canContinue =
    (stage === "customize" && !!draft && draft.variants.length > 0) ||
    (stage === "mockups" && !!draft) ||
    (stage === "info" && !!draft && draft.name.trim().length >= 2) ||
    (stage === "price" && price > 0) ||
    (stage === "publish" && storeName.trim().length >= 2 && paymentEmail.includes("@") && ready.length > 0);

  function next() {
    if (!draft) return;
    if (stage === "price") {
      const product = draftToProduct(draft);
      setReady((prev) => [...prev.filter((p) => p.productId !== product.productId), product]);
      setDraft(null);
      setStage("publish");
      return;
    }
    setStage(STAGES[stageIndex + 1]);
  }

  function back() {
    if (stage === "publish") {
      setStage("catalog");
      return;
    }
    if (stage === "customize") {
      setDraft(null);
      setStage("catalog");
      return;
    }
    setStage(STAGES[Math.max(0, stageIndex - 1)]);
  }

  async function publish() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Sesión inválida", "Invalid session"));
      if (!ready.length) throw new Error(t("Crea al menos un producto", "Create at least one product"));

      let finalSlug = slug;
      const { data: exists } = await supabase.from("stores").select("id").eq("slug", finalSlug).maybeSingle();
      if (exists) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const shipping = [
        { id: "standard", label: t("Envío estándar (3-7 días)", "Standard shipping (3-7 days)"), price_cents: 9900 },
        { id: "pickup", label: t("Recoge en tienda", "Store pickup"), price_cents: 0 },
      ];

      const { data: store, error: e1 } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          slug: finalSlug,
          name: storeName.trim(),
          niche: ready[0]?.category || t("Catálogo", "Catalog"),
          kit_id: "catalogo",
          theme: themeId,
          primary_color: primaryColor,
          shipping_options: shipping,
          status: "draft",
        })
        .select()
        .single();
      if (e1 || !store) throw e1 || new Error(t("No se pudo crear tu tienda", "Could not create your store"));

      await addCatalogProducts({
        data: {
          storeId: store.id,
          items: ready.map((p) => ({
            productId: p.productId,
            variantId: p.variantId ?? undefined,
            name: p.name,
            description: p.description || undefined,
            priceCents: p.priceCents ?? undefined,
            designUrl: p.designUrl,
            mockupUrl: p.mockupUrl,
            placement: p.placement,
          })),
        },
      });

      if (paymentEmail) {
        await supabase.from("store_payment_settings").insert({ store_id: store.id, payment_email: paymentEmail });
      }

      await startProvisioning({ data: { storeId: store.id } });
      navigate({ to: "/preparando/$id", params: { id: store.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo publicar", "Could not publish"));
    } finally {
      setSaving(false);
    }
  }

  if (!gateChecked) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">{t("Comprobando plan…", "Checking plan…")}</div>;
  }

  const stageLabels: Record<Stage, string> = {
    catalog: t("Producto", "Product"),
    customize: t("Personalizar", "Customize"),
    mockups: t("Maquetas", "Mockups"),
    info: t("Información", "Details"),
    price: t("Precio", "Price"),
    publish: t("Publicar", "Publish"),
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Salir", "Exit")}
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {STAGES.map((sg, i) => (
              <div key={sg} className="flex items-center gap-1">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    i === stageIndex ? "bg-primary text-primary-foreground" : i < stageIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {stageLabels[sg]}
                </span>
                {i < STAGES.length - 1 && <span className="text-border">→</span>}
              </div>
            ))}
          </nav>
          {ready.length > 0 && (
            <span className="whitespace-nowrap text-xs font-bold text-primary">
              {ready.length} {t(ready.length === 1 ? "producto listo" : "productos listos", ready.length === 1 ? "product ready" : "products ready")}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {stage === "catalog" && <CatalogPicker items={catalog} loading={loadingCatalog} error={catalogError} onPick={pick} />}

        {stage === "customize" && draft && <CustomizeStep draft={draft} update={update} />}

        {stage === "mockups" && draft && <MockupsStep draft={draft} update={update} />}

        {stage === "info" && draft && (
          <section>
            <h1 className="font-display text-3xl font-extrabold uppercase">{t("Información del producto", "Product details")}</h1>
            <p className="mt-1 text-muted-foreground">{t("Así lo verán tus clientes en tu tienda.", "This is what your customers will see in your store.")}</p>
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
            <p className="mt-1 text-muted-foreground">{t("Define tu precio de venta. Puedes cambiarlo después.", "Set your selling price. You can change it later.")}</p>
            <div className="mt-6 grid max-w-md gap-4">
              <div>
                <Label htmlFor="price">{t("Precio de venta (MXN)", "Selling price (MXN)")}</Label>
                <Input
                  id="price"
                  type="number"
                  min={1}
                  value={price ? Math.round(price / 100) : ""}
                  onChange={(e) => update({ priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                />
              </div>
              <div className="rounded-xl border-2 border-border bg-card p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Costo de producción y envío", "Production and shipping cost")}</span>
                  <span>{money(cost)} MXN</span>
                </div>
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

        {stage === "publish" && (
          <section>
            <h1 className="font-display text-3xl font-extrabold uppercase">{t("Publicar en mi tienda", "Publish to my store")}</h1>
            <p className="mt-1 text-muted-foreground">{t("Último paso: ponle nombre y estilo a tu tienda.", "Last step: give your store a name and a style.")}</p>

            <div className="mt-6 grid gap-3">
              {ready.map((p) => (
                <div key={p.productId} className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <img src={p.image} alt={p.name} className="size-full object-cover" loading="lazy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.priceCents != null ? `${money(p.priceCents)} MXN` : p.category}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReady((prev) => prev.filter((x) => x.productId !== p.productId))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setStage("catalog")}>
                <Plus className="mr-2 size-4" /> {t("Crear otro producto", "Create another product")}
              </Button>
            </div>

            <div className="mt-8 grid gap-6">
              <div>
                <Label htmlFor="sname">{t("Nombre de tu tienda", "Your store's name")}</Label>
                <Input id="sname" placeholder={t("Ej. Aurora Studio", "E.g. Aurora Studio")} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                {slug && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("URL pública:", "Public URL:")} <span className="font-mono text-foreground">datable.app/t/{slug}</span>
                  </p>
                )}
              </div>
              <div>
                <Label>{t("Estilo visual", "Visual style")}</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {THEMES.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => {
                        setThemeId(th.id);
                        setPrimaryColor(th.primary);
                      }}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${themeId === th.id ? "border-primary" : "border-border"}`}
                    >
                      <div className="h-12 rounded-md" style={{ background: th.primary }} />
                      <div className="mt-3 font-bold">{th.name}</div>
                      <div className="text-xs text-muted-foreground">{th.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="pay">{t("Email para recibir tus pedidos", "Email to receive your orders")}</Label>
                <Input id="pay" type="email" placeholder="tu@email.com" value={paymentEmail} onChange={(e) => setPaymentEmail(e.target.value)} />
              </div>
            </div>
          </section>
        )}

        {stage !== "catalog" && (
          <div className="mt-10 flex items-center justify-between">
            <Button variant="outline" disabled={saving} onClick={back}>
              <ArrowLeft className="mr-1 size-4" /> {t("Atrás", "Back")}
            </Button>
            {stage === "publish" ? (
              <Button disabled={!canContinue || saving} onClick={publish} className="shadow-cta shine-on-hover">
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
                {t("Publicar en mi tienda", "Publish to my store")}
              </Button>
            ) : (
              <Button disabled={!canContinue} onClick={next} className="shine-on-hover">
                {stage === "price" ? t("Listo, continuar", "Done, continue") : t("Continuar", "Continue")} <ArrowRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
