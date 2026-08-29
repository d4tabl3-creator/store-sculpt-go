import type { CommerceProvider, ProviderCapabilities, ProviderId } from "../types";
import { internalProvider } from "./internal.server";
import { shopifyProvider } from "./shopify.server";
import { printifyProvider } from "./printify.server";

/**
 * Conectores activos en runtime.
 *
 * `printify` es la infraestructura de fabricación de DªTªBLe Stores.
 * El conector de la infraestructura anterior (printful) permanece en el
 * repositorio como referencia histórica, pero NO se registra: no participa en
 * runtime ni sirve de respaldo.
 */
const REGISTRY: Partial<Record<ProviderId, CommerceProvider>> = {
  internal: internalProvider,
  shopify: shopifyProvider,
  printify: printifyProvider,
};

/** Devuelve el conector pedido o el motor nativo si no existe. */
export function getProvider(id: ProviderId | string | null | undefined): CommerceProvider {
  return REGISTRY[(id as ProviderId) ?? "internal"] ?? internalProvider;
}

/** Capacidades declaradas del conector; el núcleo nunca las asume. */
export function getCapabilities(id: ProviderId | string | null | undefined): ProviderCapabilities {
  return getProvider(id).capabilities;
}

/** ¿Puede este conector hacer X? Punto único de verificación. */
export function supports(id: ProviderId | string | null | undefined, cap: keyof ProviderCapabilities): boolean {
  return getCapabilities(id)[cap] === true;
}

/**
 * Elige el conector de una tienda nueva.
 * Preferencia: fabricación bajo demanda → motor nativo. Nunca falla.
 */
export function pickProvider(preferred?: ProviderId): CommerceProvider {
  const candidates: ProviderId[] = preferred
    ? [preferred, "printify", "internal"]
    : ["printify", "internal"];
  for (const id of candidates) {
    const p = REGISTRY[id];
    if (p && p.isConfigured()) return p;
  }
  return internalProvider;
}

export function listProviders(): CommerceProvider[] {
  return Object.values(REGISTRY) as CommerceProvider[];
}
