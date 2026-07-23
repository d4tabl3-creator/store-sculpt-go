import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Edit3, ExternalLink, LogOut, Plus, Settings, ShieldCheck, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getMyPlan } from "@/lib/plans.functions";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  created_at: string;
  order_count: number;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Mi panel — DªTªBLe" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getMyPlan>> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const [{ data: storesData }, planRes, { data: adminRes }] = await Promise.all([
      supabase.from("stores").select("id, slug, name, niche, primary_color, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
      getMyPlan(),
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    ]);
    setPlan(planRes);
    setIsAdmin(!!adminRes);
    const enriched = await Promise.all(
      (storesData || []).map(async (st) => {
        const { count } = await supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("store_id", st.id);
        return { ...st, order_count: count || 0 };
      }),
    );
    setStores(enriched);
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl font-extrabold">
            D<span className="text-primary">ª</span>T<span className="text-primary">ª</span>BLe
          </Link>
          <div className="flex items-center gap-1">
            {plan?.plan ? (
              <Badge variant="secondary" className="mr-2 uppercase">{plan.plan}</Badge>
            ) : (
              <Button size="sm" variant="outline" asChild><Link to="/planes"><CreditCard className="mr-1 size-3.5" />Elegir plan</Link></Button>
            )}
            <Button variant="ghost" size="sm" asChild><Link to="/cuenta"><Settings className="mr-1 size-4" />Cuenta</Link></Button>
            {isAdmin && <Button variant="ghost" size="sm" asChild><Link to="/admin"><ShieldCheck className="mr-1 size-4" />Admin</Link></Button>}
            <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="mr-1 size-4" />Salir</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Mis tiendas</h1>
            <p className="text-muted-foreground">Vende. Recibe pedidos. Edita lo que necesites.</p>
          </div>
          <Button asChild className="shine-on-hover shadow-cta">
            <Link to="/crear">
              <Plus className="mr-1 size-4" /> Nueva tienda
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-10 text-center text-muted-foreground">Cargando…</div>
        ) : stores.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Store className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-bold">Aún no tienes tiendas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crea la primera en menos de 5 minutos.</p>
            <Button asChild className="mt-5">
              <Link to="/crear">Crear mi primera tienda</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((st) => (
              <div key={st.id} className="rounded-2xl border border-border bg-card p-5 shadow-pop">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg" style={{ background: st.primary_color }} />
                  <Badge variant="secondary">{st.niche}</Badge>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{st.name}</h3>
                <div className="mt-1 font-mono text-xs text-muted-foreground">/t/{st.slug}</div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="size-4 text-primary" />
                    <span className="font-bold">{st.order_count}</span>
                    <span className="text-muted-foreground">pedidos</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/t/$slug" params={{ slug: st.slug }} target="_blank">
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/tienda/$id" params={{ id: st.id }}>
                      <Edit3 className="size-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/tienda/$id" params={{ id: st.id }}>
                      <TrendingUp className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
