import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";
import type { PlanId } from "@/lib/plans";

type OkOrError<T> = T | { error: string };

// ---------- resolveOrCreateCustomer ----------
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  opts: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${opts.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (opts.email) {
    const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
    if (existing.data.length) {
      const c = existing.data[0];
      await stripe.customers.update(c.id, {
        metadata: { ...c.metadata, userId: opts.userId },
      });
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(opts.email && { email: opts.email }),
    metadata: { userId: opts.userId },
  });
  return created.id;
}

// ---------- createPlanCheckout ----------
export const createPlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { plan: PlanId; returnUrl: string; environment: StripeEnv }) => {
      if (data.plan !== "starter" && data.plan !== "pro")
        throw new Error("Plan inválido");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<OkOrError<{ clientSecret: string }>> => {
    try {
      const stripe = createStripeClient(data.environment);
      const priceId = data.plan === "pro" ? "pro_monthly" : "starter_monthly";
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!prices.data.length) throw new Error("Price not found");

      const email = context.claims?.email as string | undefined;
      const customerId = await resolveOrCreateCustomer(stripe, {
        email,
        userId: context.userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: prices.data[0].id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId: context.userId, kind: "merchant_subscription", plan: data.plan },
        subscription_data: {
          metadata: { userId: context.userId, kind: "merchant_subscription", plan: data.plan },
        },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createPlanCheckout error", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---------- getMyPlan ----------
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("merchant_subscriptions")
      .select("plan, status, source, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { plan: null as null | PlanId, status: null, source: null, current_period_end: null, cancel_at_period_end: false, stripe_subscription_id: null };
    const active =
      ["active", "trialing", "past_due"].includes(data.status as string) &&
      (!data.current_period_end || new Date(data.current_period_end as string) > new Date());
    return {
      plan: (active ? (data.plan as PlanId) : null),
      status: data.status,
      source: data.source,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end,
      stripe_subscription_id: data.stripe_subscription_id,
    };
  });

// ---------- cancelMyPlan ----------
export const cancelMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true }>> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: sub } = await supabaseAdmin
        .from("merchant_subscriptions")
        .select("stripe_subscription_id, source")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) return { error: "No tienes suscripción activa" };

      if (sub.source === "stripe" && sub.stripe_subscription_id) {
        const stripe = createStripeClient(data.environment);
        await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
          cancel_at_period_end: true,
        });
        await supabaseAdmin
          .from("merchant_subscriptions")
          .update({ cancel_at_period_end: true })
          .eq("stripe_subscription_id", sub.stripe_subscription_id as string);
      } else {
        // Cupón: cancelar inmediatamente
        await supabaseAdmin
          .from("merchant_subscriptions")
          .update({ status: "canceled", current_period_end: new Date().toISOString() })
          .eq("user_id", context.userId);
      }
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---------- redeemDemoCoupon ----------
export const redeemDemoCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const code = (data.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new Error("Código inválido");
    return { code };
  })
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true; plan: PlanId; expires: string }>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: coupon } = await supabaseAdmin
      .from("demo_coupons")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (!coupon) return { error: "Código no existe" };
    if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date())
      return { error: "Código expirado" };
    if ((coupon.uses as number) >= (coupon.max_uses as number))
      return { error: "Código sin usos disponibles" };

    const { data: already } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id")
      .eq("coupon_id", coupon.id as string)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (already) return { error: "Ya canjeaste este código" };

    const expires = new Date(Date.now() + (coupon.days_valid as number) * 86400_000).toISOString();

    const { error: eRed } = await supabaseAdmin
      .from("coupon_redemptions")
      .insert({ coupon_id: coupon.id as string, user_id: context.userId });
    if (eRed) return { error: "No se pudo registrar el canje" };

    await supabaseAdmin
      .from("demo_coupons")
      .update({ uses: (coupon.uses as number) + 1 })
      .eq("id", coupon.id as string);

    // Upsert subscription: if exists coupon-source, extend; else insert
    const { data: current } = await supabaseAdmin
      .from("merchant_subscriptions")
      .select("id, source")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (current && current.source === "coupon") {
      await supabaseAdmin
        .from("merchant_subscriptions")
        .update({
          plan: coupon.plan as PlanId,
          status: "active",
          current_period_end: expires,
          cancel_at_period_end: false,
        })
        .eq("id", current.id as string);
    } else {
      await supabaseAdmin.from("merchant_subscriptions").insert({
        user_id: context.userId,
        plan: coupon.plan as PlanId,
        status: "active",
        source: "coupon",
        current_period_end: expires,
      });
    }

    return { ok: true, plan: coupon.plan as PlanId, expires };
  });

// ---------- admin: create/list/delete coupons ----------
async function assertAdmin(supabase: ReturnType<typeof createStripeClient> | any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Solo administradores");
}

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("demo_coupons")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  });

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      code: string;
      plan: PlanId;
      days_valid: number;
      max_uses: number;
      notes?: string;
    }) => {
      const code = (data.code || "").trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new Error("Código inválido");
      if (data.plan !== "starter" && data.plan !== "pro") throw new Error("Plan inválido");
      if (!(data.days_valid > 0 && data.days_valid <= 365)) throw new Error("Días inválidos");
      if (!(data.max_uses > 0 && data.max_uses <= 100000)) throw new Error("Usos inválidos");
      return { ...data, code };
    },
  )
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true }>> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("demo_coupons").insert({
      code: data.code,
      plan: data.plan,
      days_valid: data.days_valid,
      max_uses: data.max_uses,
      notes: data.notes || null,
      created_by: context.userId,
    });
    if (error) return { error: error.message };
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<OkOrError<{ ok: true }>> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("demo_coupons").delete().eq("id", data.id);
    return { ok: true };
  });
