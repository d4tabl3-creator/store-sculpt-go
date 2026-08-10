import type { GuideDefinition, GuideMatch } from "./types";
import { guideAssetBasico } from "./content/activo-basico";

/**
 * Registro de guías. Añadir una guía nueva (turismo, servicios, otro
 * proveedor) es añadir un archivo de contenido y una entrada aquí.
 */
const GUIDES: GuideDefinition[] = [guideAssetBasico];

/** Reglas de resolución, de la más específica a la más general. */
const RULES: Array<{ assetType?: string; provider?: string; guideId: string }> = [
  // Ejemplo futuro: { assetType: "turismo", provider: "x", guideId: "turismo-x" },
];

const DEFAULT_GUIDE_ID = guideAssetBasico.id;

export function getGuideById(id: string): GuideDefinition | null {
  return GUIDES.find((g) => g.id === id) ?? null;
}

/** (tipo + proveedor) → (tipo) → por defecto. Nunca falla. */
export function resolveGuide(match: GuideMatch): GuideDefinition {
  const byBoth = RULES.find(
    (r) => r.assetType && r.provider && r.assetType === match.assetType && r.provider === match.provider,
  );
  const byType = RULES.find((r) => r.assetType && !r.provider && r.assetType === match.assetType);
  const id = byBoth?.guideId ?? byType?.guideId ?? DEFAULT_GUIDE_ID;
  return getGuideById(id) ?? guideAssetBasico;
}

export function listGuides(): GuideDefinition[] {
  return GUIDES;
}
