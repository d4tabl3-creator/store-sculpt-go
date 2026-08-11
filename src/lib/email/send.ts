import { supabase } from "@/integrations/supabase/client";

type SendInput = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
};

/** Envía un correo de la app usando la sesión del cliente. Nunca rompe el flujo. */
export async function sendAppEmail(input: SendInput): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch("/lovable/email/transactional/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Avisa al cliente que su activo quedó listo, con su primer paso. Nunca rompe el flujo. */
export async function notifyAssetReady(storeId: string): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user?.email) return false;
    const { data: store } = await supabase
      .from("stores")
      .select("name, slug")
      .eq("id", storeId)
      .maybeSingle();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return await sendAppEmail({
      templateName: "asset-ready",
      recipientEmail: user.email,
      idempotencyKey: `asset-ready:${storeId}`,
      templateData: {
        name: (user.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0],
        storeName: store?.name,
        storeUrl: store?.slug ? `${origin}/t/${store.slug}` : undefined,
        panelUrl: `${origin}/dashboard`,
        guideUrl: `${origin}/guia/${storeId}`,
        firstStep: "Revisa tu activo y confirma tus productos.",
      },
    });
  } catch {
    return false;
  }
}
