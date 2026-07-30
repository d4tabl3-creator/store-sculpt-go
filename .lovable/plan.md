# Fase 2 — Commerce Orchestrator

DªTªBLe pasa de ser una app con tiendas propias (`stores` / `store_products` / `store_orders` en nuestra BD) a ser **la única interfaz** que orquesta tiendas reales en Shopify (y a futuro Woo, MercadoLibre, etc.). El usuario nunca ve ni toca Shopify.

## 1. Principios de arquitectura

- **Un proveedor por Activo Digital**, aislado: cada tienda del usuario = 1 tienda Shopify dedicada (development store creada vía Partner API) + credenciales propias guardadas cifradas.
- **Nunca compartir**: productos, pedidos, inventario, webhooks y tokens viven ligados a `store_id` + `owner_id`. Cero recursos compartidos entre clientes.
- **Adapter pattern**: la app sólo habla con una interfaz `CommerceProvider`. Shopify es la primera implementación; agregar Woo/ML/Etsy = nuevo adapter, sin tocar UI ni lógica de negocio.
- **Idempotencia y estado**: cada tienda tiene una máquina de estados de provisión (`queued → creating → linking → seeding → webhooks → ready | failed`) reintentable.
- **DªTªBLe es fuente de verdad para UX** (catálogo editable, pedidos, dashboards). Shopify es fuente de verdad operativa (inventario real, checkout, fulfillment). Un **bus de sincronización** los mantiene alineados en ambas direcciones.

## 2. Componentes nuevos

### 2.1 Capa de dominio (`src/lib/commerce/`)
- `types.ts` — interfaces `CommerceProvider`, `ProviderProduct`, `ProviderOrder`, `ProviderWebhookEvent`, `ProvisionPlan`.
- `registry.ts` — `getProvider(kind)` devuelve el adapter (`shopify`, futuro `woo`, …).
- `orchestrator.ts` — API pública consumida por el resto de la app: `provisionAsset`, `syncProduct`, `syncInventory`, `pullOrders`, `handleWebhook`, `teardown`.
- `state-machine.ts` — transición de `provisioning_status` con reintentos y backoff.

### 2.2 Adapter Shopify (`src/lib/commerce/providers/shopify/`)
- `client.ts` — factory de cliente Admin GraphQL por tienda (token cifrado).
- `provision.ts` — crea development store via Partner API, instala custom app, guarda credenciales.
- `products.ts`, `inventory.ts`, `orders.ts`, `webhooks.ts` — mapping DªTªBLe ↔ Shopify.
- `errors.ts` — normaliza errores del proveedor a `OrchestratorError`.

### 2.3 Server functions (`src/lib/commerce.functions.ts`)
Wrappers `createServerFn` autenticados que exponen al frontend sólo lo necesario:
- `provisionAssetFn({ storeId })` — dispara/consulta el pipeline.
- `getProvisioningStatusFn({ storeId })` — para el polling de "Estamos preparando tu Activo Digital".
- `syncProductFn`, `deleteProductFn`, `refreshInventoryFn`.
Todas usan `requireSupabaseAuth` y verifican `owner_id`.

### 2.4 Server routes (`src/routes/api/public/commerce/`)
- `shopify/webhook.ts` — recibe webhooks (orders/create, inventory_levels/update, products/update, app/uninstalled). Verifica HMAC con el secreto por tienda, resuelve `store_id` desde `X-Shopify-Shop-Domain`, encola en el bus.
- `shopify/oauth-callback.ts` — sólo si más adelante se ofrece "conectar tienda existente"; en Fase 2 no se expone al usuario.

### 2.5 Bus de sincronización
Tabla `commerce_sync_jobs` + worker por polling desde un server route protegido con `CRON_SECRET`, invocable por `pg_cron` cada minuto. Procesa provisioning y sync de forma idempotente.

### 2.6 UI mínima
- `src/routes/_authenticated/preparando.$id.tsx` — pantalla única con mensajes:
  - "Estamos preparando tu Activo Digital." (con pasos internos opcionales, sin nombrar Shopify).
  - "Tu Activo Digital está listo." + CTA a `/tienda/$id`.
- Redirección desde el wizard (`_authenticated.crear.tsx`) a `/preparando/$id` en vez de ir directo a la tienda.
- `_authenticated.tienda.$id.tsx`: sigue igual visualmente; internamente cada mutación llama al orchestrator, nunca a Shopify directo.

## 3. Cambios en lo existente

