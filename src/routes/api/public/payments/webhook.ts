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

async function handleCheckoutCompleted(session: any) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error("checkout.session.completed sin orderId en metadata");
    return;
  }
  await getSupabase()
    .from("store_orders")
    .update({
      payment_status: "paid",
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

async function handleAsyncPaymentFailed(session: any) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await getSupabase()
    .from("store_orders")
    .update({ payment_status: "failed", updated_at: new Date().toISOString() })
    .eq("id", orderId);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      await handleAsyncPaymentFailed(event.data.object);
      break;
    default:
      console.log("Evento no manejado:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("webhook: env inválido:", rawEnv);
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
