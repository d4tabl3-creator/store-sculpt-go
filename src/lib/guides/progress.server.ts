import type { GuideSignal, GuideState, GuideStepState } from "./types";
import { resolveGuide } from "./registry";
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, any, any>;

/**
 * Calcula el estado real del acompañamiento de un activo combinando:
 *  - señales verificables en la propia base de DªTªBLe;
 *  - pasos que el cliente marcó a mano.
 * No se inventa ninguna comprobación: lo que no es verificable es manual.
 */
export async function computeGuideState(
  supabase: AnyClient,
  storeId: string,
  ownerId: string,
): Promise<GuideState> {
  const { data: store } = await supabase
    .from("stores")
    .select("id, niche, status")
    .eq("id", storeId)
    .maybeSingle();

  const { data: binding } = await supabase
    .from("commerce_store_bindings")
    .select("provider, provisioning_status")
    .eq("store_id", storeId)
    .maybeSingle();

  const guide = resolveGuide({
    assetType: (store?.niche as string | undefined) ?? undefined,
    provider: (binding?.provider as string | undefined) ?? undefined,
  });

  const [{ count: productCount }, { data: pay }, { count: paidCount }, { data: progress }] =
    await Promise.all([
      supabase.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      supabase.from("store_payment_settings").select("payment_email").eq("store_id", storeId).maybeSingle(),
      supabase
        .from("store_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("payment_status", "paid"),
      supabase
        .from("guide_progress")
        .select("completed_steps")
        .eq("store_id", storeId)
        .eq("guide_id", guide.id)
        .maybeSingle(),
    ]);

  const signals: Record<GuideSignal, boolean> = {
    asset_ready: !binding || binding.provisioning_status === "ready",
    has_products: (productCount ?? 0) > 0,
    payment_email_set: Boolean((pay?.payment_email as string | null)?.trim()),
    is_published: store?.status === "published",
    has_paid_order: (paidCount ?? 0) > 0,
  };

  const manual = new Set<string>(((progress?.completed_steps as string[] | null) ?? []) as string[]);

  const steps: GuideStepState[] = guide.steps.map((step) => {
    if (step.check.kind === "auto") {
      const done = signals[step.check.signal];
      return { ...step, completed: done || manual.has(step.id), auto: true };
    }
    return { ...step, completed: manual.has(step.id), auto: false };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const currentStepId = steps.find((s) => !s.completed)?.id ?? null;

  return {
    guideId: guide.id,
    title: guide.title,
    intro: guide.intro,
    help: guide.help,
    steps,
    currentStepId,
    completedCount,
    totalCount: steps.length,
    progress: steps.length ? Math.round((completedCount / steps.length) * 100) : 0,
    finished: currentStepId === null,
  };
}

/** Guarda el avance manual respetando la propiedad del activo. */
export async function saveManualStep(
  supabase: AnyClient,
  storeId: string,
  ownerId: string,
  guideId: string,
  stepId: string,
  completed: boolean,
) {
  const { data: existing } = await supabase
    .from("guide_progress")
    .select("id, completed_steps")
    .eq("store_id", storeId)
    .eq("guide_id", guideId)
    .maybeSingle();

  const current = new Set<string>(((existing?.completed_steps as string[] | null) ?? []) as string[]);
  if (completed) current.add(stepId);
  else current.delete(stepId);

  if (existing?.id) {
    await supabase
      .from("guide_progress")
      .update({ completed_steps: Array.from(current), current_step: stepId })
      .eq("id", existing.id);
  } else {
    await supabase.from("guide_progress").insert({
      store_id: storeId,
      owner_id: ownerId,
      guide_id: guideId,
      completed_steps: Array.from(current),
      current_step: stepId,
    });
  }
}