- `src/routes/_authenticated.crear.tsx` — al crear la store en Supabase, dispara `provisionAssetFn` y navega a `/preparando/$id`.
- `src/lib/payments.functions.ts` / `src/routes/api/public/payments/webhook.ts` — al marcar `payment_status='paid'`, delega a `orchestrator.createOrder(providerOrder)` para que la orden aterrice también en Shopify (fulfillment). Comisión sigue calculada en `apply_paid_order`.
- Ediciones de producto en `_authenticated.tienda.$id.tsx` pasan por `syncProductFn` (Supabase + Shopify en la misma transacción lógica).
- `store_orders` sigue siendo la vista del merchant; se enriquecen con `provider_order_id` y `fulfillment_status` traídos por webhook.

## 4. Cambios de base de datos (migración única)

Tablas nuevas:
- `commerce_providers` (catálogo estático: `shopify`, futuros).
- `commerce_store_bindings` — 1:1 con `stores`: `provider`, `external_store_id`, `shop_domain`, `admin_token_encrypted`, `webhook_secret_encrypted`, `provisioning_status`, `provisioning_error`, `last_synced_at`.
- `commerce_product_bindings` — mapping `store_products.id` ↔ `external_product_id`, `external_variant_id`, `last_synced_at`, `sync_hash`.
- `commerce_order_bindings` — mapping `store_orders.id` ↔ `external_order_id`, `fulfillment_status`.
- `commerce_sync_jobs` — cola: `store_id`, `kind`, `payload jsonb`, `status`, `attempts`, `run_after`, `last_error`.
- `commerce_event_log` — auditoría de eventos entrantes/salientes por tienda (para debugging sin exponer Shopify al usuario).

Reglas:
- RLS: lectura sólo por owner o admin; escritura exclusiva por service role. GRANTs explícitos por tabla.
- Tokens cifrados con `pgcrypto` usando `COMMERCE_ENCRYPTION_KEY` (secreto nuevo, generado con `generate_secret`).
- Índices por `store_id`, `status`, `run_after`.

## 5. Secretos y configuración

Se solicitarán vía `add_secret` cuando el usuario apruebe el plan:
- `SHOPIFY_PARTNER_API_TOKEN` y `SHOPIFY_PARTNER_ORGANIZATION_ID` — para crear development stores programáticamente.
- `SHOPIFY_APP_CLIENT_ID` / `SHOPIFY_APP_CLIENT_SECRET` — custom app que se instala en cada tienda.
- `COMMERCE_ENCRYPTION_KEY` (generado) y `CRON_SECRET` (generado) para el worker.

## 6. Extensibilidad

Agregar un proveedor futuro = crear `src/lib/commerce/providers/<x>/` implementando `CommerceProvider`, registrarlo en `registry.ts`, agregar fila a `commerce_providers` y opciones en el wizard. UI, tablas de dominio (`stores`, `store_products`, `store_orders`) y flujos del usuario no cambian.

## 7. Entrega en fases (dentro de esta Fase 2)

1. **Migración + tipos + interfaz `CommerceProvider`** (sin llamadas reales todavía).
2. **Adapter Shopify: provisioning end-to-end** + pantalla "Estamos preparando…".
3. **Sync de productos e inventario** (push desde DªTªBLe).
4. **Sync de pedidos + webhooks + fulfillment** al pagar.
5. **Worker cron + reintentos + panel admin** para reprovisionar tiendas fallidas.

## 8. Detalles técnicos

- Todas las llamadas a Shopify van desde server functions/routes; el navegador nunca ve tokens ni dominios `.myshopify.com`.
- Cada webhook route valida HMAC con el `webhook_secret_encrypted` de esa tienda; requests no verificados devuelven 401 sin tocar BD.
- `orchestrator.provisionAsset` es idempotente: reejecutable sin duplicar recursos (busca binding existente antes de crear).
- Errores del proveedor se loguean en `commerce_event_log` y, si son bloqueantes, dejan la tienda en `provisioning_status='failed'` con acción de reintento desde `/admin`.
- Ningún nombre de proveedor aparece en textos visibles al usuario final.

## 9. Preguntas antes de implementar

1. ¿Confirmas usar **Shopify Partner API + development stores** como base (una tienda Shopify real por cliente), o prefieres primero un modo simulado que sólo persista en nuestra BD y agregar Shopify después?
2. ¿Podrás proveer credenciales de Partner (`SHOPIFY_PARTNER_API_TOKEN`, org id) y credenciales de una custom app? Sin ellas puedo dejar el adapter listo pero el provisioning quedará en modo stub.
3. ¿Los Activos Digitales existentes deben migrarse retroactivamente a Shopify, o sólo los nuevos?
