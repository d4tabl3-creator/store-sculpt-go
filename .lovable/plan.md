# Plan: cobros reales + correo "Completa tu compra"

## Lo que confirmé hoy (lectura, sin cambios)

- Pedidos reales en la base: 4 en los últimos 2 días, todos de `yaminkanavarro82@gmail.com`.
  - 2 pedidos de $950.00 creados con 5 segundos de diferencia (00:34:03 y 00:34:08), ambos `payment_status: pending`, **sin referencia de cobro** — es decir, se creó el pedido antes de que existiera siquiera una sesión de pago.
  - 1 pedido de $829.00 `paid` con referencia de prueba (`cs_test_...`).
  - 1 pedido de $829.00 con `status: shipped` pero `payment_status: pending` y referencia de prueba: este es el hueco que llegó a fabricación sin cobro confirmado.
- La pasarela de pagos **está desconectada ahora mismo**: el entorno de pruebas del proyecto expiró y la plataforma desconectó la integración. Hasta reconectarla no se puede cobrar ni en prueba ni en real. Esto explica los 2 pedidos sin referencia de cobro: el pedido se guarda antes de intentar el cobro, así que si el cobro no arranca, el pedido igual queda en la base.
- El sitio decide prueba vs. real por el prefijo de la clave pública (`pk_test_` / `pk_live_`) en `src/lib/stripe.ts`; el servidor usa dos secretos separados (`STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`) y dos secretos de firma de aviso (`PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`). La separación prueba/real ya está bien planteada; no hay que rediseñarla.
- El envío a fabricación se dispara **dentro** del aviso de pago confirmado (`src/routes/api/public/payments/webhook.ts`), lo cual es correcto. El hueco no está ahí: está en que existen otras rutas que cambian el estado del pedido, y en que el pedido nace en la base antes del cobro.

Punto no confirmado y que verificaré en la Fase 0: **por qué** un pedido quedó `shipped` con pago pendiente (candidatos: cambio manual desde el panel del vendedor, o un reintento del orquestador). No doy la causa por cerrada hasta revisarlo.

---

# ENTREGABLE 1 — Pasar a cobros reales

## Fase 0 — Cerrar la puerta abierta (urgente, hoy)
Objetivo: que nadie pueda "comprar" gratis mientras se completa el resto.

- Bloquear la creación de pedidos cuando la pasarela no está disponible: si no se puede abrir el cobro, no se guarda pedido. Hoy el pedido se guarda primero y el cobro después.
- Ocultar/deshabilitar el botón de pagar en la tienda pública cuando no hay cobro configurado, con mensaje amable ("La tienda está en mantenimiento de pagos").
- Auditar cómo se puso `shipped` ese pedido y reportarlo antes de tocar nada más.
- Limpiar los 4 pedidos de prueba: marcarlos como cancelados/prueba para que no ensucien las cuentas ni disparen fabricación.

Archivos: `src/lib/payments.functions.ts`, `src/routes/t.$slug.tsx`, `src/lib/stripe.ts`.
Base de datos: sí, sólo actualización de esos 4 pedidos existentes (sin cambio de estructura).
Prueba: intentar comprar con la pasarela caída → no se crea pedido, mensaje claro.
Complejidad: baja.

## Fase 1 — Reconectar la pasarela y dejar el modo prueba sano
- Reconectar la integración de pagos desde el panel de la plataforma (la reconexión es acción de Alexa; el enlace lo doy en el momento).
- Verificar que vuelven a existir las claves de prueba y el secreto de firma de prueba, y que el aviso de pago apunta a la dirección correcta del sitio.
- Repetir una compra de prueba completa y confirmar que el pedido pasa a pagado y sólo entonces sale a fabricación.

Archivos: ninguno (configuración). Base de datos: no.
Complejidad: baja, depende de Alexa.

## Fase 2 — Candados de integridad del pedido
1. **Antiduplicados**: huella del carrito (tienda + correo + productos + total) con ventana corta; si llega el mismo carrito otra vez, se reutiliza el pedido pendiente en lugar de crear uno nuevo.
2. **Fabricación sólo con pago confirmado**: regla en la base que impida que un pedido avance a `shipped`/producción si el pago no está en `paid`, y revisión de las rutas del panel del vendedor para que no puedan saltársela.
3. **Caducidad**: los pedidos pendientes de pago se marcan como expirados pasado un plazo (p. ej. 24 h), para que no queden fantasmas.

Archivos: `src/lib/payments.functions.ts`, `src/routes/api/public/payments/webhook.ts`, `src/lib/commerce/orchestrator.server.ts`.
Base de datos: **sí** — índice único parcial para la huella del carrito, columnas `payment_expires_at` y `checkout_fingerprint`, y una restricción/disparador que bloquee el avance sin pago. Migración con permisos y RLS conforme al resto del proyecto.
Prueba: doble clic en "Pagar" → un solo pedido; intento manual de marcar enviado sin pago → rechazado; pedido viejo pendiente → expira.
Complejidad: media.

## Fase 3 — Encender cobros reales
- Completar el proceso de activación real en el panel de la pasarela (esto es de Alexa, ver abajo).
- Cargar las claves reales como secretos del proyecto: clave privada real, clave pública real y secreto de firma real. Nunca en el código.
- Confirmar que el código elige real por prefijo `pk_live_` y que el aviso de pago real está registrado con su propio secreto de firma; verificación de firma sin cambios (ya existe y es correcta).
- Moneda MXN ya está fijada en el cobro; confirmar que la cuenta cobra y liquida en MXN.

