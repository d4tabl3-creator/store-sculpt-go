import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderStatus } from "@/lib/payments.functions";

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
        <div className={"mx-auto grid size-16 place-items-center rounded-full " + (failed ? "bg-destructive/10" : paid ? "bg-green-100" : "bg-muted")}>
          {failed ? <X className="size-8 text-destructive" /> : paid ? <Check className="size-8 text-green-600" /> : <Clock className="size-8 animate-pulse text-muted-foreground" />}
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">
          {failed ? "Pago rechazado" : paid ? "¡Pago recibido!" : "Confirmando pago…"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {failed
            ? "Tu banco rechazó el cobro. Puedes intentar con otra tarjeta."
            : paid
              ? "Gracias por tu compra. El vendedor recibió tu pedido y te contactará."
              : "Estamos validando con Stripe. No cierres esta ventana."}
        </p>
        {session_id && <p className="mt-3 text-xs text-muted-foreground">Ref: {session_id.slice(-12)}</p>}
        <div className="mt-6">
          <Button asChild>
            {slug ? <Link to="/t/$slug" params={{ slug }}>Volver a la tienda</Link> : <Link to="/">Ir al inicio</Link>}
          </Button>
        </div>
      </div>
    </div>
  );
}
