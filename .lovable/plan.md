# Plan de construcción — DªTªBLe

Plataforma **Franchise-as-a-Service**: el usuario no diseña una tienda, elige un "Pack de Negocio" y recibe una tienda operativa en <10 min. Inspirado en el flujo del autoMac.

Mantenemos la paleta **Berry** (rosas + negro) ya aprobada y la tipografía Inter + Sora.

---

## Fase 0 — Landing público (este turno si apruebas)

Reemplazar el `index.tsx` actual (marketplace de plantillas) por el landing real de DªTªBLe.

Secciones:
1. **Hero** — "Tu tienda online lista en 10 minutos. Sin saber nada de tecnología." + CTA "Crear mi tienda" + mock visual de las 4 ventanillas.
2. **¿Cómo funciona?** — Las 4 ventanillas tipo autoMac (Rubro → Combo → Fachada → Pagos), cada una con icono, descripción corta y micro-ilustración.
3. **Para quién es** — 2 audiencias: (a) Emprendedores sin experiencia / ingreso extra / sin capital, (b) Artesanos y productores con producto pero sin canal digital.
4. **El "Momento McDonald's"** — Animación/timeline de los 4 pasos backend (Orquestador, Cargador IA, Configurador, Builder) → entregable en <2 min.
5. **Asistente IA Fantasma** — 3 cards: Stock predictivo, Precios dinámicos, Atención al cliente.
6. **Comparativa** — Tabla DªTªBLe vs Shopify/Wix vs Tienda tradicional.
7. **Precios** — Plan Básico $299 MXN (1.5% comisión) · Plan Pro $499 MXN (0.5% comisión).
8. **Marketplace de Proveedores** (teaser) — "¿Tienes producto pero no canal? Súbelo a nuestro ecosistema."
9. **FAQ + CTA final + footer**.

SEO: title, description, og:* específicos de DªTªBLe en español MX.

**Entregable:** landing estático profesional, sin backend. Listo para presentar a inversionistas / capturar early access.

---

## Fase 1 — Wizard simulado de 4 ventanillas (mock, sin backend)

Nueva ruta `/crear` con flujo guiado de 4 pasos + barra de progreso:

1. **Ventanilla 1 — Rubro:** 10 cards (Moda, Electrónica, Belleza, Hogar, Comida, Ropa Deportiva, Mascotas, Niños, Arte/Artesanía, Wellness).
2. **Ventanilla 2 — Combo:** 3 "Kits de lanzamiento" pre-armados para el rubro elegido, con productos mock y márgenes sugeridos.
3. **Ventanilla 3 — Fachada:** 3 "Pieles" (templates) + upload de logo (mock) + nombre de tienda → preview en vivo.
4. **Ventanilla 4 — Pagos y envíos:** email para Stripe/MercadoPago + 3 toggles de envío (Estándar/Rápido/Recoge en tienda).

Pantalla final: **"¡Tu tienda está lista!"** con preview del subdominio `tutienda.datable.com.mx` (mock).

Estado persistido en `localStorage` (no requiere auth aún).

**Entregable:** demo interactivo que cualquier visitante puede probar. Validación UX antes de invertir en backend.

---

## Fase 2 — Lovable Cloud: cuentas y persistencia real

Activar Lovable Cloud para:
- **Auth:** email/password + Google.
- **Tablas:** `stores`, `store_kits`, `store_products`, `store_orders`, `suppliers`, `supplier_products`, `user_roles` (con tabla separada y `has_role()` security definer).
- **RLS** en todas las tablas + grants explícitos.
- Guardar progreso del wizard en BD.
- **Dashboard del usuario** con los 3 botones gigantes: Vender · Ver pedidos · Editar.
- **Área de proveedores/artesanos:** registro, subir productos, requisitos (con validación).

**Entregable:** plataforma multi-tenant funcional con datos reales (aún sin tiendas públicas reales).

---

## Fase 3 — Generación de tienda y subdominio

- Generación de subdominio `{slug}.datable.com.mx` por tienda (ruta dinámica + middleware).
- Renderizar storefront público con la "piel" elegida + productos del kit.
- Carrito + checkout mock.
- Panel admin pulido (3 botones gigantes + sub-vistas).

**Entregable:** una tienda creada en el wizard es navegable como sitio real.

---

## Fase 4 — Integraciones reales

Cada una es un sub-proyecto. Sugerencia de orden:

1. **Stripe** (built-in Lovable Payments) — checkout real, suscripción $299/$499, comisión por venta.
2. **Printify API** — sincronización de catálogo, stock, imágenes, descripciones (1er proveedor POD).
3. **DHL / Correos de México** — calculadora de envíos.
4. **Mercado Pago** — alternativa a Stripe para MX.
5. **Printful / Gelato / SPOD** — proveedores adicionales.

Cada integración necesita su propio API key (manejados via Lovable Cloud secrets).

---

## Fase 5 — Capa de IA ("Gerente fantasma")

Vía Lovable AI Gateway (Gemini 3 Flash por defecto):

1. **Edición automática de imágenes de producto** — quitar fondo, mejorar calidad (al subir en Ventanilla 2).
2. **Vectorización de logo + extracción de paleta** (Ventanilla 3).
3. **Stock predictivo** — job recurrente que analiza ventas y avisa al usuario.
4. **Precios dinámicos** — sugerencias basadas en competencia.
5. **Chatbot de atención al cliente** por tienda (responde envíos, cambios, FAQ).

---

## Fase 6 — Marketplace de proveedores (ecosistema híbrido)

- Onboarding de productores locales (artesanos de Vallarta, etc.) que **solo aportan producto**, sin tienda propia.
- Sus productos aparecen como "Kits disponibles" para que otros usuarios los monten en su tienda.
- Split de pagos automático (productor + dueño de tienda + DªTªBLe).
- Logística compartida (DHL ya integrado).

**Entregable:** ecosistema auto-alimentado descrito en tu brief.

---

## Detalles técnicos (resumen)

- **Stack actual:** TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 + shadcn/ui. Lo mantenemos.
- **Diferencias con tu ficha técnica:** tu ficha menciona Next.js + Express + AWS. En Lovable usamos TanStack Start (equivalente moderno a Next) + server functions (equivalente a Express endpoints) + Cloudflare Workers + Lovable Cloud (Supabase managed). Funcionalmente cubre todo lo que pides, sin que tengas que gestionar AWS ni Docker.
- **Contenedor por tienda:** en lugar de un Docker por tienda, usamos multi-tenancy en una sola app con subdominio dinámico — más rápido, más barato, mismo resultado para el usuario.
- **Pagos:** Lovable Payments built-in (Stripe) cubre el caso México sin que tengas que conectar tu propia cuenta Stripe al inicio.

---

## Mi recomendación

Empezar **ya** por **Fase 0 (landing)** en este turno. Es la base para mostrar a usuarios/inversionistas y no requiere decisiones técnicas adicionales. Cuando lo apruebes, seguimos con Fase 1 (wizard mock) en el siguiente turno.

¿Procedo con Fase 0?
