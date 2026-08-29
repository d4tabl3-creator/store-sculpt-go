/**
 * Caché persistente de datos costosos del proveedor de fabricación.
 *
 * Server-only. Antes estos datos vivían sólo en memoria del proceso: cada
 * arranque en frío volvía a consultar al proveedor (costos, envíos, catálogo)
 * y eso dispara los límites de uso (429). Ahora se guardan en la base y la
 * memoria funciona sólo como primer nivel.
 */

const memory = new Map<string, { at: number; expiresAt: number; value: unknown }>();

const PROVIDER = "printify";

function memKey(key: string) {
  return `${PROVIDER}:${key}`;
}

/** Lee un valor vigente; devuelve null si no existe o ya expiró. */
export async function readCache<T>(key: string): Promise<T | null> {
  const hit = memory.get(memKey(key));
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("provider_cost_cache")
      .select("payload, expires_at")
      .eq("provider", PROVIDER)
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    const expiresAt = new Date(data.expires_at as string).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    const value = (data.payload as { v?: unknown })?.v;
    if (value === undefined) return null;
    memory.set(memKey(key), { at: Date.now(), expiresAt, value });
    return value as T;
  } catch {
    return null;
  }
}

/** Guarda un valor con expiración. Nunca lanza: la caché no puede romper el flujo. */
export async function writeCache(key: string, value: unknown, ttlMs: number): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  memory.set(memKey(key), { at: Date.now(), expiresAt, value });
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("provider_cost_cache").upsert(
      {
        provider: PROVIDER,
        cache_key: key,
        payload: { v: value } as never,
        expires_at: new Date(expiresAt).toISOString(),
      } as never,
      { onConflict: "provider,cache_key" },
    );
  } catch {
    /* la caché es best-effort */
  }
}

/**
 * Devuelve el valor en caché o lo calcula una sola vez.
 * Las llamadas simultáneas comparten la misma promesa: nunca se consulta dos
 * veces al proveedor por el mismo dato al mismo tiempo.
 */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>, force = false): Promise<T> {
  if (!force) {
    const hit = await readCache<T>(key);
    if (hit !== null) return hit;
  }
  const running = inflight.get(key);
  if (running && !force) return running as Promise<T>;

  const promise = (async () => {
    const value = await load();
    await writeCache(key, value, ttlMs);
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise as Promise<T>;
}

/** Serializa/deserializa mapas numéricos (costos por variante) para JSON. */
export function mapToRecord(map: Map<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of map) out[String(k)] = v;
  return out;
}

export function recordToMap(rec: Record<string, number> | null | undefined): Map<number, number> {
  const map = new Map<number, number>();
  for (const [k, v] of Object.entries(rec ?? {})) {
    const id = Number(k);
    if (Number.isFinite(id) && typeof v === "number") map.set(id, v);
  }
  return map;
}
