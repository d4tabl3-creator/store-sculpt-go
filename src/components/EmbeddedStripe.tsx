import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useMemo } from "react";
import { getStripe } from "@/lib/stripe";

/**
 * Componente genérico: recibe una función que devuelve el clientSecret.
 * Estabilizamos la referencia con useMemo para no remount del provider.
 */
export function EmbeddedStripe({
  fetchClientSecret,
  minHeight = 480,
}: {
  fetchClientSecret: () => Promise<string>;
  minHeight?: number;
}) {
  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  return (
    <div style={{ minHeight }}>
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
