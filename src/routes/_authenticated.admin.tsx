import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeUsuario } from "@/lib/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createCoupon, deleteCoupon, listCoupons } from "@/lib/plans.functions";
import { adminListPayouts, adminMarkPayoutPaid } from "@/lib/account.functions";
import { useT } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — DªTªBLe" }] }),
  component: Admin,
});

function Admin() {
  const t = useT();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [tab, setTab] = useState<"coupons" | "payouts">("coupons");
  const [form, setForm] = useState({ code: "", plan: "pro" as PlanId, days_valid: 30, max_uses: 10, notes: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) { navigate({ to: "/auth" }); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
      if (!data) { setIsAdmin(false); return; }
      setIsAdmin(true);
      setCoupons(await listCoupons());
      setPayouts(await adminListPayouts());
    })();
  }, [navigate]);

  async function refresh() {
    setCoupons(await listCoupons());
    setPayouts(await adminListPayouts());
  }

  async function submit() {
    setSaving(true);
    const res = await createCoupon({ data: form });
    setSaving(false);
    if ("error" in res) return toast.error(mensajeUsuario(res.error));
    toast.success(t("Cupón creado", "Coupon created"));
    setForm({ code: "", plan: "pro", days_valid: 30, max_uses: 10, notes: "" });
    refresh();
  }

  async function markPaid() {
    if (!selected.size) return;
    const res = await adminMarkPayoutPaid({ data: { ids: Array.from(selected) } });
    if ("error" in res) return toast.error(mensajeUsuario(res.error));
    toast.success(t(`Marcados como pagados: ${selected.size}`, `Marked as paid: ${selected.size}`));
    setSelected(new Set());
    refresh();
  }

  if (isAdmin === null) return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("Cargando…", "Loading…")}</div>;
  if (isAdmin === false) return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("Solo administradores", "Admins only")}</h1>
        <Button asChild className="mt-4"><Link to="/dashboard">{t("Volver", "Back")}</Link></Button>
      </div>
    </div>
  );

  const pendingSum = payouts.filter((p) => p.status === "pending" && selected.has(p.id)).reduce((s, p) => s + p.net_owed_cents, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> {t("Panel", "Dashboard")}</Link>
          <div className="font-display text-xl font-extrabold">Admin</div>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex gap-2">
          <Button variant={tab === "coupons" ? "default" : "outline"} onClick={() => setTab("coupons")}>{t("Cupones demo", "Demo coupons")}</Button>
          <Button variant={tab === "payouts" ? "default" : "outline"} onClick={() => setTab("payouts")}>{t("Comisiones a pagar", "Commissions to pay")}</Button>
          <Button variant="outline" asChild><Link to="/diagnostico">{t("Diagnóstico", "Diagnostics")}</Link></Button>

        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "coupons" ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Nuevo cupón", "New coupon")}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div><Label>{t("Código", "Code")}</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DEMO-XXXX" /></div>
                <div><Label>{t("Plan", "Plan")}</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanId })}>
                    <option value="starter">{t("Gratis", "Free")}</option><option value="pro">Pro</option>
                  </select>
                </div>
                <div><Label>{t("Días válidos", "Valid days")}</Label><Input type="number" value={form.days_valid} onChange={(e) => setForm({ ...form, days_valid: Number(e.target.value) })} /></div>
                <div><Label>{t("Usos máx", "Max uses")}</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} /></div>
                <div className="flex items-end"><Button className="w-full" onClick={submit} disabled={saving || !form.code}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}<Plus className="mr-1 size-4" />{t("Crear", "Create")}</Button></div>
              </div>
              <div><Label>{t("Notas (opcional)", "Notes (optional)")}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">{t("Cupones existentes", "Existing coupons")}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">{t("Código", "Code")}</th><th>{t("Plan", "Plan")}</th><th>{t("Días", "Days")}</th><th>{t("Usos", "Uses")}</th><th>{t("Expira", "Expires")}</th><th>{t("Notas", "Notes")}</th><th></th></tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-2 font-mono">{c.code}</td>
                        <td><Badge variant="secondary">{c.plan}</Badge></td>
                        <td>{c.days_valid}</td>
                        <td>{c.uses} / {c.max_uses}</td>
                        <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                        <td className="text-xs text-muted-foreground">{c.notes || ""}</td>
                        <td><Button size="sm" variant="ghost" onClick={async () => { await deleteCoupon({ data: { id: c.id } }); refresh(); }}><Trash2 className="size-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">{t("Comisiones registradas", "Recorded commissions")}</h2>
              <div className="flex items-center gap-3">
                {selected.size > 0 && <span className="text-sm text-muted-foreground">{t("Seleccionado: ", "Selected: ")}${(pendingSum/100).toFixed(2)} MXN</span>}
                <Button onClick={markPaid} disabled={!selected.size}>{t("Marcar como pagado", "Mark as paid")} ({selected.size})</Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th></th><th>{t("Fecha", "Date")}</th><th>Merchant</th><th>{t("Banco / CLABE", "Bank / Account")}</th><th>{t("Bruto", "Gross")}</th><th>{t("Neto a pagar", "Net to pay")}</th><th>{t("Estado", "Status")}</th></tr>
                </thead>
                <tbody>
                  {payouts.map((p) => {
                    const isPending = p.status === "pending";
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-2">
                          <input type="checkbox" disabled={!isPending} checked={selected.has(p.id)} onChange={(e) => {
                            const n = new Set(selected);
                            if (e.target.checked) n.add(p.id); else n.delete(p.id);
                            setSelected(n);
                          }} />
                        </td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="text-xs">{p.merchant?.full_name || p.merchant?.email || (p.owner_id ? p.owner_id.slice(0,8) : "—")}</td>
                        <td className="font-mono text-xs">{p.merchant?.bank_name || "—"} · {p.merchant?.clabe || t("SIN CLABE", "NO ACCOUNT")}</td>
                        <td>${(p.gross_cents/100).toFixed(2)}</td>
                        <td className="font-bold">${(p.net_owed_cents/100).toFixed(2)}</td>
                        <td>{isPending ? <Badge variant="outline">{t("pendiente", "pending")}</Badge> : <Badge>{t("pagado", "paid")}</Badge>}</td>
                      </tr>
                    );
                  })}
                  {payouts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t("Sin comisiones aún", "No commissions yet")}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
