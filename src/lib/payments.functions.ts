import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CartLine = {
  name: string;
  qty: number;
  price_cents: number;
};

type CheckoutResult = { clientSecret: string } | { error: string };

export const createStoreOrderCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      orderId: string;
      storeName: string;
      storeSlug: string;
      customerEmail: string;
      items: CartLine[];
      shippingLabel?: string;
      shippingCents?: number;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[0-9a-fA-F-]{36}$/.test(data.orderId)) throw new Error("orderId inválido");
      if (!data.items?.length) throw new Error("Carrito vacío");
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const lineItems = data.items.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: "mxn",
          product_data: { name: it.name },
          unit_amount: it.price_cents,
        },
      }));

      if (data.shippingCents && data.shippingCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "mxn",
            product_data: { name: `Envío — ${data.shippingLabel || "Envío"}` },
            unit_amount: data.shippingCents,
          },
        });
      }

      const totalCents =
        data.items.reduce((s, i) => s + i.price_cents * i.qty, 0) +
        (data.shippingCents || 0);

      const description = `${data.storeName} — pedido ${data.orderId.slice(0, 8)}`;

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customerEmail,
        payment_intent_data: { description },
        metadata: {
          orderId: data.orderId,
          storeSlug: data.storeSlug,
        },
      });

      // Attach session id to the order (service role — bypasses RLS)
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("store_orders")
        .update({
          stripe_session_id: session.id,
          total_cents: totalCents,
        })
        .eq("id", data.orderId);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createStoreOrderCheckout error:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });
