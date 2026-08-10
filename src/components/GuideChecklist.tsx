import { Link } from "@tanstack/react-router";
import { Check, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GuideState } from "@/lib/guides/types";

type Props = {
  storeId: string;
  state: GuideState;
  busyStepId?: string | null;
  onToggle?: (stepId: string, completed: boolean) => void;
  compact?: boolean;
};

/** Lista de pasos del acompañamiento. Reutilizable por cualquier tipo de activo. */
export function GuideChecklist({ storeId, state, busyStepId, onToggle, compact }: Props) {
  const steps = compact ? state.steps.filter((s) => !s.completed).slice(0, 1) : state.steps;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isCurrent = step.id === state.currentStepId;
        return (
          <div
            key={step.id}
            className={`rounded-xl border p-4 ${
              isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                  step.completed ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {step.completed ? <Check className="size-3.5" /> : <Circle className="size-2.5 opacity-40" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold">
                    {compact ? "" : `${i + 1}. `}
                    {step.title}
                  </h3>
                  {isCurrent && <Badge>Tu paso actual</Badge>}
                  {step.auto && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Automático
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                {step.done && (
                  <p className="mt-1 text-xs text-muted-foreground">Sabrás que terminó cuando: {step.done}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.action && (
                    <Button asChild size="sm" variant={isCurrent ? "default" : "outline"}>
                      <Link to={step.action.to} params={{ id: storeId }}>
                        {step.action.label}
                      </Link>
                    </Button>
                  )}
                  {!step.auto && onToggle && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyStepId === step.id}
                      onClick={() => onToggle(step.id, !step.completed)}
                    >
                      {busyStepId === step.id && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                      {step.completed ? "Marcar como pendiente" : "Ya lo hice"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
