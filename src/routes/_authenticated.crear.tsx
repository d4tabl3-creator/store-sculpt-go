import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { NICHES, THEMES, slugify } from "@/lib/kits";
import { getMyPlan } from "@/lib/plans.functions";
import { planLimit } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/crear")({
  head: () => ({ meta: [{ title: "Crear tienda — DªTªBLe" }] }),
  component: WizardPage,
});

type State = {
  nicheId: string;
  kitId: string;
  storeName: string;
  themeId: string;
  primaryColor: string;
  paymentEmail: string;
  shippingStandard: boolean;
  shippingExpress: boolean;
  shippingPickup: boolean;
};

function WizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);
  const [s, setS] = useState<State>({
    nicheId: "",
    kitId: "",
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
      if (!plan.plan) {
        toast.error("Necesitas un plan activo para crear una tienda");
        navigate({ to: "/planes" });
        return;
      }
      const limit = planLimit(plan.plan);
      if (limit !== null) {
        const { count } = await supabase.from("stores").select("id", { count: "exact", head: true }).eq("owner_id", u.id);
        if ((count || 0) >= limit) {
          toast.error(`Tu plan ${plan.plan.toUpperCase()} permite ${limit} tienda${limit === 1 ? "" : "s"}. Sube a Pro para más.`);
          navigate({ to: "/planes" });
          return;
        }
      }
      setGateChecked(true);
    })();
  }, [navigate]);

  const niche = NICHES.find((n) => n.id === s.nicheId) || null;
  const kit = niche?.kits.find((k) => k.id === s.kitId) || null;
  const slug = useMemo(() => slugify(s.storeName), [s.storeName]);

  const canNext =
    (step === 0 && s.nicheId) ||
    (step === 1 && s.kitId) ||
    (step === 2 && s.storeName.length >= 2) ||
    (step === 3 && s.paymentEmail.includes("@"));

  async function handleFinish() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !kit) throw new Error("Sesión inválida");

      // Ensure slug uniqueness
      let finalSlug = slug;
      const { data: exists } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (exists) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const shipping = [
        s.shippingStandard && { id: "standard", label: "Envío estándar (3-7 días)", price_cents: 9900 },
        s.shippingExpress && { id: "express", label: "Envío express (1-2 días)", price_cents: 19900 },
        s.shippingPickup && { id: "pickup", label: "Recoge en tienda", price_cents: 0 },
      ].filter(Boolean);

      const { data: store, error: e1 } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          slug: finalSlug,
          name: s.storeName,
          niche: niche!.label,
          kit_id: kit.id,
          theme: s.themeId,
          primary_color: s.primaryColor,
          
          shipping_options: shipping,
          status: "published",
        })
        .select()
        .single();
      if (e1 || !store) throw e1 || new Error("No se pudo crear la tienda");

      const products = kit.products.map((p, i) => ({
        store_id: store.id,
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
        image_url: p.image_url,
        stock: 50,
        sort_order: i,
      }));
      const { error: e2 } = await supabase.from("store_products").insert(products);
      if (e2) throw e2;

      if (s.paymentEmail) {
        await supabase.from("store_payment_settings").insert({ store_id: store.id, payment_email: s.paymentEmail });
      }

      toast.success("¡Tu tienda está lista!");
      navigate({ to: "/dashboard" });
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Salir
          </Link>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-10 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Ventanilla {step + 1}/4</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {step === 0 && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">¿Qué quieres vender?</h1>
            <p className="mt-1 text-muted-foreground">Elige tu rubro. Te armamos el catálogo.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {NICHES.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setS({ ...s, nicheId: n.id, kitId: "" })}
                  className={`rounded-2xl border-2 p-5 text-left transition-all hover:shadow-pop ${
                    s.nicheId === n.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                  }`}
                >
                  <div className="text-3xl">{n.emoji}</div>
                  <div className="mt-2 font-display text-lg font-bold">{n.label}</div>
                  <div className="text-xs text-muted-foreground">{n.kits.length} kit{n.kits.length > 1 ? "s" : ""} disponible{n.kits.length > 1 ? "s" : ""}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && niche && (
          <section>
            <h1 className="font-display text-3xl font-extrabold">Elige tu kit de lanzamiento</h1>
            <p className="mt-1 text-muted-foreground">Productos validados, proveedores listos, márgenes calculados.</p>
            <div className="mt-6 grid gap-4">
              {niche.kits.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setS({ ...s, kitId: k.id })}
                  className={`rounded-2xl border-2 p-5 text-left transition-all hover:shadow-pop ${
                    s.kitId === k.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl font-bold">{k.name}</div>
                      <div className="text-sm text-muted-foreground">{k.tagline}</div>
                    </div>
                    <Badge variant="secondary">{k.margin}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {k.products.map((p) => (
                      <div key={p.name} className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <img src={p.image_url} alt={p.name} className="size-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </button>
              ))}
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
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        s.themeId === t.id ? "border-primary" : "border-border"
                      }`}
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
