import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderStatus } from "@/lib/payments.functions";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string; slug?: string; order?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  head: () => ({ meta: [{ title: "Pedido confirmado" }] }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const t = useT();
  const { session_id, slug, order } = Route.useSearch();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    let stop = false;
    async function poll() {
      for (let i = 0; i < 8 && !stop; i++) {
        const r = await getOrderStatus({ data: { orderId: order! } });
        if (r?.payment_status) {
          setStatus(r.payment_status);
          if (r.payment_status === "paid" || r.payment_status === "failed") return;
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
    poll();
    return () => { stop = true; };
  }, [order]);

  const paid = status === "paid" || !order; // sin order asumimos éxito (Stripe redirige tras cobrar)
  const failed = status === "failed";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="max-w-md">
        <div className={"mx-auto grid size-16 place-items-center rounded-full " + (failed ? "bg-destructive/10" : paid ? "bg-success-soft" : "bg-muted")}>
          {failed ? <X className="size-8 text-destructive" /> : paid ? <Check className="size-8 text-success" /> : <Clock className="size-8 animate-pulse text-muted-foreground" />}
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">
          {failed ? t("Pago rechazado", "Payment declined") : paid ? t("¡Pago recibido!", "Payment received!") : t("Confirmando pago…", "Confirming payment…")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {failed
            ? t("Tu banco rechazó el cobro. Puedes intentar con otra tarjeta.", "Your bank declined the charge. You can try another card.")
            : paid
              ? t("Gracias por tu compra. El vendedor recibió tu pedido y te contactará.", "Thanks for your purchase. The seller received your order and will contact you.")
              : t("Estamos confirmando tu pago. No cierres esta ventana.", "We are confirming your payment. Don’t close this window.")}
        </p>
        {session_id && <p className="mt-3 text-xs text-muted-foreground">{t("Ref:", "Ref:")} {session_id.slice(-12)}</p>}
        <div className="mt-6">
          <Button asChild>
            {slug ? <Link to="/t/$slug" params={{ slug }}>{t("Volver a la tienda", "Back to store")}</Link> : <Link to="/">{t("Ir al inicio", "Go home")}</Link>}
          </Button>
        </div>
      </div>
    </div>
  );
}
