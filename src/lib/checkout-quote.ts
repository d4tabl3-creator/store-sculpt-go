/**
 * Cotización de carrito (client-safe, sin dependencias de servidor).
 * Regla comercial vigente (29 ago 2026):
 *   Productos (subtotal) = Σ precio × cantidad
 *   Envío                = Σ costo real de envío del proveedor × cantidad
 *   Total                = subtotal + envío
 * El envío se muestra y cobra como concepto separado; nunca entra en la
 * ganancia ni en la comisión. Cada línea congela los costos del proveedor
 * (snapshot) para que el ledger use exactamente lo que costaba al vender.
 */
import { validatePrice } from "@/lib/pricing";

export type CartLine = { productId: string; qty: number };

export type CostedProduct = {
  id: string;
  name: string;
  price_cents: number;
  stock: number;
  store_id: string;
  production_cost_cents: number;
  shipping_cost_cents: number;
  source_provider: string | null;
};

export function quoteCart(
  products: CostedProduct[],
  items: CartLine[],
  storeId: string,
): { error: string } | {
  lines: Array<{
    productId: string;
    name: string;
    qty: number;
    price_cents: number;
    production_cost_cents: number;
    shipping_cost_cents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
} {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: Array<{
    productId: string;
    name: string;
    qty: number;
    price_cents: number;
    production_cost_cents: number;
    shipping_cost_cents: number;
  }> = [];
  let subtotalCents = 0;
  let shippingCents = 0;
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || p.store_id !== storeId) return { error: "Producto no válido en esta tienda" };
    if (p.stock < it.qty) return { error: `Sin stock suficiente de ${p.name}` };
    // Defensa en profundidad: aunque la BD ya lo impide, un producto con
    // precio inválido jamás se cobra.
    const check = validatePrice(p.price_cents, p.production_cost_cents);
    if (!check.ok) return { error: `El producto "${p.name}" no está disponible por ahora.` };
    if ((p.source_provider ?? "internal") !== "internal" && p.production_cost_cents <= 0) {
      return { error: `El producto "${p.name}" no está disponible por ahora.` };
    }
    lines.push({
      productId: p.id,
      name: p.name,
      qty: it.qty,
      price_cents: p.price_cents,
      production_cost_cents: p.production_cost_cents,
      shipping_cost_cents: p.shipping_cost_cents,
    });
    subtotalCents += p.price_cents * it.qty;
    shippingCents += p.shipping_cost_cents * it.qty;
  }
  return { lines, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
