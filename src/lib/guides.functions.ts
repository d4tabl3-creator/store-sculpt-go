import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GuideState } from "@/lib/guides/types";

const UUID = /^[0-9a-fA-F-]{36}$/;

/** Estado del acompañamiento de un activo del cliente. */
export const getGuideState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string }) => {
    if (!UUID.test(data.storeId)) throw new Error("Activo inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<GuideState | null> => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) return null;
    const { computeGuideState } = await import("@/lib/guides/progress.server");
    return computeGuideState(context.supabase as never, data.storeId, context.userId);
  });

/** Marca o desmarca un paso manual del acompañamiento. */
export const setGuideStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storeId: string; guideId: string; stepId: string; completed: boolean }) => {
    if (!UUID.test(data.storeId)) throw new Error("Activo inválido");
    if (!data.guideId?.trim() || !data.stepId?.trim()) throw new Error("Paso inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<GuideState | null> => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) return null;
    const { computeGuideState, saveManualStep } = await import("@/lib/guides/progress.server");
    await saveManualStep(
      context.supabase as never,
      data.storeId,
      context.userId,
      data.guideId,
      data.stepId,
      data.completed,
    );
    return computeGuideState(context.supabase as never, data.storeId, context.userId);
  });
