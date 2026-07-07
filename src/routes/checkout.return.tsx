import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string; slug?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
  head: () => ({
    meta: [{ title: "Pedido confirmado" }],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id, slug } = Route.useSearch();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-100">
          <Check className="size-8 text-green-600" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">¡Pago recibido!</h1>
        <p className="mt-2 text-muted-foreground">
          Gracias por tu compra. Te enviaremos un correo con los detalles de tu pedido y el seguimiento del envío.
        </p>
        {session_id && (
          <p className="mt-3 text-xs text-muted-foreground">Ref: {session_id.slice(-12)}</p>
        )}
        <div className="mt-6">
          <Button asChild>
            {slug ? (
              <Link to="/t/$slug" params={{ slug }}>Volver a la tienda</Link>
            ) : (
              <Link to="/">Ir al inicio</Link>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
