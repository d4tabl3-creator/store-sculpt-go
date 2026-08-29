/**
 * Reglas de precio de DªTªBLe (client-safe).
 *
 * REGLA COMERCIAL (29 ago 2026):
 *   productionCents = costo real de fabricación del proveedor.
 *   shippingCents   = costo real de envío del proveedor; se cobra al cliente
 *                     como concepto separado y NUNCA forma parte de la ganancia.
 *   ganancia        = precio de venta del producto − fabricación.
 *   comisión        = 20 % de la ganancia (ver plans.ts). Jamás sobre
 *                     fabricación, envío ni total cobrado.
 *   precio mínimo   = fabricación. No existe ningún mínimo artificial.
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

export function markupFor(costMxn: number): number {
  return (MARGIN_TIERS.find((t) => costMxn <= t.upToMxn) ?? MARGIN_TIERS[MARGIN_TIERS.length - 1]).markup;
}

/**
 * Precio de venta sugerido (centavos MXN) a partir del costo de FABRICACIÓN en
 * USD. El envío no participa: se cobra aparte al cliente. El sugerido nunca
 * queda por debajo de la fabricación.
 */
export function suggestedPriceCents(costUsd: number, _shippingUsd = 0): number {
  const costMxn = costUsd * USD_MXN;
  const mxn = costMxn * markupFor(costMxn);
  // Redondeo comercial a decenas terminadas en 9 (p. ej. 349, 599).
  const rounded = Math.max(0, Math.round(mxn / 10) * 10 - 1);
  const productionCents = Math.round(costMxn * 100);
  return Math.max(productionCents, Math.round(rounded * 100));
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
  /**
   * Precio mínimo del producto = fabricación. (Nombre conservado por
   * compatibilidad; ya NO incluye envío.)
   */
  costCents: number;
  /** Precio de venta sugerido en centavos MXN. */
  priceCents: number;
  /** Ganancia del vendedor: precio de venta − fabricación. */
  marginCents: number;
  marginPct: number;
  markup: number;
};

/** Desglose completo: fabricación, envío, precio final y ganancia del vendedor. */
export function priceBreakdown(costUsd: number, shippingUsd = 0): PriceBreakdown {
  const productionCents = Math.round(costUsd * USD_MXN * 100);
  const shippingCents = Math.round(shippingUsd * USD_MXN * 100);
  const costCents = productionCents;
  const priceCents = suggestedPriceCents(costUsd);
  const marginCents = priceCents - productionCents;
  return {
    costUsd,
    shippingUsd,
    productionCents,
    shippingCents,
    costCents,
    priceCents,
    marginCents,
    marginPct: priceCents > 0 ? Math.round((marginCents / priceCents) * 100) : 0,
    markup: markupFor(costUsd * USD_MXN),
  };
}

/** Ganancia del vendedor para un precio dado: precio − fabricación. Nunca negativa. */
export function sellerMarginCents(priceCents: number, productionCents: number): number {
  return Math.max(0, priceCents - productionCents);
}

export type PriceValidation = { ok: true } | { ok: false; code: "PRICE_INVALID" | "PRICE_BELOW_COST"; minCents: number };

/**
 * Regla única de validación de precio (usarla en servidor y en interfaz):
 * precio > 0 y precio >= fabricación. La base de datos aplica la misma regla.
 */
export function validatePrice(priceCents: number | null | undefined, productionCents: number): PriceValidation {
  const p = Number(priceCents);
  if (!Number.isFinite(p) || p <= 0) return { ok: false, code: "PRICE_INVALID", minCents: Math.max(1, productionCents) };
  if (p < productionCents) return { ok: false, code: "PRICE_BELOW_COST", minCents: productionCents };
  return { ok: true };
}

/** Desglose de una venta con la regla comercial vigente. */
export function saleBreakdown(input: {
  priceCents: number;
  productionCents: number;
  shippingCents: number;
  qty?: number;
  commissionBps: number;
}) {
  const qty = input.qty ?? 1;
  const margin = sellerMarginCents(input.priceCents, input.productionCents) * qty;
  const commissionCents = Math.floor((margin * input.commissionBps) / 10000);
  return {
    subtotalCents: input.priceCents * qty,
    shippingCents: input.shippingCents * qty,
    totalCents: (input.priceCents + input.shippingCents) * qty,
    productionCents: input.productionCents * qty,
    sellerMarginCents: margin,
    commissionCents,
    sellerNetMarginCents: margin - commissionCents,
  };
}
