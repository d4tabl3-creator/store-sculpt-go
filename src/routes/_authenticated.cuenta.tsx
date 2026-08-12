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
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — DªTªBLe" }] }),
  component: AccountPage,
});

function AccountPage() {
  const t = useT();
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
    if ("error" in res) toast.error(res.error); else toast.success(t("Datos bancarios guardados", "Bank details saved"));
  }

  async function changePassword() {
    if (newPassword.length < 8) return toast.error(t("Mínimo 8 caracteres", "Minimum 8 characters"));
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);
    if (error) toast.error(error.message); else { toast.success(t("Contraseña actualizada", "Password updated")); setNewPassword(""); }
  }

  async function cancel() {
    setCanceling(true);
    const res = await cancelMyPlan({ data: { environment: getStripeEnvironment() } });
    setCanceling(false);
    if ("error" in res) toast.error(res.error);
    else { toast.success(t("Plan cancelado", "Plan canceled")); setPlan(await getMyPlan()); }
  }

  async function removeAccount() {
    setDeleting(true);
    const res = await deleteMyAccount();
    if ("error" in res) { toast.error(res.error); setDeleting(false); return; }
    await supabase.auth.signOut();
    toast.success(t("Cuenta eliminada", "Account deleted"));
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t("Panel", "Dashboard")}
          </Link>
          <div className="font-display text-xl font-extrabold">{t("Mi cuenta", "My account")}</div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">{t("Suscripción", "Subscription")}</h2>
          {plan?.plan ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="secondary" className="uppercase">{plan.plan}</Badge>
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("Fuente: ", "Source: ")}{plan.source === "coupon" ? t("Cupón demo", "Demo coupon") : "Stripe"}
                </span>
                {plan.current_period_end && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {plan.cancel_at_period_end ? t("Termina", "Ends") : t("Renueva", "Renews")} {t("el", "on")} {new Date(plan.current_period_end).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild><Link to="/planes">{t("Cambiar", "Change")}</Link></Button>
                {!plan.cancel_at_period_end && plan.status !== "canceled" && (
                  <Button variant="destructive" onClick={cancel} disabled={canceling}>
                    {canceling && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Cancelar", "Cancel")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("No tienes suscripción activa.", "You don't have an active subscription.")}</p>
              <Button asChild><Link to="/planes">{t("Ver planes", "View plans")}</Link></Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">{t("Comisiones y depósitos", "Commissions and payouts")}</h2>
          <p className="text-sm text-muted-foreground">{t("Recibimos los pagos y te depositamos tu porcentaje a la CLABE registrada.", "We receive the payments and deposit your percentage to your registered bank account.")}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">{t("Pendiente por pagar", "Pending payout")}</div>
              <div className="font-display text-2xl font-extrabold">${((commissions?.pending_cents || 0) / 100).toFixed(2)} MXN</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">{t("Ya pagado", "Already paid")}</div>
              <div className="font-display text-2xl font-extrabold">${((commissions?.paid_cents || 0) / 100).toFixed(2)} MXN</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div><Label>{t("Banco", "Bank")}</Label><Input value={profile.bank_name} onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })} placeholder={t("BBVA / Santander / …", "BBVA / Santander / …")} /></div>
            <div><Label>{t("CLABE (18 dígitos)", "Bank account (18 digits)")}</Label><Input value={profile.clabe} onChange={(e) => setProfile({ ...profile, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) })} inputMode="numeric" /></div>
            <div><Label>{t("Beneficiario", "Beneficiary")}</Label><Input value={profile.beneficiary_name} onChange={(e) => setProfile({ ...profile, beneficiary_name: e.target.value })} placeholder={t("Como aparece en el banco", "As it appears at the bank")} /></div>
            <div><Label>{t("RFC (opcional)", "Tax ID (optional)")}</Label><Input value={profile.tax_id} onChange={(e) => setProfile({ ...profile, tax_id: e.target.value.toUpperCase() })} /></div>
          </div>
          <Button className="mt-4" onClick={saveBank} disabled={savingBank}>
            {savingBank ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} {t("Guardar datos bancarios", "Save bank details")}
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold">{t("Seguridad", "Security")}</h2>
          <div className="mt-3">
            <Label>Email</Label><Input value={email} readOnly disabled />
          </div>
          <div className="mt-3">
            <Label htmlFor="np">{t("Nueva contraseña", "New password")}</Label>
            <div className="flex gap-2">
              <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("Mínimo 8 caracteres", "Minimum 8 characters")} />
              <Button onClick={changePassword} disabled={changingPass || !newPassword}>
                {changingPass && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Cambiar", "Change")}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/50 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" />
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-destructive">{t("Zona de peligro", "Danger zone")}</h2>
              <p className="text-sm text-muted-foreground">{t("Borrar tu cuenta elimina tus tiendas y pedidos. No se puede revertir.", "Deleting your account removes your stores and orders. This can't be undone.")}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 size-4" /> {t("Eliminar cuenta", "Delete account")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("¿Eliminar tu cuenta?", "Delete your account?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Se borrarán tiendas, productos y pedidos asociados. Esto es permanente.", "Associated stores, products and orders will be deleted. This is permanent.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancelar", "Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={removeAccount} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Sí, borrar todo", "Yes, delete everything")}
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
