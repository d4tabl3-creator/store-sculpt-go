/**
 * Reglas de precio de DªTªBLe (client-safe).
 * El costo base viene del proveedor de fulfillment; aquí se aplica el margen.
 */

/** Tipo de cambio conservador para convertir el costo del proveedor (USD → MXN). */
export const USD_MXN = 18;

/** Margen escalonado: más margen en productos baratos, menos en los caros. */
export const MARGIN_TIERS: Array<{ upToMxn: number; markup: number }> = [
  { upToMxn: 150, markup: 1.9 },
  { upToMxn: 350, markup: 1.65 },
  { upToMxn: 700, markup: 1.45 },
  { upToMxn: Infinity, markup: 1.3 },
];

/** Precio mínimo de venta (evita productos que no cubren comisiones). */
export const MIN_PRICE_CENTS = 9900;

export function markupFor(costMxn: number): number {
  return (MARGIN_TIERS.find((t) => costMxn <= t.upToMxn) ?? MARGIN_TIERS[MARGIN_TIERS.length - 1]).markup;
}

/** Precio de venta sugerido en centavos MXN a partir del costo del proveedor en USD. */
export function suggestedPriceCents(costUsd: number): number {
  const costMxn = costUsd * USD_MXN;
  const mxn = costMxn * markupFor(costMxn);
  // Redondeo comercial a decenas terminadas en 9 (p. ej. 349, 599).
  const rounded = Math.round(mxn / 10) * 10 - 1;
  return Math.max(MIN_PRICE_CENTS, Math.round(rounded * 100));
}

export type PriceBreakdown = {
  costUsd: number;
  costCents: number;
  priceCents: number;
  marginCents: number;
  marginPct: number;
  markup: number;
};

/** Desglose completo: costo del proveedor, precio final y margen resultante. */
export function priceBreakdown(costUsd: number): PriceBreakdown {
  const costCents = Math.round(costUsd * USD_MXN * 100);
  const priceCents = suggestedPriceCents(costUsd);
  const marginCents = priceCents - costCents;
  return {
    costUsd,
    costCents,
    priceCents,
    marginCents,
    marginPct: priceCents > 0 ? Math.round((marginCents / priceCents) * 100) : 0,
    markup: markupFor(costUsd * USD_MXN),
  };
}
