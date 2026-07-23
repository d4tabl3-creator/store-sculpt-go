
# Plan: Cerrar gaps de negocio y seguridad

## 1. Seguridad del checkout de tienda (bugs graves actuales)

Hoy el cliente le manda al servidor los precios, el total y la etiqueta de envío. Cualquiera puede pagar $1 por productos de $999. Además el stock nunca baja.

- **`createStoreOrderCheckout`**: recibir solo `orderId` + `[{ productId, qty }]` + `shippingId`. El servidor:
  - Lee productos y precios reales desde `store_products` filtrando por `store_id`.
  - Verifica stock suficiente.
  - Resuelve el envío desde `stores.shipping_options` por ID.
  - Recalcula `total_cents` y sobrescribe la fila de `store_orders`.
- **Webhook**:
  - Idempotencia: tabla `processed_stripe_events(id text pk)`. Si el evento ya está, retorna 200.
  - Al `checkout.session.completed`: marcar orden como paid, **decrementar stock** con función SQL `apply_paid_order(order_id uuid)` que hace UPDATE ... SET stock = stock - qty en una transacción.
  - Registrar comisión (ver §4).

## 2. Planes de merchant (Starter / Pro) con cobro real

- Crear productos y precios en Stripe: `starter_monthly` ($299 MXN), `pro_monthly` ($499 MXN).
- Nueva tabla `merchant_subscriptions(user_id, plan, status, current_period_end, stripe_subscription_id, stripe_customer_id, source)` donde `source ∈ ('stripe','coupon')`.
- Nuevo server fn `createPlanCheckout({ plan })` → sesión de suscripción Stripe embebida.
- Webhook maneja `customer.subscription.*` para actualizar la tabla.
- **Gate** en `/crear`: si el usuario no tiene suscripción activa **o** un cupón demo válido, redirige a nueva página `/planes` con los 2 planes + campo de cupón.
- Reglas: Starter = máx 1 tienda publicada, Pro = ilimitadas + dominio propio (bandera visible; el custom domain queda como TODO técnico, pero el plan ya lo cobra).
- Landing: los botones de precios ya llevan a `/planes`.

## 3. Sistema de cupones / folios demo

Para que puedas regalar acceso a testers.

- Tabla `demo_coupons(code text unique, plan text, days_valid int, max_uses int, uses int default 0, expires_at timestamptz, created_by uuid, notes text)`.
- Tabla `coupon_redemptions(coupon_id, user_id, redeemed_at)`.
- Server fn `redeemDemoCoupon({ code })`: valida (no expirado, quedan usos, usuario no lo usó), incrementa contador, y crea/actualiza `merchant_subscriptions` con `source='coupon'` + `current_period_end = now() + days_valid`.
- UI: campo "¿Tienes código demo?" en `/planes`.
- Panel admin básico en `/admin/cupones` (protegido con rol `admin` que ya existe en `user_roles`): crear cupón, ver usos, revocar.

## 4. Comisiones + datos bancarios del merchant

- Ampliar `profiles` con campos opcionales: `bank_name`, `clabe` (18 dígitos MX), `beneficiary_name`, `tax_id (RFC)`.
- Formulario en `/cuenta` (nueva ruta) para capturarlos. Al crear cuenta se pide en un banner suave.
- Nueva tabla `commission_ledger(order_id, store_id, owner_id, gross_cents, commission_cents, net_owed_cents, status ∈ ('pending','paid'), created_at, paid_at, payout_ref)`.
- Comisión configurable global (constante `PLATFORM_COMMISSION_BPS = 1000` = 10%). Se calcula en el webhook al marcar orden pagada.
- Widget en dashboard: "Saldo pendiente de pago" + historial de payouts.
- Ruta admin `/admin/payouts`: lista merchants con saldo, agrupado por CLABE, botón "Marcar como pagado" (registro manual, sin mover dinero real todavía — Stripe Connect en fase 2).

## 5. Gestión de cuenta

