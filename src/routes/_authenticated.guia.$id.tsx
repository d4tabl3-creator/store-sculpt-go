import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideChecklist } from "@/components/GuideChecklist";
import { getGuideState, setGuideStep } from "@/lib/guides.functions";
import { useLang, useT } from "@/lib/i18n";
import type { GuideState } from "@/lib/guides/types";

export const Route = createFileRoute("/_authenticated/guia/$id")({
  head: () => ({
    meta: [
      { title: "Guía de inicio — DªTªBLe" },
      { name: "description", content: "Tu recorrido paso a paso para dejar tu activo listo para vender." },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  const t = useT();
  const { lang } = useLang();
  const { id } = Route.useParams();
  const [state, setState] = useState<GuideState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getGuideState({ data: { storeId: id } })
      .then(setState)
      .finally(() => setLoading(false));
  }, [id]);

  async function toggle(stepId: string, completed: boolean) {
    if (!state) return;
    setBusy(stepId);
    try {
      const next = await setGuideStep({
        data: { storeId: id, guideId: state.guideId, stepId, completed },
      });
      if (next) setState(next);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 size-4" /> {t("Volver al panel", "Back to dashboard")}
          </Link>
        </Button>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !state ? (
          <p className="text-muted-foreground">{t("No encontramos este activo.", "We couldn't find this asset.")}</p>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-pop">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wide">{t("Acompañamiento", "Guidance")}</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold">{lang === "en" && state.titleEn ? state.titleEn : state.title}</h1>
              <p className="mt-2 text-muted-foreground">{lang === "en" && state.introEn ? state.introEn : state.intro}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-progress transition-all" style={{ width: `${state.progress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t(`${state.completedCount} de ${state.totalCount} pasos`, `${state.completedCount} of ${state.totalCount} steps`)}
                </span>
                <a
                  href={`/api/public/guia/${state.guideId}.md`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <Download className="size-3.5" /> {t("Descargar guía", "Download guide")}
                </a>
              </div>
            </div>

            <div className="mt-6">
              <GuideChecklist storeId={id} state={state} busyStepId={busy} onToggle={toggle} />
            </div>

            <p className="mt-8 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {lang === "en" && state.helpEn ? state.helpEn : state.help}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
