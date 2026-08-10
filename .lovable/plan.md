# Guía de inicio y acompañamiento del cliente

Sistema que entrega a cada cliente un camino claro ("¿Qué hago ahora?") al recibir su activo digital. Se agrega encima de lo que ya existe: no toca la arquitectura de proveedores, ni el editor provisional, ni la identidad visual.

## 1. Archivos existentes que se modifican

- `src/routes/_authenticated.dashboard.tsx` — se agrega la tarjeta "¿Qué hago ahora?" con el progreso del cliente, enlazando a la guía.
- `src/routes/_authenticated.bienvenida.tsx` — la hoja de ruta actual pasa a leer la secuencia dinámica en vez de su lista fija.
- `src/lib/commerce/orchestrator.server.ts` — al marcar el activo como listo, se dispara el correo de bienvenida (una sola llamada añadida, sin cambiar la lógica existente).
- `src/routes/_authenticated.tienda.$id.tsx` — enlace visible "Guía de inicio" en el encabezado del activo.

Nada más se modifica: catálogo, variantes, mockups, pedidos, costos, envíos, seguimiento, webhooks, pagos y comisiones quedan intactos.

## 2. Archivos nuevos

- `src/lib/guides/types.ts` — contratos de guía y pasos (client-safe).
- `src/lib/guides/registry.ts` — catálogo de guías y regla de selección por tipo de activo + proveedor.
- `src/lib/guides/content/pod-basico.ts` — primera guía (caso cliente cero), con el contenido en blanco/marcador hasta que tú lo entregues.
- `src/lib/guides/progress.server.ts` — cálculo del paso actual a partir del estado real del activo.
- `src/lib/guides.functions.ts` — funciones de servidor: obtener guía, progreso, marcar paso manual.
- `src/components/GuideChecklist.tsx` — lista visual de pasos reutilizable.
- `src/routes/_authenticated.guia.$id.tsx` — la guía completa en línea, consultable siempre.
- `src/routes/api/public/guia/$id[.]md` (descarga) — entrega la guía como archivo para adjuntar/compartir.
- `src/lib/email-templates/asset-ready.tsx` — correo de bienvenida (requiere el andamiaje de correos de la app).

## 3. Cómo se almacenan las guías

El contenido vive en archivos de contenido bajo `src/lib/guides/content/`, uno por guía, como datos puros (título, intro, pasos, ayuda). Cambiar el texto de una guía nunca implica tocar la lógica de la aplicación. Se deja opcionalmente la posibilidad de sobreescribir textos desde base de datos más adelante sin cambiar la interfaz.

En base de datos solo se guarda el avance, no el contenido:

- Tabla nueva `guide_progress`: activo, dueño, id de guía, pasos completados, paso actual, fecha de finalización. Con reglas de acceso: cada dueño ve y edita solo su propio avance.

## 4. Asociación guía ↔ activo/proveedor

Regla de resolución en el registro, en este orden:

```text
(tipo de activo + proveedor)  ->  guía específica
(tipo de activo)              ->  guía del tipo
(por defecto)                 ->  guía general de inicio
```

El tipo de activo se deduce del rubro/kit ya guardado en el activo, y el proveedor del enlace de comercio existente. Agregar un activo turístico o de servicios en el futuro es agregar un archivo de contenido y una línea en el registro.

## 5. Entrega por correo

Cuando el activo pasa a "listo", se envía un correo con: nombre del cliente, confirmación, enlace a la tienda, enlace al panel, cuál es el primer paso y enlace a la guía en línea (más la versión descargable). El envío usa la infraestructura de correo del dominio ya verificado y una clave de idempotencia por activo, para que no se duplique si el proceso reintenta.

## 6. Dentro del panel

- En el panel principal: tarjeta "¿Qué hago ahora?" con el paso actual destacado, el porcentaje de avance y un botón directo a la acción.
- En la página del activo: acceso permanente a la guía completa.
- Ruta propia de guía: pasos numerados, qué recibió, qué configurar, qué revisar, cómo saber que terminó, qué pasa con la primera venta y dónde pedir ayuda.

## 7. Seguimiento de pasos

Cada paso declara cómo se comprueba: automático (por ejemplo, existen productos, hay medios de cobro, el activo está publicado, hay un pedido pagado) o manual (el cliente lo marca). El progreso se calcula al abrir el panel combinando el estado real del activo con los pasos marcados a mano, así nunca pide algo que el cliente ya hizo.

## 8. Independencia de Printful

Ni el registro ni los componentes mencionan a un proveedor concreto. Las comprobaciones automáticas se hacen sobre datos propios de la plataforma (productos, cobros, publicación, pedidos) y, cuando algo depende del proveedor, se consulta la capacidad declarada que ya existe en la arquitectura, no un nombre. La primera guía es solo un archivo de contenido más.

## 9. Reutilización futura

Para un proveedor o activo nuevo: se agrega un archivo de contenido y su entrada en el registro. Panel, correo, descarga, progreso y diseño se reutilizan sin cambios.

## Detalles técnicos

- Tabla `guide_progress` con permisos por dueño; sin datos sensibles.
- Funciones de servidor autenticadas para leer y actualizar progreso; la guía en sí se resuelve en el cliente desde el registro (contenido público, sin secretos).
- El correo requiere activar el andamiaje de correos de la aplicación (una sola vez) sobre el dominio ya verificado.
- Diseño con los tokens visuales actuales; sin colores ni marcas del proveedor.
