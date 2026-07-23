import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CartLine = { productId: string; qty: number };
type CheckoutResult = { clientSecret: string; orderId: string } | { error: string };

/**
 * SEGURO: el cliente sólo manda productIds+qty. El servidor lee precios,
 * envío y stock desde la BD, valida y recalcula todo. El total NUNCA viene
 * del cliente.
 */
export const startStoreCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      storeId: string;
      items: CartLine[];
      shippingId?: string;
      customer: {
        name: string;
        email: string;
        phone?: string;
        address: string;
        notes?: string;
      };
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[0-9a-fA-F-]{36}$/.test(data.storeId)) throw new Error("storeId inválido");
      if (!data.items?.length) throw new Error("Carrito vacío");
      for (const it of data.items) {
        if (!/^[0-9a-fA-F-]{36}$/.test(it.productId)) throw new Error("Producto inválido");
        if (!(it.qty > 0 && it.qty <= 100)) throw new Error("Cantidad inválida");
      }
      if (!data.customer?.name?.trim()) throw new Error("Nombre requerido");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer?.email || "")) throw new Error("Email inválido");
      if (!data.customer?.address?.trim()) throw new Error("Dirección requerida");
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Cargar tienda publicada
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, slug, name, owner_id, status, shipping_options")
        .eq("id", data.storeId)
        .maybeSingle();
      if (!store || store.status !== "published") return { error: "Tienda no disponible" };

      // Cargar productos por id, validar que sean de esta tienda y con stock
      const ids = data.items.map((i) => i.productId);
      const { data: products } = await supabaseAdmin
        .from("store_products")
        .select("id, name, price_cents, stock, store_id")
        .in("id", ids);
      const byId = new Map((products || []).map((p) => [p.id as string, p]));

      const orderItems: Array<{ productId: string; name: string; qty: number; price_cents: number }> = [];
      let subtotal = 0;
      for (const it of data.items) {
        const p = byId.get(it.productId);
        if (!p || p.store_id !== store.id) return { error: "Producto no válido en esta tienda" };
        if ((p.stock as number) < it.qty) return { error: `Sin stock suficiente de ${p.name}` };
        orderItems.push({
          productId: p.id as string,
          name: p.name as string,
          qty: it.qty,
          price_cents: p.price_cents as number,
        });
        subtotal += (p.price_cents as number) * it.qty;
      }

      // Envío validado contra shipping_options guardadas en la tienda
      const shippingOptions = (store.shipping_options as Array<{ id: string; label: string; price_cents: number }>) || [];
      let shippingLabel = "";
      let shippingCents = 0;
      if (data.shippingId) {
        const s = shippingOptions.find((o) => o.id === data.shippingId);
        if (!s) return { error: "Método de envío inválido" };
        shippingLabel = s.label;
        shippingCents = s.price_cents;
      }
      const totalCents = subtotal + shippingCents;

      // Insertar orden con service role
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("store_orders")
        .insert({
          store_id: store.id,
          customer_name: data.customer.name.trim(),
          customer_email: data.customer.email.trim().toLowerCase(),
          customer_phone: data.customer.phone?.trim() || null,
          shipping_address: `${data.customer.address.trim()}${shippingLabel ? ` · ${shippingLabel}` : ""}`,
          items: orderItems,
          total_cents: totalCents,
          notes: data.customer.notes?.trim() || null,
          status: "pending",
          payment_status: "pending",
        })
        .select("id")
        .single();
      if (orderErr || !order) return { error: orderErr?.message || "No se pudo crear el pedido" };

      // Stripe
      const stripe = createStripeClient(data.environment);
      const lineItems = orderItems.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: "mxn",
          product_data: { name: it.name },
          unit_amount: it.price_cents,
        },
      }));
      if (shippingCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "mxn",
            product_data: { name: `Envío — ${shippingLabel}` },
            unit_amount: shippingCents,
          },
        });
      }
      const description = `${store.name} — pedido ${(order.id as string).slice(0, 8)}`;

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.customer.email.trim().toLowerCase(),
        payment_intent_data: { description },
        metadata: {
          kind: "store_order",
          orderId: order.id as string,
          storeId: store.id as string,
          storeSlug: store.slug as string,
          merchantId: store.owner_id as string,
        },
      });

      await supabaseAdmin
        .from("store_orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id as string);

      return { clientSecret: session.client_secret ?? "", orderId: order.id as string };
    } catch (error) {
      console.error("startStoreCheckout error:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Consulta pública del estado de un pedido por id (para la página de retorno). */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.orderId)) throw new Error("orderId inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("store_orders")
      .select("id, payment_status, status, total_cents")
      .eq("id", data.orderId)
      .maybeSingle();
    return order || null;
  });
