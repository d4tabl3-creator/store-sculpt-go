import { createFileRoute } from "@tanstack/react-router";

/**
 * Worker de la cola del orquestador. Pensado para pg_cron o un scheduler
 * externo. Autenticado con la clave publicable del backend (`apikey`).
 */
export const Route = createFileRoute("/api/public/commerce/worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { processJobs } = await import("@/lib/commerce/orchestrator.server");
          const result = await processJobs(20);
          return Response.json(result);
        } catch (err) {
          console.error("commerce worker error:", err);
          return new Response("Worker error", { status: 500 });
        }
      },
    },
  },
});
