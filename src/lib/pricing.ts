/**
 * Reglas de precio de DªTªBLe (client-safe).
 *
 * El costo base es lo que cuesta poner el producto en manos del cliente final:
 * fabricación + envío. Sobre ese costo base se aplica el margen para sugerir
 * el precio de venta. La ganancia del vendedor es siempre
 * `precio de venta − costo base`, y es la única cifra sobre la que DªTªBLe
 * calcula comisión.
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

/** Precio de venta sugerido en centavos MXN a partir del costo base en USD. */
export function suggestedPriceCents(costUsd: number, shippingUsd = 0): number {
  const costMxn = (costUsd + shippingUsd) * USD_MXN;
  const mxn = costMxn * markupFor(costMxn);
  // Redondeo comercial a decenas terminadas en 9 (p. ej. 349, 599).
  const rounded = Math.round(mxn / 10) * 10 - 1;
  return Math.max(MIN_PRICE_CENTS, Math.round(rounded * 100));
}

export type PriceBreakdown = {
  /** Costo de fabricación en USD. */
  costUsd: number;
  /** Costo de envío en USD. */
  shippingUsd: number;
  /** Costo de fabricación en centavos MXN. */
  productionCents: number;
  /** Costo de envío en centavos MXN. */
  shippingCents: number;
  /** Costo base = fabricación + envío, en centavos MXN. */
  costCents: number;
  /** Precio de venta sugerido en centavos MXN. */
  priceCents: number;
  /** Ganancia del vendedor: precio de venta − costo base. */
  marginCents: number;
  marginPct: number;
  markup: number;
};

/** Desglose completo: fabricación, envío, precio final y ganancia del vendedor. */
export function priceBreakdown(costUsd: number, shippingUsd = 0): PriceBreakdown {
  const productionCents = Math.round(costUsd * USD_MXN * 100);
  const shippingCents = Math.round(shippingUsd * USD_MXN * 100);
  const costCents = productionCents + shippingCents;
  const priceCents = suggestedPriceCents(costUsd, shippingUsd);
  const marginCents = priceCents - costCents;
  return {
    costUsd,
    shippingUsd,
    productionCents,
    shippingCents,
    costCents,
    priceCents,
    marginCents,
    marginPct: priceCents > 0 ? Math.round((marginCents / priceCents) * 100) : 0,
    markup: markupFor((costUsd + shippingUsd) * USD_MXN),
  };
}

/** Ganancia del vendedor para un precio dado. Nunca negativa. */
export function sellerMarginCents(priceCents: number, baseCostCents: number): number {
  return Math.max(0, priceCents - baseCostCents);
}
