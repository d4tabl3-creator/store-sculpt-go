import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

/** Idempotencia: guardar event_id y saltar si ya lo procesamos. */
async function alreadyProcessed(eventId: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from("processed_stripe_events").insert({ id: eventId });
  // Si insert falla por unique_violation, ya lo procesamos.
  return !!error;
}

async function handleStoreOrderPaid(session: any) {
  const orderId = session.metadata?.orderId as string | undefined;
  if (!orderId) {
    console.warn("checkout completed sin orderId");
    return;
  }
  const sb = getSupabase();
  // apply_paid_order: marca paid + decrementa stock + registra comisión
  const { error } = await sb.rpc("apply_paid_order", {
    _order_id: orderId,
    _commission_bps: 1000, // 10%
  });
  if (error) console.error("apply_paid_order error:", error);
}

async function handleStoreOrderFailed(session: any) {
  const orderId = session.metadata?.orderId as string | undefined;
  if (!orderId) return;
  await getSupabase().from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
}

async function handleSubscriptionUpsert(subscription: any) {
  const userId = subscription.metadata?.userId as string | undefined;
  if (!userId) {
    console.warn("subscription event sin userId");
    return;
  }
  const item = subscription.items?.data?.[0];
  const plan = subscription.metadata?.plan
    || item?.price?.lookup_key?.replace("_monthly", "")
    || null;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("merchant_subscriptions")
    .upsert(
      {
        user_id: userId,
        source: "stripe",
        plan: plan || "starter",
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: !!subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" },
    );
}

async function handleSubscriptionDeleted(subscription: any) {
  await getSupabase()
    .from("merchant_subscriptions")
    .update({ status: "canceled", cancel_at_period_end: true })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  // Idempotencia por event.id
  const anyEvent = event as unknown as { id?: string };
  if (anyEvent.id && (await alreadyProcessed(anyEvent.id))) return;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session: any = event.data.object;
      const kind = session.metadata?.kind;
      if (kind === "store_order") await handleStoreOrderPaid(session);
      // Suscripciones se manejan por eventos customer.subscription.*
      break;
    }
    case "checkout.session.async_payment_failed":
      await handleStoreOrderFailed(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      // silenciosamente ignorado
      break;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