Archivos: `src/lib/stripe.ts` (sólo si hace falta afinar el mensaje cuando no hay clave), resto sin cambios.
Base de datos: no.
Prueba de punta a punta antes de abrir al público: una compra real de bajo monto con tarjeta propia de Alexa, verificando (a) cobro visible en el panel de la pasarela, (b) pedido en `paid`, (c) fabricación disparada, (d) reembolso de esa compra de prueba.
Complejidad: media (mayor parte administrativa).

## Fase 4 — Vigilancia
- Panel interno: lista de pedidos con pago pendiente, con antigüedad y botón para reenviar el enlace de pago (engancha con el Entregable 2).
- Alerta cuando un pedido lleve más de X horas pendiente o cuando llegue fabricación sin pago.

Archivos: `src/routes/_authenticated.tienda.$id.tsx`, `src/lib/commerce.functions.ts`.
Base de datos: no.
Complejidad: baja-media.

## Riesgos (Entregable 1)
- Reconexión de la pasarela: mientras no ocurra, no hay cobros ni pruebas posibles.
- Activación real: la verificación del negocio puede tardar días y depende del panel de la pasarela, no del código.
- Los candados podrían rechazar pedidos legítimos si la ventana antiduplicados es muy amplia; se arranca con ventana corta (2 min).
- Cambiar a real invalida las referencias de prueba: los 4 pedidos actuales no son recuperables como cobros.

## Lo que debe hacer Alexa fuera del código
1. Reconectar la integración de pagos del proyecto (bloqueante para todo lo demás).
2. En el panel de la pasarela: verificación del negocio, datos fiscales de México (RFC, razón social, domicilio fiscal), representante legal con identificación, cuenta bancaria mexicana en pesos (CLABE) y moneda de liquidación MXN.
3. Definir el plazo de caducidad del pago pendiente (propongo 24 h).
4. Hacer la compra real de prueba con su propia tarjeta cuando avisemos.

---

# ENTREGABLE 2 — Correo "Completa tu compra"

## Cómo funcionaría
1. Cada pedido pendiente puede generar un **enlace de recuperación** con vigencia (propongo 24 h): un código aleatorio guardado junto al pedido, con fecha de expiración y marca de uso. El enlace lleva sólo ese código, nunca el identificador del pedido ni datos del cliente.
2. Al abrir el enlace, la página valida el código, vuelve a **recalcular precios, envío y existencias en el servidor** (nunca confía en lo guardado) y abre el cobro. Si el pedido ya se pagó, ya expiró, se canceló o algún producto ya no está disponible, se muestra un mensaje claro con la opción de volver a la tienda: nunca se cobra un pedido inválido.
3. Cuando el pago entra, el aviso de pago marca el pedido como pagado, invalida el código y dispara fabricación por el mismo camino ya existente.

## Texto y tono
Asunto propuesto: "Tu pedido quedó registrado — completa tu compra".
Cuerpo, con el texto aprobado tal cual: "Tu pedido quedó registrado, pero el cobro no pudo completarse y el pedido no se procesó. Ya está todo listo: puedes completar tu compra aquí [enlace]", más el resumen del pedido (productos, cantidades, total) y la vigencia del enlace. Sin culpar a nadie, sin excusas técnicas, sin nombres de proveedores. Identidad Dªtªblɛ ya existente (`_brand.tsx`) y remitente actual del proyecto.

## Disparo
- **Manual**: botón "Reenviar enlace de pago" en el detalle del pedido del panel del vendedor.
- **Automático**: una sola vez, ~1 hora después de que el pedido quede pendiente sin pago. Un correo por pedido (clave de no-duplicado), y nunca si el pedido ya se pagó o expiró.

## Fases (Entregable 2)
- **Fase E1 — Enlace de recuperación**: generación, validación, expiración y reuso del cobro existente.
  Archivos: migración (código, expiración, uso), `src/lib/payments.functions.ts`, ruta pública nueva `src/routes/pagar.$token.tsx`.
  Base de datos: **sí** (columnas o tabla de enlaces de pago, con permisos y RLS).
- **Fase E2 — Plantilla de correo**: `src/lib/email-templates/completar-compra.tsx` + registro en `src/lib/email-templates/registry.ts`.
  Base de datos: no.
- **Fase E3 — Envío manual desde el panel**: botón y envío con clave de no-duplicado.
  Archivos: `src/routes/_authenticated.tienda.$id.tsx`, `src/lib/commerce.functions.ts`, `src/lib/email/send.ts`.
- **Fase E4 — Envío automático**: tarea programada que busca pedidos pendientes de más de 1 h y envía una vez.
  Archivos: ruta pública de tarea programada + programación en la base.
  Base de datos: **sí** (programación de la tarea).

Pruebas por fase: enlace válido cobra y marca pagado; enlace expirado / ya pagado / producto agotado muestran mensaje claro sin cobrar; el correo se ve bien en móvil y escritorio con la identidad correcta; el automático no envía dos veces.

## Riesgos (Entregable 2)
- El correo sólo tiene sentido cuando el cobro real ya funciona; si se lanza antes, invita a un cobro que fallará. Por eso E1–E4 van **después** de la Fase 3 del Entregable 1 (la plantilla, E2, sí puede adelantarse).
- Enlaces de pago por correo pueden verse como spam si se envían varias veces: máximo uno automático más los manuales que decida el vendedor.
- Precios y existencias pueden cambiar entre el pedido y el pago; por eso se recalcula siempre en el servidor.

## Complejidad estimada
- Entregable 1: Fase 0 baja, Fase 1 baja, Fase 2 media, Fase 3 media, Fase 4 baja-media.
- Entregable 2: E1 media, E2 baja, E3 baja, E4 media.

## Orden recomendado
Fase 0 → Fase 1 → Fase 2 → Fase 3 → E1 → E2 → E3 → Fase 4 → E4.

Nada se ejecuta hasta que Alexa autorice fase por fase.