Actualmente solo hay "Cerrar sesión". Agregar en `/cuenta`:
- Cambiar contraseña (`supabase.auth.updateUser({ password })`).
- Ver plan activo + botón "Cambiar plan" / "Cancelar suscripción" (server fn que llama `stripe.subscriptions.update({ cancel_at_period_end: true })`).
- **Eliminar cuenta**: server fn con `requireSupabaseAuth` + `supabaseAdmin.auth.admin.deleteUser(userId)`. Cascadea a stores, productos, órdenes por FKs.

## 6. Pulido operativo

- Dashboard: filtro pagado/pendiente en pedidos, badge con `payment_status`, refresco tras webhook (polling suave cada 15s si hay órdenes pending).
- Storefront: bloquear "Agregar al carrito" si `stock <= 0`.
- Página `/checkout/return`: verificar server-side que la sesión sí es paid antes de mostrar el "¡éxito!" (server fn `getCheckoutStatus`).

## 7. Fuera de scope (siguiente iteración)

- Emails transaccionales (necesito tu API key de Resend).
- Stripe Connect real para auto-payout (por ahora payout manual desde admin).
- Dominios propios para plan Pro (columna existe, aplicarlo requiere trabajo de DNS + edge).

---

## Detalles técnicos

**Migraciones (una sola)**:
- `merchant_subscriptions`, `demo_coupons`, `coupon_redemptions`, `commission_ledger`, `processed_stripe_events`
- ALTER `profiles` add columnas bancarias
- Función SQL `apply_paid_order(uuid)` — transacción atómica (marcar paid + decrementar stock + insertar en `commission_ledger` si no existe)
- Función SQL `active_plan_for(uuid) returns text` — respeta suscripción Stripe o cupón vigente
- GRANTs y RLS por cada tabla nueva (owner-only excepto lo estrictamente público)

**Archivos nuevos/tocados**:
- `src/lib/plans.ts` — precios, ids, feature gates
- `src/lib/plans.functions.ts` — `createPlanCheckout`, `cancelSubscription`, `redeemDemoCoupon`, `getMyPlan`
- `src/lib/payouts.functions.ts` — `getMyBalance`, `listAllPayouts` (admin), `markPayoutPaid` (admin)
- `src/lib/account.functions.ts` — `deleteMyAccount`, `updateBankInfo`
- `src/routes/planes.tsx` — pública con paywall
- `src/routes/_authenticated.cuenta.tsx` — perfil, banco, plan, borrar cuenta
- `src/routes/_authenticated.admin.cupones.tsx`, `_authenticated.admin.payouts.tsx`
- Modificar `src/lib/payments.functions.ts` (recomputo server-side)
- Modificar `src/routes/api/public/payments/webhook.ts` (idempotencia + subs + commission)
- Modificar `src/routes/_authenticated.crear.tsx` (paywall gate + banner banco)
- Modificar `src/routes/index.tsx` (botones precios → `/planes`)
- Modificar `src/routes/_authenticated.dashboard.tsx` (saldo pendiente, plan actual)
- Modificar `src/routes/checkout.return.tsx` (verify server-side)

**Cómo lo pruebo yo mismo antes de entregar**: `bun run typecheck` + arranque preview + Playwright headless para flujo crear-cuenta → planes → cupón → crear tienda → checkout con tarjeta test.

## Cómo probar tú en preview (te dejo esto listo al final)

**Tarjetas Stripe (modo prueba, activo hoy):**
- Éxito: `4242 4242 4242 4242` — exp cualquier futura, CVC cualquier 3 dígitos
- Rechazo: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**Flujo end-to-end a probar:**
1. Regístrate como merchant nuevo → deberías caer en `/planes`.
2. Aplica el cupón que te crearé en semilla: **`DEMO-LANZAMIENTO`** (30 días Pro, 100 usos).
3. Crea una tienda → aparece en dashboard.
4. Abre la tienda pública en incógnito, agrega productos, checkout con `4242 4242 4242 4242`.
5. Vuelve al dashboard: orden marcada como pagada, stock bajó, saldo pendiente reflejado (90% de la venta).
6. En `/cuenta`: cambia contraseña, agrega CLABE, cancela plan.
7. Como admin (te asigno el rol al primer usuario): `/admin/cupones` para crear más folios y `/admin/payouts` para marcar pagos.

**Tiempo estimado**: 1 sesión larga. ¿Le doy?
