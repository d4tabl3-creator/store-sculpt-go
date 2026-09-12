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

/**
 * REGLAS DE OPERACIÓN — filtro único e innegociable.
 *
 * Un producto sólo puede venderse si cumple TODAS. Si falla cualquiera, no
 * está en existencia y no se discute: ni con la vendedora, ni con la clienta,
 * ni con el resto del sistema. Estas reglas existen para que un error nuestro
 * en cualquier otra parte del código jamás termine en una venta que no
 * podamos sostener.
 *
 *   1. Costo de fabricación mayor que cero. Sin costo real no sabemos cuánto
 *      nos cuesta producirlo.
 *   2. Costo de envío mayor que cero. Un envío en cero significa que no
 *      pudimos cotizarlo, y enviar a ciegas sale de nuestra bolsa.
 *   3. Precio igual o mayor al piso de margen del 40 % sobre la fabricación.
 *      Ese margen es el colchón que cubre reposiciones y reclamos.
 *
 * Devuelve el motivo interno (para registro y diagnóstico) o null si el
 * producto es vendible. El motivo NUNCA se muestra al cliente.
 */
export function motivoNoVendible(p: CostedProduct): string | null {
  const externo = (p.source_provider ?? "internal") !== "internal";
  if (externo && !(p.production_cost_cents > 0)) return "sin costo de fabricación";
  if (externo && !(p.shipping_cost_cents > 0)) return "sin costo de envío";
  if (!validatePrice(p.price_cents, p.production_cost_cents).ok) {
    return "precio por debajo del piso de margen";
  }
  return null;
}

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
    // Filtro único de operación. Ver motivoNoVendible.
    const motivo = motivoNoVendible(p);
    if (motivo) {
      console.warn(`producto no vendible (${p.id}): ${motivo}`);
      return { error: `El producto "${p.name}" no está en existencia.` };
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
