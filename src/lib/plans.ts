// Plan constants — client-safe. Precios reales manejados por Stripe (price ids abajo).

export type PlanId = "starter" | "pro";

export const PLANS: Array<{
  id: PlanId;
  priceId: string;
  name: string;
  priceLabel: string;
  monthlyMxn: number;
  commissionLabel: string;
  tagline: string;
  features: string[];
  maxStores: number | null; // null = ilimitado
  featured?: boolean;
}> = [
  {
    id: "starter",
    priceId: "starter_monthly",
    name: "Gratis",
    priceLabel: "$0 MXN / mes",
    monthlyMxn: 0,
    commissionLabel: "20% de tu ganancia",
    tagline: "Empieza sin invertir.",
    maxStores: null,
    features: [
      "Sin mensualidad",
      "20% de comisión sobre tu ganancia",
      "Productos personalizados ilimitados",
      "Producción y envío incluidos",

      "Checkout integrado",
      "Panel de pedidos",
    ],
  },
  {
    id: "pro",
    priceId: "pro_monthly",
    name: "Pro",
    priceLabel: "$499 MXN / mes",
    monthlyMxn: 499,
    commissionLabel: "0% por venta",
    tagline: "Conserva el 100% de tus ventas.",
    maxStores: null,
    featured: true,
    features: [
      "$499 MXN al mes",
      "0% de comisión por venta",
      "Todo lo de Gratis",
      "Prioridad de soporte",
    ],
  },
];

export const PLATFORM_COMMISSION_BPS = 0; // 0% para plan Pro
export const FREE_COMMISSION_BPS = 2000; // 20% sobre la ganancia del vendedor
export const FREE_DRAFT_STORE_LIMIT = 1; // Sin plan puedes armar 1 tienda

export function planLimit(plan: PlanId | null): number | null {
  if (plan === "pro") return null;
  if (plan === "starter") return null;
  // Sin plan: puedes crear 1 tienda (publicable con comisión sobre la ganancia)
  return FREE_DRAFT_STORE_LIMIT;
}

// Todos pueden publicar; la diferencia es el % de comisión.
export function canPublish(_plan: PlanId | null): boolean {
  return true;
}

export function commissionBpsFor(plan: PlanId | null): number {
  if (plan === "pro") return PLATFORM_COMMISSION_BPS;
  // starter (modalidad gratuita) y sin plan comparten 20% sobre la ganancia
  return FREE_COMMISSION_BPS;
}

export function commissionLabelFor(plan: PlanId | null): string {
  return plan === "pro" ? "0% de comisión" : "20% de tu ganancia";
}
