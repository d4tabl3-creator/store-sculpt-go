/**
 * Reglas de precio de Dªtªblɛ (client-safe).
 *
 * REGLA COMERCIAL VIGENTE:
 *   productionCents = costo REAL de fabricación que cobra el taller. Es lo que
 *                     Dªtªblɛ le paga al proveedor. NUNCA se le muestra a la
 *                     vendedora.
 *   costo base      = productionCents + 40 %. Es el costo que SÍ ve la
 *                     vendedora y el punto de partida de su precio. Ese 40 %
 *                     es la garantía de Dªtªblɛ en cada venta.
 *   shippingCents   = costo real de envío del proveedor; se cobra al cliente
 *                     como concepto separado y NUNCA forma parte de la
 *                     ganancia ni de la comisión.
 *   ganancia        = precio de venta − costo base.
 *   comisión        = 20 % de esa ganancia (ver plans.ts).
 *   precio mínimo   = costo base. Por debajo, el producto no está en
 *                     existencia.
 *
 * Ejemplo: el taller cobra $100. La vendedora ve $140 como su costo. Si vende
 * en $200, su ganancia es $60 y la comisión $12. Dªtªblɛ gana $52: los $40 de
 * la garantía más los $12 de comisión.
 */

/** Tipo de cambio conservador para convertir el costo del proveedor (USD → MXN). */
export const USD_MXN = 18;

/**
 * Garantía de Dªtªblɛ sobre el costo real de fabricación: 40 % en todos los
 * productos, sin excepción ni escalones. Es el colchón que cubre reposiciones,
 * reclamos y devoluciones, y el piso que sostiene la operación.
 */
export const MARGIN_FLOOR = 1.4;

/**
 * Costo base: lo que ve la vendedora y el punto de partida de su precio.
 * Es el costo real del taller más la garantía de Dªtªblɛ.
 */
export function baseCostCents(productionCents: number): number {
  return Math.ceil(Math.max(0, productionCents) * MARGIN_FLOOR);
}

/** Precio mínimo vendible: el costo base. Por debajo no hay existencia. */
export function minSellablePriceCents(productionCents: number): number {
  return baseCostCents(productionCents);
}

/** Margen sugerido escalonado: más margen en productos baratos, menos en los caros. */
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
 * Precio de venta sugerido (centavos MXN) a partir del costo REAL de
 * fabricación en USD. La sugerencia se calcula sobre el COSTO BASE, no sobre
 * el costo real. El envío no participa: se cobra aparte al cliente. El
 * sugerido nunca queda por debajo del costo base.
 */
export function suggestedPriceCents(costUsd: number, _shippingUsd = 0): number {
  const productionCents = Math.round(costUsd * USD_MXN * 100);
  const baseCents = baseCostCents(productionCents);
  const baseMxn = baseCents / 100;
  const mxn = baseMxn * markupFor(baseMxn);
  // Redondeo comercial a decenas terminadas en 9 (p. ej. 349, 599).
  const rounded = Math.max(0, Math.round(mxn / 10) * 10 - 1);
  return Math.max(baseCents, Math.round(rounded * 100));
}

export type PriceBreakdown = {
  /** Costo real de fabricación en USD. */
  costUsd: number;
  /** Costo de envío en USD. */
  shippingUsd: number;
  /** Costo REAL de fabricación en centavos MXN. Uso interno. */
  productionCents: number;
  /** Costo de envío en centavos MXN. */
  shippingCents: number;
  /** Costo BASE en centavos MXN: lo que ve la vendedora. Es el precio mínimo. */
  costCents: number;
  /** Precio de venta sugerido en centavos MXN. */
  priceCents: number;
  /** Ganancia de la vendedora: precio de venta − costo base. */
  marginCents: number;
  marginPct: number;
  markup: number;
};

/** Desglose completo: costo real, costo base, envío, precio sugerido y ganancia. */
export function priceBreakdown(costUsd: number, shippingUsd = 0): PriceBreakdown {
  const productionCents = Math.round(costUsd * USD_MXN * 100);
  const shippingCents = Math.round(shippingUsd * USD_MXN * 100);
  const costCents = baseCostCents(productionCents);
  const priceCents = suggestedPriceCents(costUsd);
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
    markup: markupFor(costCents / 100),
  };
}

/** Ganancia de la vendedora para un precio dado: precio − costo base. Nunca negativa. */
export function sellerMarginCents(priceCents: number, productionCents: number): number {
  return Math.max(0, priceCents - baseCostCents(productionCents));
}

export type PriceValidation = { ok: true } | { ok: false; code: "PRICE_INVALID" | "PRICE_BELOW_COST"; minCents: number };

/**
 * Regla única de validación de precio (usarla en servidor y en interfaz):
 * precio > 0 y precio >= costo base.
 */
export function validatePrice(priceCents: number | null | undefined, productionCents: number): PriceValidation {
  const p = Number(priceCents);
  const minimo = minSellablePriceCents(productionCents);
  if (!Number.isFinite(p) || p <= 0) return { ok: false, code: "PRICE_INVALID", minCents: Math.max(1, minimo) };
  if (p < minimo) return { ok: false, code: "PRICE_BELOW_COST", minCents: minimo };
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
    baseCostCents: baseCostCents(input.productionCents) * qty,
    sellerMarginCents: margin,
    commissionCents,
    sellerNetMarginCents: margin - commissionCents,
  };
}
