import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Mail, Phone, Rocket, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getMyPlan } from "@/lib/plans.functions";
import { canPublish } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/tienda/$id")({
  head: () => ({ meta: [{ title: "Editar tienda — DªTªBLe" }] }),
  component: StoreManage,
});

type Store = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  status: string;
};
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
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

function StoreManage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [paymentEmail, setPaymentEmail] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasPlan, setHasPlan] = useState<boolean>(false);

  useEffect(() => {
    load();
    getMyPlan().then((p) => setHasPlan(canPublish(p.plan)));
  }, [id]);

  async function load() {
    const { data: s } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
    setStore(s as Store);
    const { data: ps } = await supabase.from("store_payment_settings").select("payment_email").eq("store_id", id).maybeSingle();
    setPaymentEmail((ps?.payment_email as string | null) || "");
    const { data: p } = await supabase.from("store_products").select("*").eq("store_id", id).order("sort_order");
    setProducts((p as Product[]) || []);
    const { data: o } = await supabase.from("store_orders").select("*").eq("store_id", id).order("created_at", { ascending: false });
    setOrders(((o as unknown) as Order[]) || []);
  }

  async function saveStore() {
    if (!store) return;
    setSaving(true);
    const { error } = await supabase
      .from("stores")
      .update({ name: store.name, primary_color: store.primary_color })
      .eq("id", id);
    if (!error) {
      const { error: pe } = await supabase
        .from("store_payment_settings")
        .upsert({ store_id: id, payment_email: paymentEmail || null }, { onConflict: "store_id" });
      if (pe) { setSaving(false); toast.error(pe.message); return; }
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Cambios guardados");
  }
  async function togglePublish() {
    if (!store) return;
    const nextStatus = store.status === "published" ? "draft" : "published";
    if (nextStatus === "published" && !hasPlan) {
      toast.error("Necesitas un plan activo para publicar tu tienda.");
      navigate({ to: "/planes" });
      return;
    }
    if (nextStatus === "published" && !paymentEmail) {
      toast.error("Configura primero un email de notificaciones (pestaña Configuración).");
      return;
    }
    setPublishing(true);
    const { error } = await supabase.from("stores").update({ status: nextStatus }).eq("id", id);
    setPublishing(false);
    if (error) { toast.error(error.message); return; }
    setStore({ ...store, status: nextStatus });
    toast.success(nextStatus === "published" ? "¡Tienda publicada! Ya recibes pedidos." : "Tienda despublicada.");
  }



  async function updateProduct(p: Product) {
    const { error } = await supabase
      .from("store_products")
      .update({ name: p.name, price_cents: p.price_cents, stock: p.stock })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Producto actualizado");
  }

  async function deleteProduct(pid: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await supabase.from("store_products").delete().eq("id", pid);
    setProducts(products.filter((x) => x.id !== pid));
  }

  async function setOrderStatus(orderId: string, status: string) {
    await supabase.from("store_orders").update({ status }).eq("id", orderId);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  if (!store) return <div className="grid min-h-screen place-items-center">Cargando…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Mis tiendas
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/t/$slug" params={{ slug: store.slug }} target="_blank">
              Ver tienda <ExternalLink className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-extrabold">{store.name}</h1>
        <p className="text-muted-foreground">/t/{store.slug}</p>

        <Tabs defaultValue="orders" className="mt-6">
          <TabsList>
            <TabsTrigger value="orders">Pedidos ({orders.length})</TabsTrigger>
            <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                Aún no hay pedidos. Comparte la URL de tu tienda para empezar.
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
                      <div className="font-display text-lg font-bold">${(o.total_cents / 100).toFixed(2)}</div>
                      <Badge variant={o.status === "completed" ? "default" : "secondary"}>{o.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {o.items.map((it, i) => (
                      <div key={i}>{it.qty}× {it.name}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "shipped")}>Marcar enviado</Button>
                    <Button size="sm" onClick={() => setOrderStatus(o.id, "completed")}>Completar</Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6 space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3">
                {p.image_url && <img src={p.image_url} alt={p.name} className="size-16 rounded-lg object-cover" />}
                <div className="flex-1 min-w-[180px]">
                  <Input value={p.name} onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                </div>
                <div className="w-28">
                  <Label className="text-xs">Precio ($)</Label>
                  <Input type="number" value={p.price_cents / 100} onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, price_cents: Math.round(Number(e.target.value) * 100) } : x)))} />
                </div>
                <div className="w-20">
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" value={p.stock} onChange={(e) => setProducts(products.map((x) => (x.id === p.id ? { ...x, stock: Number(e.target.value) } : x)))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateProduct(p)}>Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-4 max-w-lg">
            <div>
              <Label>Nombre</Label>
              <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
            </div>
            <div>
              <Label>Email de notificaciones</Label>
              <Input value={paymentEmail} onChange={(e) => setPaymentEmail(e.target.value)} />
            </div>
            <div>
              <Label>Color primario</Label>
              <div className="flex items-center gap-3">
                <Input type="color" className="w-16 h-10 p-1" value={store.primary_color} onChange={(e) => setStore({ ...store, primary_color: e.target.value })} />
                <Input value={store.primary_color} onChange={(e) => setStore({ ...store, primary_color: e.target.value })} />
              </div>
            </div>
            <Button onClick={saveStore} disabled={saving}>Guardar cambios</Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
