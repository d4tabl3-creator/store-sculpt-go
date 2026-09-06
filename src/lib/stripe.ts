import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Los pagos aún no están configurados en esta build. Completa el go-live de pagos para aceptar cobros reales.",
  );
}

/**
 * ¿Se puede cobrar en este sitio? Si no hay cobro configurado, la tienda NO
 * debe aceptar pedidos: un pedido sin cobro es fabricación regalada.
 */
export function paymentsAvailable(): boolean {
  return !!clientToken && (clientToken.startsWith("pk_test_") || clientToken.startsWith("pk_live_"));
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

