import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type OkOrError<T> = T | { error: string };

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OkOrError<{ ok: true }>> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error" };
    }
  });

export const updateMyBankInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bank_name: string; clabe: string; beneficiary_name: string; tax_id?: string }) => {
      const clabe = (data.clabe || "").replace(/\s+/g, "");
      if (!/^\d{18}$/.test(clabe)) throw new Error("CLABE debe tener 18 dígitos");
      if (!data.bank_name?.trim()) throw new Error("Banco requerido");
      if (!data.beneficiary_name?.trim()) throw new Error("Nombre del beneficiario requerido");
      return { ...data, clabe };
    },
  )
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true }>> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        bank_name: data.bank_name.trim(),
        clabe: data.clabe,
        beneficiary_name: data.beneficiary_name.trim(),
        tax_id: data.tax_id?.trim() || null,
      })
      .eq("id", context.userId);
    if (error) return { error: error.message };
    return { ok: true };
  });

export const getMyCommissionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("commission_ledger")
      .select("net_owed_cents, status, created_at, order_id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data || []) as Array<{ net_owed_cents: number; status: string; created_at: string; order_id: string }>;
    const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.net_owed_cents, 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.net_owed_cents, 0);
    return { rows, pending_cents: pending, paid_cents: paid };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Solo administradores");
}

export const adminListPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rowsRaw } = await supabaseAdmin
      .from("commission_ledger")
      .select("id, owner_id, order_id, gross_cents, net_owed_cents, commission_cents, status, created_at, paid_at, payout_ref")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (rowsRaw || []) as any[];
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id as string)));
    const { data: profs } = ownerIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, bank_name, clabe, beneficiary_name, tax_id")
          .in("id", ownerIds)
      : { data: [] as any[] };
    const byId = new Map(((profs as any[]) || []).map((p) => [p.id as string, p]));
    return rows.map((r) => ({ ...r, merchant: byId.get(r.owner_id as string) || null }));
  });

export const adminMarkPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[]; note?: string }) => data)
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true }>> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("commission_ledger")
      .update({ status: "paid", paid_at: new Date().toISOString(), payout_ref: data.note || null })
      .in("id", data.ids);
    if (error) return { error: error.message };
    return { ok: true };
  });
