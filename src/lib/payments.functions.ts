import { createServerFn } from "@tanstack/react-start";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

import { quoteCart, type CostedProduct } from "@/lib/checkout-quote";

type CartLine = { productId: string; qty: number };
type CheckoutResult = { clientSecret: string; orderId: string } | { error: string };

/** Cotización pública del carrito (subtotal, envío y total) para mostrarla antes de pagar. */
export const quoteStoreCart = createServerFn({ method: "POST" })
  .inputValidator((data: { storeId: string; items: CartLine[] }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(data.storeId)) throw new Error("storeId inválido");
    if (!data.items?.length) throw new Error("Carrito vacío");
    for (const it of data.items) {
      if (!/^[0-9a-fA-F-]{36}$/.test(it.productId)) throw new Error("Producto inválido");
      if (!(it.qty > 0 && it.qty <= 100)) throw new Error("Cantidad inválida");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products } = await supabaseAdmin
      .from("store_products")
      .select("id, name, price_cents, stock, store_id, production_cost_cents, shipping_cost_cents, source_provider")
      .in("id", data.items.map((i) => i.productId));
    const q = quoteCart((products || []) as CostedProduct[], data.items, data.storeId);
    if ("error" in q) return q;
    return { subtotalCents: q.subtotalCents, shippingCents: q.shippingCents, totalCents: q.totalCents };
  });

/** Dirección estructurada neutral (opcional; si no llega, se deduce del texto). */
type ShippingInput = {
  address1?: string;
  address2?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  zip?: string;
};

/**
 * Convierte la dirección escrita en una sola línea a la dirección estructurada
 * que necesita el taller de fabricación (calle, ciudad, estado, CP y país).
 *
 * Es deliberadamente tolerante con el formato mexicano habitual
 * ("Calle 123, Col. Centro, Guadalajara, Jalisco, 44100") pero nunca inventa
 * datos: si falta calle, ciudad o código postal devuelve null y el cobro se
 * detiene ANTES de crear el pedido. Nunca se cobra un pedido que no se podría
 * mandar a producción.
 */
function deriveShipping(address: string, provided?: ShippingInput) {
  const text = (address || "").trim();
  const parts = text.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);

  // Código postal: 5 dígitos aislados (MX) o el formato de 4-10 caracteres.
  const zipFromText = text.match(/\b(\d{5})\b/)?.[1] || text.match(/\b([A-Z0-9]{4,10})\s*$/i)?.[1] || "";
  const zip = (provided?.zip?.trim() || zipFromText).replace(/\s+/g, "");

  // Quitar del análisis los tramos que sólo contienen el código postal o el país.
  const meaningful = parts.filter((p) => {
    const bare = p.replace(/\s+/g, "");
    return bare !== zip && !/^(m[eé]xico|mexico|mx)$/i.test(bare);
  });

  const address1 = provided?.address1?.trim() || meaningful[0] || parts[0] || "";
  const stateCode = provided?.stateCode?.trim() || null;
  // La ciudad suele ser el penúltimo tramo útil; con dos tramos, el segundo.
  const city =
    provided?.city?.trim() ||
    (meaningful.length >= 3 ? meaningful[meaningful.length - 2] : meaningful.length === 2 ? meaningful[1] : "");
  const stateName = !stateCode && meaningful.length >= 3 ? meaningful[meaningful.length - 1] : null;
  const countryCode = (provided?.countryCode?.trim() || "MX").toUpperCase();

  if (!address1 || address1.length < 4 || !city || !/^\d{4,10}$/.test(zip)) return null;
  return {
    address1,
    address2: provided?.address2?.trim() || null,
    city,
    stateCode,
    stateName,
    countryCode,
    zip,
  };
}


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
      shipping?: ShippingInput;
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
        .select("id, slug, name, owner_id, status")
        .eq("id", data.storeId)
        .maybeSingle();
      if (!store || store.status !== "published") return { error: "Tienda no disponible" };

      // Cargar productos por id, validar tienda, stock, precio y costos.
      const ids = data.items.map((i) => i.productId);
      const { data: products } = await supabaseAdmin
        .from("store_products")
        .select("id, name, price_cents, stock, store_id, production_cost_cents, shipping_cost_cents, source_provider")
        .in("id", ids);
      const quote = quoteCart((products || []) as CostedProduct[], data.items, store.id as string);
      if ("error" in quote) return quote;
      const orderItems = quote.lines;
      const subtotal = quote.subtotalCents;
      const shippingCents = quote.shippingCents;
      const totalCents = quote.totalCents;
      const shippingLabel = "Envío a domicilio";


      // La dirección se valida ANTES de cobrar: un pedido cobrado que no se
      // puede mandar a fabricar sería dinero recibido sin producto.
      const shippingDetails = deriveShipping(data.customer.address, data.shipping);
      if (!shippingDetails) {
        return {
          error:
            "La dirección está incompleta. Escríbela así: calle y número, colonia, ciudad, estado, código postal.",
        };
      }

      // Insertar orden con service role
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("store_orders")
        .insert({
          store_id: store.id,
          customer_name: data.customer.name.trim(),
          customer_email: data.customer.email.trim().toLowerCase(),
          customer_phone: data.customer.phone?.trim() || null,
          shipping_address: data.customer.address.trim(),
          shipping_details: shippingDetails ?? {},

          items: orderItems,
          subtotal_cents: subtotal,
          shipping_cents: shippingCents,
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
            product_data: { name: shippingLabel },
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
