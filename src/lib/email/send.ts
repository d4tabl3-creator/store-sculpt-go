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
