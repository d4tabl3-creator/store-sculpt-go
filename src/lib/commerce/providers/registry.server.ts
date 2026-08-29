import type { CommerceProvider, ProviderCapabilities, ProviderId } from "../types";
import { internalProvider } from "./internal.server";
import { shopifyProvider } from "./shopify.server";
import { printfulProvider } from "./printful.server";
import { printifyProvider } from "./printify.server";

const REGISTRY: Partial<Record<ProviderId, CommerceProvider>> = {
  internal: internalProvider,
  shopify: shopifyProvider,
  printful: printfulProvider,
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
 * Elige el mejor conector disponible para una tienda nueva.
 * Orden de preferencia: externo configurado → motor nativo.
 * Nunca falla: siempre existe un conector válido.
 */
export function pickProvider(preferred?: ProviderId): CommerceProvider {
  const candidates: ProviderId[] = preferred
    ? [preferred, "printful", "shopify", "internal"]
    : ["printful", "shopify", "internal"];
  for (const id of candidates) {
    const p = REGISTRY[id];
    if (p && p.isConfigured()) return p;
  }
  return internalProvider;
}

export function listProviders(): CommerceProvider[] {
  return Object.values(REGISTRY) as CommerceProvider[];
}
