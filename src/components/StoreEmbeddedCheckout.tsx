import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createStoreOrderCheckout } from "@/lib/payments.functions";

type Item = { name: string; qty: number; price_cents: number };

interface Props {
  orderId: string;
  storeName: string;
  storeSlug: string;
  customerEmail: string;
  items: Item[];
  shippingLabel?: string;
  shippingCents?: number;
}

export function StoreEmbeddedCheckout(props: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createStoreOrderCheckout({
      data: {
        ...props,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&slug=${props.storeSlug}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe no devolvió clientSecret");
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="min-h-[400px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
