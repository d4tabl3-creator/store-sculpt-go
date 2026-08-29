import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Diagnóstico interno. Sólo para cuentas con rol de administrador:
 * ningún comerciante ni cliente final debe ver esta información.
 */
export const runDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productTest?: boolean } = {}) => ({ productTest: data?.productTest === true }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Sección interna: se requiere rol de administrador.");

    const { runCommerceDiagnostics } = await import("@/lib/diagnostics.server");
    return runCommerceDiagnostics({ productTest: data.productTest });
  });
