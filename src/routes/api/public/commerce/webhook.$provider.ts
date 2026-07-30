import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhooks entrantes del conector de infraestructura.
 * Público por contrato (proveedor externo), verificado por HMAC dentro del handler.
 */
export const Route = createFileRoute("/api/public/commerce/webhook/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const providerId = params.provider;
        if (!["shopify", "woocommerce", "mercadolibre"].includes(providerId)) {
          return new Response("Unknown provider", { status: 404 });
        }
        const rawBody = await request.text();
        try {
          const { handleInboundWebhook } = await import("@/lib/commerce/orchestrator.server");
          const res = await handleInboundWebhook(providerId as never, rawBody, request.headers);
          if (!res.ok) return new Response(res.reason ?? "rejected", { status: 401 });
          return Response.json({ received: true });
        } catch (err) {
          console.error("commerce webhook error:", err);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
