import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tickProvisioning } from "@/lib/commerce.functions";
import { notifyAssetReady } from "@/lib/email/send";
import { PROVISION_STEPS, type ProvisioningView } from "@/lib/commerce/types";

export const Route = createFileRoute("/_authenticated/preparando/$id")({
  head: () => ({
    meta: [
      { title: "Preparando tu Activo Digital — DªTªBLe" },
      { name: "description", content: "Estamos ensamblando tu tienda automatizada. Tarda menos de un minuto." },
    ],
  }),
  component: Preparando,
});

function Preparando() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<ProvisioningView | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    const startedAt = Date.now();

    async function loop() {
      while (!stopped.current) {
        try {
          const v = await tickProvisioning({ data: { storeId: id } });
          if (stopped.current) return;
          setView(v);
          if (v?.status === "ready") {
            void notifyAssetReady(id);
            setTimeout(() => navigate({ to: "/tienda/$id", params: { id } }), 900);
            return;
          }
          if (v?.status === "failed") return;
        } catch {
          /* reintenta */
        }
        if (Date.now() - startedAt > 60_000) setTooLong(true);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    loop();
    return () => {
      stopped.current = true;
    };
  }, [id, navigate]);

  const currentIndex = Math.max(
    0,
    PROVISION_STEPS.findIndex((s) => s.key === (view?.step ?? "queued")),
  );
  const progress = view?.progress ?? 5;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-2xl flex-col px-4 py-16">
        <div className="rounded-3xl border-2 border-border bg-card p-8 shadow-pop">
          <div className="inline-flex items-center gap-2 rounded-full border border-progress/30 bg-progress-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-progress">
            <Sparkles className="size-3.5" /> Ensamblando
          </div>

          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight">
            Estamos preparando tu Activo Digital
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tu tienda es independiente y sólo tuya. En cuanto termine el ensamblaje podrás
            editarla y publicarla desde aquí mismo.
          </p>

          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs font-semibold text-muted-foreground">{progress}%</div>

          <ol className="mt-6 space-y-3">
            {PROVISION_STEPS.map((s, i) => {
              const done = i < currentIndex || view?.status === "ready";
              const active = i === currentIndex && view?.status !== "ready";
              return (
                <li key={s.key} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-primary" />
                  ) : active ? (
                    <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <span className="size-5 shrink-0 rounded-full border-2 border-border" />
                  )}
                  <span
                    className={
                      done || active ? "font-semibold text-foreground" : "text-muted-foreground"
                    }
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {view?.status === "failed" && (
            <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive-soft p-4">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4" /> No pudimos terminar el ensamblaje
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{view.error}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/dashboard">Ir a mis tiendas</Link>
                </Button>
              </div>
            </div>
          )}

          {tooLong && view?.status !== "failed" && (
            <p className="mt-6 text-sm text-muted-foreground">
              Está tardando un poco más de lo normal. Puedes cerrar esta página: el ensamblaje
              continúa y te esperará en{" "}
              <Link to="/dashboard" className="font-semibold text-primary hover:underline">
                Mis tiendas
              </Link>
              .
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
