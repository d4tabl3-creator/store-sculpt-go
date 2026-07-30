import type { CommerceProvider, ProviderId } from "../types";
import { internalProvider } from "./internal.server";
import { shopifyProvider } from "./shopify.server";

const REGISTRY: Partial<Record<ProviderId, CommerceProvider>> = {
  internal: internalProvider,
  shopify: shopifyProvider,
};

/** Devuelve el conector pedido o el motor nativo si no existe. */
export function getProvider(id: ProviderId | string | null | undefined): CommerceProvider {
  return REGISTRY[(id as ProviderId) ?? "internal"] ?? internalProvider;
}

/**
 * Elige el mejor conector disponible para una tienda nueva.
 * Orden de preferencia: externo configurado → motor nativo.
 * Nunca falla: siempre existe un conector válido.
 */
export function pickProvider(preferred?: ProviderId): CommerceProvider {
  const candidates: ProviderId[] = preferred
    ? [preferred, "shopify", "internal"]
    : ["shopify", "internal"];
  for (const id of candidates) {
    const p = REGISTRY[id];
    if (p && p.isConfigured()) return p;
  }
  return internalProvider;
}

export function listProviders(): CommerceProvider[] {
  return Object.values(REGISTRY) as CommerceProvider[];
}
