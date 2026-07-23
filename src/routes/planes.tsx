import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { EmbeddedStripe } from "@/components/EmbeddedStripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PLANS, type PlanId } from "@/lib/plans";
import { createPlanCheckout, getMyPlan, redeemDemoCoupon } from "@/lib/plans.functions";

export const Route = createFileRoute("/planes")({
  head: () => ({
    meta: [
      { title: "Planes y precios — DªTªBLe" },
      { name: "description", content: "Elige tu plan Starter o Pro y activa tu tienda hoy. Con cupón de demo puedes probar gratis." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const navigate = useNavigate();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [current, setCurrent] = useState<Awaited<ReturnType<typeof getMyPlan>> | null>(null);
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) { navigate({ to: "/auth" }); return; }
      const p = await getMyPlan();
      setCurrent(p);
      setCheckingPlan(false);
    })();
  }, [navigate]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!selected) throw new Error("Sin plan seleccionado");
    const res = await createPlanCheckout({
      data: {
        plan: selected,
        returnUrl: `${window.location.origin}/planes?paid=1`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error("Stripe no devolvió clientSecret");
    return res.clientSecret;
  }, [selected]);

  async function redeem() {
    setRedeeming(true);
    const res = await redeemDemoCoupon({ data: { code } });
    setRedeeming(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`Plan ${res.plan.toUpperCase()} activo hasta ${new Date(res.expires).toLocaleDateString()}`);
    navigate({ to: "/crear" });
  }

  if (checkingPlan) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver
          </Link>
          <div className="font-display text-xl font-extrabold">Planes</div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {current?.plan && (
          <div className="mb-6 rounded-2xl border border-primary bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Plan actual</div>
                <div className="font-display text-xl font-bold">
                  {current.plan === "pro" ? "Pro" : "Starter"} <Badge variant="secondary" className="ml-2">{current.source === "coupon" ? "Cupón" : "Suscripción"}</Badge>
                </div>
                {current.current_period_end && (
                  <div className="text-xs text-muted-foreground">
                    {current.cancel_at_period_end ? "Termina" : "Renueva"} el {new Date(current.current_period_end).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Button variant="outline" asChild><Link to="/cuenta">Gestionar</Link></Button>
            </div>
          </div>
        )}

        {selected ? (
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Suscripción</div>
                <div className="font-display text-2xl font-bold">DªTªBLe {PLANS.find((p) => p.id === selected)?.name}</div>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cambiar plan</Button>
            </div>
            <EmbeddedStripe fetchClientSecret={fetchClientSecret} minHeight={600} />
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-extrabold">Elige tu plan</h1>
            <p className="text-muted-foreground">Sin permanencia, cancela cuando quieras.</p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {PLANS.map((p) => (
                <div key={p.id} className={"relative rounded-3xl border p-7 transition-all " + (p.featured ? "border-primary bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-pop" : "border-border bg-card")}>
                  {p.featured && (
                    <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">Más elegido</span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                    <span className={"text-xs " + (p.featured ? "opacity-80" : "text-muted-foreground")}>{p.commissionLabel}</span>
                  </div>
                  <p className={"mt-1 text-sm " + (p.featured ? "opacity-80" : "text-muted-foreground")}>{p.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-extrabold">${p.monthlyMxn}</span>
                    <span className={p.featured ? "opacity-80" : "text-muted-foreground"}>MXN / mes</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className={"mt-0.5 size-4 shrink-0 " + (p.featured ? "text-accent" : "text-primary")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    variant={p.featured ? "secondary" : "default"}
                    className="mt-7 w-full"
                    onClick={() => setSelected(p.id)}
                    disabled={current?.plan === p.id}
                  >
                    {current?.plan === p.id ? "Plan actual" : (
                      <><Sparkles className="mr-2 size-4" /> Activar {p.name}</>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-dashed border-accent bg-accent-soft/40 p-5">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-accent-foreground" />
                <span className="text-sm font-bold text-accent-foreground">¿Tienes un cupón de demo?</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input placeholder="DEMO-XXXX" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-xs uppercase" />
                <Button onClick={redeem} disabled={redeeming || !code}>
                  {redeeming && <Loader2 className="mr-2 size-4 animate-spin" />} Canjear
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Activa un plan gratuito durante los días indicados en el cupón.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
