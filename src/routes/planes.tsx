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
import { useT } from "@/lib/i18n";
import { publicUrlFor } from "@/lib/public-url";

export const Route = createFileRoute("/planes")({
  head: () => {
    const url = publicUrlFor("/planes");
    const desc = "Empieza gratis con Datable y paga 20% de tu ganancia, o activa Pro por $499 MXN al mes y conserva el 100% de tus ventas.";
    return {
      meta: [
        { title: "Planes y precios — DªTªBLe" },
        { name: "description", content: desc },
        { property: "og:title", content: "Planes y precios — DªTªBLe" },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: "Planes y precios — DªTªBLe" },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PlansPage,
});

function PlansPage() {
  const t = useT();
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
    if (!selected) throw new Error(t("Sin plan seleccionado", "No plan selected"));
    const res = await createPlanCheckout({
      data: {
        plan: selected,
        returnUrl: `${window.location.origin}/planes?paid=1`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in res) throw new Error(res.error);
    if (!res.clientSecret) throw new Error(t("Stripe no devolvió clientSecret", "Stripe did not return a clientSecret"));
    return res.clientSecret;
  }, [selected, t]);

  async function redeem() {
    setRedeeming(true);
    const res = await redeemDemoCoupon({ data: { code } });
    setRedeeming(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(
      t(
        `Plan ${res.plan.toUpperCase()} activo hasta ${new Date(res.expires).toLocaleDateString()}`,
        `${res.plan.toUpperCase()} plan active until ${new Date(res.expires).toLocaleDateString()}`
      )
    );
    navigate({ to: "/crear" });
  }

  if (checkingPlan) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">{t("Cargando…", "Loading…")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Volver", "Back")}
          </Link>
          <div className="font-display text-xl font-extrabold">{t("Planes", "Plans")}</div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {current?.plan && (
          <div className="mb-6 rounded-2xl border border-primary bg-primary-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{t("Plan actual", "Current plan")}</div>
                <div className="font-display text-xl font-bold">
                  {current.plan === "pro" ? "Pro" : t("Gratis", "Free")} <Badge variant="secondary" className="ml-2">{current.source === "coupon" ? t("Cupón", "Coupon") : t("Suscripción", "Subscription")}</Badge>
                </div>
                {current.current_period_end && (
                  <div className="text-xs text-muted-foreground">
                    {current.cancel_at_period_end ? t("Termina", "Ends") : t("Renueva", "Renews")} {t("el", "on")} {new Date(current.current_period_end).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Button variant="outline" asChild><Link to="/cuenta">{t("Gestionar", "Manage")}</Link></Button>
            </div>
          </div>
        )}

        {selected ? (
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">{t("Suscripción", "Subscription")}</div>
                <div className="font-display text-2xl font-bold">DªTªBLe {PLANS.find((p) => p.id === selected)?.name}</div>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>{t("Cambiar plan", "Change plan")}</Button>
            </div>
            <EmbeddedStripe fetchClientSecret={fetchClientSecret} minHeight={600} />
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-extrabold">{t("Empieza gratis, crece sin riesgo", "Start free, grow risk-free")}</h1>
            <p className="text-muted-foreground">{t("Sin permanencia. Cambia de modalidad cuando quieras.", "No commitment. Switch modes whenever you want.")}</p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {PLANS.map((p) => (
                <div key={p.id} className={"relative rounded-3xl border p-7 transition-all " + (p.featured ? "border-primary bg-linear-to-br from-primary to-action text-primary-foreground shadow-pop" : "border-border bg-card")}>
                  {p.featured && (
                    <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">{t("Más elegido", "Most popular")}</span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                    <span className={"text-xs " + (p.featured ? "opacity-80" : "text-muted-foreground")}>{p.commissionLabel}</span>
                  </div>
                  <p className={"mt-1 text-sm " + (p.featured ? "opacity-80" : "text-muted-foreground")}>{p.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-extrabold">${p.monthlyMxn}</span>
                    <span className={p.featured ? "opacity-80" : "text-muted-foreground"}>MXN / {t("mes", "mo")}</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className={"mt-0.5 size-4 shrink-0 " + (p.featured ? "text-accent" : "text-primary")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {p.id === "starter" ? (
                    <Button
                      size="lg"
                      variant={p.featured ? "secondary" : "default"}
                      className="mt-7 w-full"
                      asChild
                      disabled={current?.plan === p.id}
                    >
                      {current?.plan === p.id ? (
                        <span>{t("Plan actual", "Current plan")}</span>
                      ) : (
                        <Link to="/crear"><Sparkles className="mr-2 size-4" /> {t("Crear tienda gratis", "Create free store")}</Link>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant={p.featured ? "secondary" : "default"}
                      className="mt-7 w-full"
                      onClick={() => setSelected(p.id)}
                      disabled={current?.plan === p.id}
                    >
                      {current?.plan === p.id ? t("Plan actual", "Current plan") : (
                        <><Sparkles className="mr-2 size-4" /> {t("Activar", "Activate")} {p.name}</>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-dashed border-accent bg-accent-soft/40 p-5">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-accent-foreground" />
                <span className="text-sm font-bold text-accent-foreground">{t("¿Tienes un cupón de demo?", "Have a demo coupon?")}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input placeholder="DEMO-XXXX" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-xs uppercase" />
                <Button onClick={redeem} disabled={redeeming || !code}>
                  {redeeming && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Canjear", "Redeem")}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("Activa un plan gratuito durante los días indicados en el cupón.", "Activates a free plan for the number of days shown on the coupon.")}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
