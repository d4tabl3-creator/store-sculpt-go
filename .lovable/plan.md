# Plan: cobrar el envío real y pagar a las vendedoras

Dos entregables de dinero. Se ejecutan por fases, con autorización tuya en cada una.

## Lo que confirmé hoy (leído en el código y en la base)

- Los productos guardan un costo de envío que casi siempre quedó en cero: **20 de 21 productos tienen envío = $0**. Por eso todos los pedidos cobran envío $0.
- El cobro del envío hoy sale de ese número guardado en el producto, no de una cotización real por destino (`src/lib/checkout-quote.ts` suma `shipping_cost_cents` del producto).
- **Ya existe** una función que pide al proveedor la tarifa real de envío según dirección y artículos (`estimateShipping` en `src/lib/commerce/providers/printify.server.ts`), pero **nadie la llama durante la compra**. Ese es el hueco central del Entregable A.
- El asiento contable **sí se crea**: hay 1 registro en `commission_ledger`, el del pedido BAG ELARA — venta $829.00, fabricación $569.34, ganancia $259.66, comisión $51.93, neto a la vendedora $207.73, envío cobrado $0.00, estado pendiente. No está vacía: sólo hay un pedido pagado en toda la base, y por eso hay un solo asiento.
- El asiento se crea en el aviso de pago confirmado (`src/routes/api/public/payments/webhook.ts`), que llama a la función de base `apply_paid_order`. Con la pasarela caída no entran pagos, así que no se generan más asientos.
- Las pantallas de datos bancarios y de liquidaciones **ya existen** en forma básica: `src/routes/_authenticated.cuenta.tsx` (banco, CLABE, beneficiario, RFC, con validación de 18 dígitos en `src/lib/account.functions.ts`) y `src/routes/_authenticated.admin.tsx` (listado de pagos y marcar como pagado). Falta el desglose por venta y el detalle real de lo adeudado.

Conclusión sobre el caso BAG ELARA: la pérdida no viene del cálculo de la ganancia (esa regla está bien escrita), viene de que **el envío real nunca se cotizó ni se cobró**. Corregir el Entregable A elimina la pérdida por venta.

---

# ENTREGABLE A — Cotizar y cobrar el envío real

## Fase A1 — Cotización real en el momento de la compra
- Al capturar la dirección, el sitio pide al proveedor la tarifa real para ese destino y esos artículos, y la muestra como línea separada "Envío" antes de pagar.
- Si la dirección está incompleta, se muestra "Completa tu dirección para calcular el envío" y el botón de pagar queda inactivo.
- Si el proveedor no responde, **no se vende a ciegas**: mensaje "No pudimos calcular el envío a esta dirección. Inténtalo en unos minutos." y sin botón de pagar.
- Al cambiar código postal, estado o país, la cotización se recalcula automáticamente (con una pequeña espera para no consultar en cada tecla).
- Archivos: `src/lib/payments.functions.ts`, `src/lib/checkout-quote.ts`, `src/lib/commerce/providers/registry.server.ts`, `src/routes/t.$slug.tsx`.
- Sin base de datos.
- Complejidad: media-alta. Riesgo: latencia del proveedor durante la compra (se mitiga con caché y con un tiempo máximo de espera).

## Fase A2 — Cobro y registro fieles
- El total que se cobra usa la cotización recién obtenida, no un número guardado antes.
- El envío cobrado se guarda en el pedido y, al confirmarse el pago, en el asiento contable (`shipping_charged_cents` y `shipping_cost_cents`).
- La ganancia y la comisión se siguen calculando **sin el envío**, como ya dice la regla; se verifica con un caso equivalente a BAG ELARA.
- Archivos: `src/lib/payments.functions.ts`, `src/routes/api/public/payments/webhook.ts`.
- Toca base de datos: sí, sólo para que la función `apply_paid_order` copie el envío cobrado y el costo real de envío al asiento (una migración pequeña, sin cambiar estructura).
- Complejidad: media.

## Fase A3 — Caché y consistencia
- Las tarifas por destino se guardan un tiempo razonable (por ejemplo 6 horas) usando la caché de costos que ya existe, para no consultar de más.
- Antes de cobrar, se vuelve a validar la cotización guardada; si expiró o cambió, se recalcula y se avisa al cliente antes de pagar.
- Archivos: `src/lib/provider-cache.server.ts`, `src/lib/payments.functions.ts`.
- Complejidad: baja-media.

## Fase A4 — Sanear el envío de los productos ya publicados
- Los 20 productos con envío en cero se vuelven a sincronizar para tener un estimado de referencia (sirve sólo para mostrar "desde $X", nunca para cobrar).
- Archivos: `src/lib/catalog.functions.ts`, `src/lib/catalog.server.ts`.
- Complejidad: baja.

Qué pruebo en A: compra a una dirección de Guadalajara y otra de un estado lejano (tarifas distintas), dirección incompleta, proveedor sin respuesta, cambio de código postal a media compra, y comparación del total cobrado contra lo que el proveedor cobra a Alexa.

---

# ENTREGABLE B — Pagos a vendedoras (liquidación manual)

La liquidación es **transferencia manual de Alexa**. El sistema calcula, muestra y deja constancia; no mueve dinero solo.

## Fase B1 — Datos bancarios completos
- Se refuerza la pantalla que ya existe: validación visible de CLABE de 18 dígitos, banco, beneficiario y RFC opcional, con aviso claro de qué falta para poder cobrar.
- Archivos: `src/routes/_authenticated.cuenta.tsx`, `src/lib/account.functions.ts`.
- Complejidad: baja.

## Fase B2 — Desglose por venta para la vendedora
- Tabla por venta: precio, fabricación, envío cobrado, su ganancia, comisión de Dªtªblɛ, neto a recibir; totales de pendiente y ya pagado.
- Archivos: `src/routes/_authenticated.cuenta.tsx`, `src/lib/account.functions.ts`.
- Complejidad: media.

## Fase B3 — Panel de liquidaciones para Alexa
- Vista agrupada por vendedora: total adeudado, datos bancarios, ventas incluidas; selección múltiple y "Marcar como pagado" con referencia de la transferencia y fecha.
- Aviso cuando una vendedora no tiene CLABE registrada.
- Archivos: `src/routes/_authenticated.admin.tsx`, `src/lib/account.functions.ts`.
- Complejidad: media.

## Fase B4 — Devoluciones y cancelaciones
- Al cancelarse o reembolsarse un pedido, su asiento pasa a "cancelado" y deja de contar en lo adeudado; si ya se pagó, queda registrado como saldo a descontar en la siguiente liquidación.
- Archivos: `src/routes/api/public/payments/webhook.ts`, `src/lib/account.functions.ts`.
- Toca base de datos: sí, añadir el estado "cancelado" y el ajuste al asiento.
- Complejidad: media.

Qué pruebo en B: vendedora sin CLABE, venta con envío cobrado (la comisión no lo incluye), marcar pagado y ver el cambio en ambos paneles, y un reembolso que descuenta correctamente.

---

## Orden recomendado
A1 → A2 → A3 → A4 → B1 → B2 → B3 → B4. El Entregable A frena la pérdida por venta; el B ordena los pagos.

## Riesgos principales
- Sin la pasarela de pagos reconectada no hay pagos nuevos, así que el Entregable B seguirá con un solo asiento hasta que entre la primera venta cobrada.
- Si el proveedor tarda en cotizar el envío, la compra se siente lenta; por eso el caché y el tiempo máximo de espera.
- Ningún texto visible mencionará nombres de proveedores.

## Lo que necesito de ti fuera del código
- Reconectar la pasarela de pagos en modo real (es requisito para que el Entregable B tenga datos).
- Decidir el servicio de envío por omisión cuando el proveedor ofrece varios (económico o estándar).
- Decidir si el envío se cobra completo al cliente o si alguna vez lo absorbe la tienda.
- Definir cada cuánto liquidas a las vendedoras (semanal, quincenal) para reflejarlo en el panel.
- Decidir qué hacer con el pedido BAG ELARA existente (su asiento tiene envío $0 y quedará así salvo que autorices corregirlo).
