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
    name: "Starter",
    priceLabel: "$299 MXN / mes",
    monthlyMxn: 299,
    commissionLabel: "10% por venta",
    tagline: "Para lanzar hoy mismo.",
    maxStores: 1,
    features: [
      "1 tienda publicada",
      "Kits pre-armados",
      "Checkout con Stripe integrado",
      "Panel de pedidos",
      "Datos bancarios para recibir tu comisión",
    ],
  },
  {
    id: "pro",
    priceId: "pro_monthly",
    name: "Pro",
    priceLabel: "$499 MXN / mes",
    monthlyMxn: 499,
    commissionLabel: "10% por venta",
    tagline: "Para vender en serio.",
    maxStores: null,
    featured: true,
    features: [
      "Tiendas ilimitadas",
      "Todo lo de Starter",
      "Dominio propio (próximamente)",
      "Prioridad de soporte",
    ],
  },
];

export const PLATFORM_COMMISSION_BPS = 1000; // 10% — sincronizado con apply_paid_order default

export function planLimit(plan: PlanId | null): number | null {
  if (plan === "pro") return null;
  if (plan === "starter") return 1;
  return 0;
}
