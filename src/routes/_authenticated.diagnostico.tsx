import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { runDiagnostics } from "@/lib/diagnostics.functions";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico interno — DªTªBLe" },
      { name: "description", content: "Panel interno de verificación de la infraestructura de Datable Stores." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Diagnóstico interno — DªTªBLe" },
      { property: "og:description", content: "Panel interno de verificación de infraestructura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagnosticsPage,
});

type Check = { id: string; label: string; status: string; detail: string; data?: Record<string, unknown> };
type Report = { generatedAt: string; configured: boolean; checks: Check[] };

const COLORS: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  warn: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  fail: "bg-destructive/15 text-destructive border-destructive/40",
  skipped: "bg-muted text-muted-foreground border-border",
};

function DiagnosticsPage() {
  const run = useServerFn(runDiagnostics);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productTest, setProductTest] = useState(false);

  async function load(withProductTest: boolean) {
    setLoading(true);
    setError(null);
    try {
      setReport((await run({ data: { productTest: withProductTest } })) as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar el diagnóstico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Salir
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Uso interno</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold uppercase">Diagnóstico de infraestructura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantalla interna. No se muestra a comerciantes ni a clientes finales y nunca expone credenciales.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => load(productTest)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Volver a ejecutar
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={productTest} onChange={(e) => setProductTest(e.target.checked)} />
            Incluir prueba de creación de producto (crea y borra un producto técnico, sin cobro)
          </label>
        </div>

        {error && <p className="mt-6 rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

        {report && (
          <>
            <p className="mt-6 text-xs text-muted-foreground">
              Generado: {new Date(report.generatedAt).toLocaleString("es-MX")}
            </p>
            <div className="mt-3 grid gap-3">
              {report.checks.map((c) => (
                <div key={c.id} className={`rounded-2xl border-2 p-4 ${COLORS[c.status] ?? COLORS.skipped}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{c.label}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide">{c.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{c.detail}</p>
                  {c.data && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-background/60 p-2 text-[11px] text-muted-foreground">
                      {JSON.stringify(c.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
