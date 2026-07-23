import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { cancelMyPlan, getMyPlan } from "@/lib/plans.functions";
import { deleteMyAccount, getMyCommissionSummary, updateMyBankInfo } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — DªTªBLe" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({ bank_name: "", clabe: "", beneficiary_name: "", tax_id: "" });
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getMyPlan>> | null>(null);
  const [commissions, setCommissions] = useState<Awaited<ReturnType<typeof getMyCommissionSummary>> | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) { navigate({ to: "/auth" }); return; }
      setEmail(u.email || "");
      const { data: p } = await supabase.from("profiles").select("bank_name, clabe, beneficiary_name, tax_id").eq("id", u.id).maybeSingle();
      if (p) setProfile({
        bank_name: p.bank_name || "",
        clabe: p.clabe || "",
        beneficiary_name: p.beneficiary_name || "",
        tax_id: p.tax_id || "",
      });
      setPlan(await getMyPlan());
      setCommissions(await getMyCommissionSummary());
    })();
  }, [navigate]);

  async function saveBank() {
    setSavingBank(true);
    const res = await updateMyBankInfo({ data: profile });
    setSavingBank(false);
    if ("error" in res) toast.error(res.error); else toast.success("Datos bancarios guardados");
  }

  async function changePassword() {
    if (newPassword.length < 8) return toast.error("Mínimo 8 caracteres");
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);
    if (error) toast.error(error.message); else { toast.success("Contraseña actualizada"); setNewPassword(""); }
  }

  async function cancel() {
    setCanceling(true);
    const res = await cancelMyPlan({ data: { environment: getStripeEnvironment() } });
    setCanceling(false);
    if ("error" in res) toast.error(res.error);
    else { toast.success("Plan cancelado"); setPlan(await getMyPlan()); }
  }

  async function removeAccount() {
    setDeleting(true);
    const res = await deleteMyAccount();
    if ("error" in res) { toast.error(res.error); setDeleting(false); return; }
    await supabase.auth.signOut();
    toast.success("Cuenta eliminada");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Panel
          </Link>
          <div className="font-display text-xl font-extrabold">Mi cuenta</div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">Suscripción</h2>
          {plan?.plan ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="secondary" className="uppercase">{plan.plan}</Badge>
                <span className="ml-2 text-sm text-muted-foreground">
                  Fuente: {plan.source === "coupon" ? "Cupón demo" : "Stripe"}
                </span>
                {plan.current_period_end && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {plan.cancel_at_period_end ? "Termina" : "Renueva"} el {new Date(plan.current_period_end).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild><Link to="/planes">Cambiar</Link></Button>
                {!plan.cancel_at_period_end && plan.status !== "canceled" && (
                  <Button variant="destructive" onClick={cancel} disabled={canceling}>
                    {canceling && <Loader2 className="mr-2 size-4 animate-spin" />} Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">No tienes suscripción activa.</p>
              <Button asChild><Link to="/planes">Ver planes</Link></Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">Comisiones y depósitos</h2>
          <p className="text-sm text-muted-foreground">Recibimos los pagos y te depositamos tu porcentaje a la CLABE registrada.</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Pendiente por pagar</div>
              <div className="font-display text-2xl font-extrabold">${((commissions?.pending_cents || 0) / 100).toFixed(2)} MXN</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Ya pagado</div>
              <div className="font-display text-2xl font-extrabold">${((commissions?.paid_cents || 0) / 100).toFixed(2)} MXN</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div><Label>Banco</Label><Input value={profile.bank_name} onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })} placeholder="BBVA / Santander / …" /></div>
            <div><Label>CLABE (18 dígitos)</Label><Input value={profile.clabe} onChange={(e) => setProfile({ ...profile, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) })} inputMode="numeric" /></div>
            <div><Label>Beneficiario</Label><Input value={profile.beneficiary_name} onChange={(e) => setProfile({ ...profile, beneficiary_name: e.target.value })} placeholder="Como aparece en el banco" /></div>
            <div><Label>RFC (opcional)</Label><Input value={profile.tax_id} onChange={(e) => setProfile({ ...profile, tax_id: e.target.value.toUpperCase() })} /></div>
          </div>
          <Button className="mt-4" onClick={saveBank} disabled={savingBank}>
            {savingBank ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Guardar datos bancarios
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">Seguridad</h2>
          <div className="mt-3">
            <Label>Email</Label><Input value={email} readOnly disabled />
          </div>
          <div className="mt-3">
            <Label htmlFor="np">Nueva contraseña</Label>
            <div className="flex gap-2">
              <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              <Button onClick={changePassword} disabled={changingPass || !newPassword}>
                {changingPass && <Loader2 className="mr-2 size-4 animate-spin" />} Cambiar
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/50 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" />
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-destructive">Zona de peligro</h2>
              <p className="text-sm text-muted-foreground">Borrar tu cuenta elimina tus tiendas y pedidos. No se puede revertir.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 size-4" /> Eliminar cuenta</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrarán tiendas, productos y pedidos asociados. Esto es permanente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={removeAccount} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Sí, borrar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>
    </div>
  );
}
