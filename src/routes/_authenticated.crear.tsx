import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Store as StoreIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/kits";
import { getMyPlan } from "@/lib/plans.functions";
import { planLimit } from "@/lib/plans";
import { useT } from "@/lib/i18n";
import { publicUrlFor } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/crear")({
  head: () => ({
    meta: [
      { title: "Diseña tu tienda — DªTªBLe" },
      { name: "description", content: "Ponle nombre, logo y estilo a tu tienda. Después eliges qué vender." },
      { property: "og:title", content: "Diseña tu tienda — DªTªBLe" },
      { property: "og:description", content: "Crea tu tienda en minutos y elige después qué quieres vender." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateStorePage,
});

/**
 * Paso 1 del recorrido: la tienda existe como objeto ANTES de que el
 * comerciante agregue productos. Aquí sólo se define su identidad.
 */
function CreateStorePage() {
  const t = useT();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [gateChecked, setGateChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [paymentEmail, setPaymentEmail] = useState("");

  const slug = useMemo(() => slugify(storeName), [storeName]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlanWithTimeout() {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("plan_timeout")), 4000),
      );
      try {
        return await Promise.race([getMyPlan(), timeout]);
      } catch {
        return { plan: null as null | PlanId, status: null, source: null, current_period_end: null, cancel_at_period_end: false, stripe_subscription_id: null };
      }
    }

    (async () => {
      try {
        const u = (await supabase.auth.getUser()).data.user;
        if (!u) {
          navigate({ to: "/auth" });
          return;
        }

        const plan = await fetchPlanWithTimeout();
        const limit = planLimit(plan.plan);
        if (limit !== null) {
          const { count } = await supabase.from("stores").select("id", { count: "exact", head: true }).eq("owner_id", u.id);
          if ((count || 0) >= limit) {
            toast.error(
              plan.plan
                ? t(
                    `Tu plan actual permite ${limit} tienda${limit === 1 ? "" : "s"}. Sube a Pro para más.`,
                    `Your current plan allows ${limit} store${limit === 1 ? "" : "s"}. Upgrade to Pro for more.`,
                  )
                : t(
                    "Sin plan solo puedes tener 1 tienda. Activa Pro para crear más.",
                    "Without a plan you can only have 1 store. Activate Pro to create more.",
                  ),
            );
            navigate({ to: plan.plan ? "/planes" : "/dashboard" });
            return;
          }
        }
        if (!cancelled && u.email) setPaymentEmail((prev) => prev || u.email!);
        if (!cancelled) setGateChecked(true);
      } catch (err) {
        console.error("Error inicializando creación de tienda:", err);
        if (!cancelled) setGateChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Inicia sesión otra vez", "Please sign in again"));
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("disenos").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (!signed.data?.signedUrl) throw new Error(t("No se pudo preparar tu logo", "Could not prepare your logo"));
      setLogoUrl(signed.data.signedUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo subir el logo", "Could not upload the logo"));
    } finally {
      setUploading(false);
    }
  }

  const canCreate = storeName.trim().length >= 2 && paymentEmail.includes("@");

  async function createStore() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Sesión inválida", "Invalid session"));

      let finalSlug = slug;
      const { data: exists } = await supabase.from("stores").select("id").eq("slug", finalSlug).maybeSingle();
      if (exists) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: store, error } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          slug: finalSlug,
          name: storeName.trim(),
          niche: tagline.trim() || t("Mi tienda", "My store"),
          kit_id: "catalogo",
          // Plantilla base única de Datable Stores: sin selector de color.
          theme: "datable",
          primary_color: "#6D4AFF",
          logo_url: logoUrl,
          shipping_options: [],
          status: "draft",
        })
        .select()
        .single();
      if (error || !store) throw error || new Error(t("No se pudo crear tu tienda", "Could not create your store"));

      await supabase.from("store_payment_settings").insert({ store_id: store.id, payment_email: paymentEmail });

      navigate({ to: "/producto/$storeId", params: { storeId: store.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo crear tu tienda", "Could not create your store"));
    } finally {
      setSaving(false);
    }
  }

  if (!gateChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {t("Un momento…", "One moment…")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Salir", "Exit")}
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            {t("Paso 1 de 2 · Tu tienda", "Step 1 of 2 · Your store")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold uppercase">{t("Diseña tu tienda", "Design your store")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t(
            "Primero creamos tu tienda. Después eliges qué quieres vender y la llenas de productos.",
            "First we create your store. Then you choose what to sell and fill it with products.",
          )}
        </p>

        <div className="mt-8 grid gap-6">
          <div>
            <Label htmlFor="sname">{t("Nombre de tu tienda", "Your store's name")}</Label>
            <Input
              id="sname"
              placeholder={t("Ej. Aurora Studio", "E.g. Aurora Studio")}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
            {slug && (
              <p className="mt-1 text-xs text-muted-foreground">
              {t("Dirección pública:", "Public address:")}{" "}
                <span className="font-mono text-foreground">{publicUrlFor(`/t/${slug}`)}</span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="tagline">{t("¿De qué trata tu tienda?", "What is your store about?")}</Label>
            <Textarea
              id="tagline"
              rows={3}
              placeholder={t("Ej. Ropa con ilustraciones originales para amantes del café.", "E.g. Clothing with original illustrations for coffee lovers.")}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div>
            <Label>{t("Logo (opcional)", "Logo (optional)")}</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt={t("Logo de tu tienda", "Your store logo")} className="size-full object-cover" />
                ) : (
                  <StoreIcon className="size-7 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                {logoUrl ? t("Cambiar logo", "Change logo") : t("Subir logo", "Upload logo")}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="pay">{t("Email para recibir tus pedidos", "Email to receive your orders")}</Label>
            <Input id="pay" type="email" placeholder="tu@email.com" value={paymentEmail} onChange={(e) => setPaymentEmail(e.target.value)} />
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <Button disabled={!canCreate || saving} onClick={createStore} className="shadow-cta shine-on-hover">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("Crear tienda y elegir productos", "Create store and choose products")} <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
