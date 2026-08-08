import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Palette, Rocket, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, slugify } from "@/lib/kits";
import { getMyPlan } from "@/lib/plans.functions";
import { planLimit } from "@/lib/plans";
import { startProvisioning } from "@/lib/commerce.functions";
import { addCatalogProducts, getCatalog, getCatalogProduct } from "@/lib/catalog.functions";
import { DesignStudio, type StudioResult } from "@/components/DesignStudio";

export const Route = createFileRoute("/_authenticated/crear")({
  head: () => ({ meta: [{ title: "Crear tienda — DªTªBLe" }] }),
  component: WizardPage,
});

type CatalogItem = {
  id: number;
  title: string;
  brand: string | null;
  type: string;
  typeName: string;
  image: string;
  variantCount: number;
  description: string;
  category: string;
  categoryId: number;
};

type Picked = {
  productId: number;
  variantId: number | null;
  title: string;
  image: string;
  typeName: string;
  priceCents: number | null;
  designUrl?: string;
  mockupUrl?: string;
  placement?: string;
};

type State = {
  storeName: string;
  themeId: string;
  primaryColor: string;
  paymentEmail: string;
  shippingStandard: boolean;
  shippingExpress: boolean;
  shippingPickup: boolean;
};

const MAX_PRODUCTS = 40;

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}


function WizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [visible, setVisible] = useState(48);
  const [picked, setPicked] = useState<Record<number, Picked>>({});

  const [s, setS] = useState<State>({
    storeName: "",
    themeId: "berry",
    primaryColor: "#CF3790",
    paymentEmail: "",
    shippingStandard: true,
    shippingExpress: false,
    shippingPickup: true,
  });

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) { navigate({ to: "/auth" }); return; }
      const plan = await getMyPlan();
      const limit = planLimit(plan.plan);
      if (limit !== null) {
        const { count } = await supabase.from("stores").select("id", { count: "exact", head: true }).eq("owner_id", u.id);
        if ((count || 0) >= limit) {
          toast.error(
            plan.plan
              ? `Tu plan ${plan.plan.toUpperCase()} permite ${limit} tienda${limit === 1 ? "" : "s"}. Sube a Pro para más.`
              : `Sin plan solo puedes tener 1 tienda. Activa Starter o Pro para crear más.`,
          );
          navigate({ to: plan.plan ? "/planes" : "/dashboard" });
          return;
        }
      }
      setGateChecked(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!gateChecked) return;
    (async () => {
      try {
        const items = (await getCatalog()) as CatalogItem[];
        setCatalog(items);
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [gateChecked]);

  const [studio, setStudio] = useState<{ id: number; title: string; category: string } | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of catalog) map.set(p.category || p.typeName, (map.get(p.category || p.typeName) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(
      (p) =>
        (category === "all" || (p.category || p.typeName) === category) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q) ||
          (p.typeName || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)),
    );
  }, [catalog, query, category]);

  const pickedList = Object.values(picked);
  const slug = useMemo(() => slugify(s.storeName), [s.storeName]);

  function applyStudio(r: StudioResult) {
    setPicked((prev) => ({
      ...prev,
      [r.productId]: {
        productId: r.productId,
        variantId: r.variantId,
        title: r.title,
        image: r.image,
        typeName: r.category,
        priceCents: r.priceCents,
        designUrl: r.designUrl,
        mockupUrl: r.mockupUrl,
        placement: r.placement,
      },
    }));
  }

  function openStudio(item: CatalogItem) {
    if (!picked[item.id] && pickedList.length >= MAX_PRODUCTS) {
      toast.error(`Máximo ${MAX_PRODUCTS} productos por tienda.`);
      return;
    }
    setStudio({ id: item.id, title: item.title, category: item.category || item.typeName });
  }

  async function toggle(item: CatalogItem) {
    if (picked[item.id]) {
      setPicked((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }
    if (pickedList.length >= MAX_PRODUCTS) {
      toast.error(`Máximo ${MAX_PRODUCTS} productos por tienda.`);
      return;
    }
    setPicked((prev) => ({
      ...prev,
      [item.id]: {
        productId: item.id,
        variantId: null,
        title: item.title,
        image: item.image,
        typeName: item.category || item.typeName,
        priceCents: null,
      },
    }));
    try {
      const detail = (await getCatalogProduct({ data: { productId: item.id } })) as {
        variants: Array<{ id: number; priceCents: number; inStock: boolean; image: string }>;
      };
      const v = detail.variants.find((x) => x.inStock) || detail.variants[0];
      if (!v) return;
      setPicked((prev) =>
        prev[item.id]
          ? { ...prev, [item.id]: { ...prev[item.id], variantId: v.id, priceCents: v.priceCents, image: v.image || prev[item.id].image } }
          : prev,
      );
    } catch {
      /* el precio se resuelve en el servidor al crear la tienda */
    }
  }


  const canNext =
    (step === 0 && pickedList.length > 0) ||
    (step === 1 && pickedList.length > 0) ||
    (step === 2 && s.storeName.length >= 2) ||
    (step === 3 && s.paymentEmail.includes("@"));

  async function handleFinish() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sesión inválida");
      if (!pickedList.length) throw new Error("Elige al menos un producto");

      let finalSlug = slug;
      const { data: exists } = await supabase.from("stores").select("id").eq("slug", finalSlug).maybeSingle();
      if (exists) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const shipping = [
        s.shippingStandard && { id: "standard", label: "Envío estándar (3-7 días)", price_cents: 9900 },
        s.shippingExpress && { id: "express", label: "Envío express (1-2 días)", price_cents: 19900 },
        s.shippingPickup && { id: "pickup", label: "Recoge en tienda", price_cents: 0 },
      ].filter(Boolean);

      const mainCategory = pickedList[0]?.typeName || "Catálogo";

      const { data: store, error: e1 } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          slug: finalSlug,
          name: s.storeName,
          niche: mainCategory,
          kit_id: "catalogo",
          theme: s.themeId,
          primary_color: s.primaryColor,
          shipping_options: shipping,
          status: "draft",
        })
        .select()
        .single();
      if (e1 || !store) throw e1 || new Error("No se pudo crear la tienda");

      await addCatalogProducts({
        data: {
          storeId: store.id,
          items: pickedList.map((p) => ({ productId: p.productId, variantId: p.variantId ?? undefined })),
        },
      });

      if (s.paymentEmail) {
        await supabase.from("store_payment_settings").insert({ store_id: store.id, payment_email: s.paymentEmail });
      }

      await startProvisioning({ data: { storeId: store.id } });
      navigate({ to: "/preparando/$id", params: { id: store.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear tienda");
    } finally {
      setSaving(false);
    }
  }

  if (!gateChecked) return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Comprobando plan…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Salir
          </Link>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 w-10 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Ventanilla {step + 1}/4</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {step === 0 && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">Elige tus productos</h1>
            <p className="mt-1 text-muted-foreground">
              Catálogo completo del proveedor: sin inventario, sin mínimos. Elige los que quieras vender.
            </p>

            <div className="sticky top-0 z-10 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar: playera, taza, hoodie, poster…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setVisible(48); }}
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => { setCategory("all"); setVisible(48); }}
                  className={`whitespace-nowrap rounded-full border-2 px-3 py-1 text-xs font-bold ${category === "all" ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                >
                  Todo ({catalog.length})
                </button>
                {categories.map(([name, n]) => (
                  <button
                    key={name}
                    onClick={() => { setCategory(name); setVisible(48); }}
                    className={`whitespace-nowrap rounded-full border-2 px-3 py-1 text-xs font-bold ${category === name ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                  >
                    {name} ({n})
                  </button>
                ))}
              </div>
              {pickedList.length > 0 && (
                <div className="mt-2 text-xs font-bold text-primary">
                  {pickedList.length} producto{pickedList.length === 1 ? "" : "s"} seleccionado{pickedList.length === 1 ? "" : "s"}
                </div>
              )}
            </div>

            {loadingCatalog && (
              <div className="mt-10 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando catálogo…
              </div>
            )}
            {catalogError && <p className="mt-8 text-sm text-destructive">{catalogError}</p>}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.slice(0, visible).map((p) => {
                const on = !!picked[p.id];
                return (
                  <div
                    key={p.id}
                    className={`relative overflow-hidden rounded-2xl border-2 bg-card text-left transition-all hover:shadow-pop ${on ? "border-primary" : "border-border"}`}
                  >
                    {on && (
                      <span className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-4" />
                      </span>
                    )}
                    <button onClick={() => toggle(p)} className="block w-full text-left">
                      <div className="aspect-square bg-muted">
                        <img src={picked[p.id]?.image || p.image} alt={p.title} loading="lazy" className="size-full object-cover" />
                      </div>
                      <div className="p-3 pb-1">
                        <div className="line-clamp-2 text-xs font-bold leading-snug">{picked[p.id]?.title || p.title}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {p.category || p.typeName}
                        </div>
                        {picked[p.id]?.priceCents != null && (
                          <div className="mt-1 text-xs font-bold text-primary">{money(picked[p.id].priceCents!)} MXN</div>
                        )}
                      </div>
                    </button>
                    <div className="px-3 pb-3">
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => openStudio(p)}>
                        <Palette className="mr-1 size-3.5" />
                        {picked[p.id]?.mockupUrl ? "Editar diseño" : "Personalizar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>


            {filtered.length > visible && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + 48)}>
                  Ver más ({filtered.length - visible} restantes)
                </Button>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">Tu catálogo</h1>
            <p className="mt-1 text-muted-foreground">
              Precio de venta sugerido con margen incluido. Lo puedes ajustar después desde tu tienda.
            </p>
            <div className="mt-6 grid gap-3">
              {pickedList.map((p) => (
                <div key={p.productId} className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <img src={p.image} alt={p.title} className="size-full object-cover" loading="lazy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.typeName}</div>
                  </div>
                  <Badge variant="secondary">{p.priceCents != null ? `${money(p.priceCents)} MXN` : "Calculando…"}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setPicked((prev) => {
                        const next = { ...prev };
                        delete next[p.productId];
                        return next;
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {!pickedList.length && <p className="text-sm text-muted-foreground">Vuelve atrás y elige productos.</p>}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">Fachada de tu tienda</h1>
            <p className="mt-1 text-muted-foreground">Nombre y estilo visual. Lo puedes cambiar después.</p>
            <div className="mt-6 grid gap-6">
              <div>
                <Label htmlFor="name">Nombre de tu tienda</Label>
                <Input id="name" placeholder="Ej. Aurora Studio" value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
                {slug && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    URL pública: <span className="font-mono text-foreground">datable.app/t/{slug}</span>
                  </p>
                )}
              </div>
              <div>
                <Label>Estilo visual</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setS({ ...s, themeId: t.id, primaryColor: t.primary })}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${s.themeId === t.id ? "border-primary" : "border-border"}`}
                    >
                      <div className="h-12 rounded-md" style={{ background: t.primary }} />
                      <div className="mt-3 font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">Pagos y envíos</h1>
            <p className="mt-1 text-muted-foreground">¿A dónde llegan tus pedidos? ¿Cómo entregas?</p>
            <div className="mt-6 grid gap-6">
              <div>
                <Label htmlFor="pay">Email para recibir notificación de pedidos</Label>
                <Input id="pay" type="email" placeholder="tu@email.com" value={s.paymentEmail} onChange={(e) => setS({ ...s, paymentEmail: e.target.value })} />
              </div>
              <div>
                <Label>Opciones de envío</Label>
                <div className="mt-2 grid gap-2">
                  {[
                    { k: "shippingStandard" as const, label: "Envío estándar (3-7 días) · $99 MXN" },
                    { k: "shippingExpress" as const, label: "Envío express (1-2 días) · $199 MXN" },
                    { k: "shippingPickup" as const, label: "Recoge en tienda · Gratis" },
                  ].map((o) => (
                    <label key={o.k} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={s[o.k]}
                        onChange={(e) => setS({ ...s, [o.k]: e.target.checked })}
                        className="size-4 accent-[color:var(--color-primary)]"
                      />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="mr-1 size-4" /> Atrás
          </Button>
          {step < 3 ? (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)} className="shine-on-hover">
              Continuar <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button disabled={!canNext || saving} onClick={handleFinish} className="shadow-cta shine-on-hover">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
              ¡Lanzar tienda!
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
