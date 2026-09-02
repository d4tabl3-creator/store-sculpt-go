/**
 * Capa de presentación de errores.
 *
 * Regla: la interfaz nunca muestra jerga técnica ni nombres de servicios
 * externos. El detalle completo se conserva en console.error para depuración.
 */

const TERMINOS_PROHIBIDOS = [
  "lovable",
  "supabase",
  "printify",
  "printful",
  "stripe",
  "vercel",
  "cloudflare",
  "postgres",
  "postgrest",
  "resend",
  "service_role",
  "api key",
  "api_key",
  "token",
  "jwt",
  "env",
  "environment variable",
  "rls",
  "row level security",
  "500",
  "401",
  "403",
  "fetch",
  "network",
  "undefined",
  "null",
  "sql",
  "database",
  "http",
];

export const MENSAJE_GENERICO =
  "Tuvimos un problema temporal. Intenta de nuevo en unos minutos.";

function esTextoSeguro(texto: string): boolean {
  const t = texto.trim();
  if (!t || t.length > 220) return false;
  const bajo = t.toLowerCase();
  if (TERMINOS_PROHIBIDOS.some((p) => bajo.includes(p))) return false;
  // Mensajes crudos en inglés o con formato técnico
  if (/[{}<>[\]|\\]|\bat\s+\w+\./.test(t)) return false;
  if (!/[áéíóúñ¿¡]/i.test(t) && /\b(the|not|missing|failed|error|invalid|cannot|unable|required)\b/i.test(bajo))
    return false;
  return true;
}

/**
 * Devuelve un mensaje apto para la interfaz.
 * Registra siempre el error original en la consola.
 */
export function mensajeUsuario(error: unknown, respaldo = MENSAJE_GENERICO): string {
  console.error("[datable] error capturado:", error);
  const crudo =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (crudo && esTextoSeguro(crudo)) return crudo;
  return respaldo;
}
