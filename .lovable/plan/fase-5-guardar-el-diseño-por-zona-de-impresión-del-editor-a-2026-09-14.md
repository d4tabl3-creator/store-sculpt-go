# Fase 5 — Guardar el diseño por zona de impresión, del editor a la fabricación

Hoy el ajuste fino del diseño (modo de llenado, tamaño, posición, giro) solo existe mientras la vendedora está en pantalla. Al guardar el producto se conserva únicamente la imagen del diseño y el nombre de una zona. Este plan guarda el ajuste completo, por cada zona, y lo lleva hasta la fabricación.

## 1. Diagnóstico: archivos que intervienen hoy

(a) Editor de diseño
- `src/components/crear/DesignCanvas.tsx` — lienzo, arrastre, modos ajustar/rellenar/repetir.
- `src/components/crear/CustomizeStep.tsx` — controles de zona, escala, giro, subida del archivo.
- `src/components/crear/MockupsStep.tsx` — vista previa de venta.
- `src/lib/product-draft.ts` — modelo en memoria: ya tiene `zones: Record<string, ZoneDesign>` con `fitMode`, `tileScale`, `offsetX/Y`, `scale`, `rotation`.
- `src/routes/_authenticated.producto.$storeId.tsx` — orquesta los pasos y arma lo que se envía al guardar.

(b) Guardado del producto en la tienda
- `src/lib/catalog.functions.ts` (`addCatalogProducts`) — escribe en `store_products`; hoy solo `design_url` y `placement`.
- `src/lib/catalog.server.ts` (`generateMockups`) — único lugar donde hoy sí se usan `scale/x/y/angle/fitMode/tileScale`, pero solo para la imagen de vista previa.
- `src/routes/_authenticated.tienda.$id.tsx` — edición posterior del producto.

(c) Creación del pedido
- `src/lib/payments.functions.ts` — crea la fila en `store_orders`.
- `src/routes/api/public/payments/webhook.ts` — confirma el pago.
- `src/routes/t.$slug.tsx` — tienda pública y carrito.

(d) Envío a fabricación
- `src/lib/commerce/orchestrator.server.ts` — `syncProductToProvider` lee `store_products` + `commerce_design_assets` y arma el objeto neutral `design`.
- `src/lib/commerce/types.ts` — tipo `DesignAssetRef` (hoy: url, placement, ids externos, origen).
- `src/lib/commerce/providers/printify.server.ts` — `upsertProduct` envía `print_areas` con valores fijos `x: 0.5, y: 0.5, scale: 0.9, angle: 0`; `createOrder` solo referencia el producto ya creado.
- `src/lib/printify.server.ts` — catálogo, zonas y costos.

Punto exacto de pérdida: `addCatalogProducts` no guarda el ajuste, y `upsertProduct` lo reemplaza por constantes.

## 2. Esquema de datos propuesto

Propuesta: **tabla nueva** `public.product_print_zones`, una fila por producto y zona.

Por qué no `metadata` de `commerce_design_assets`: esa tabla es un registro histórico de archivos subidos al proveedor (se inserta una fila nueva en cada sincronización), no el estado actual editable del producto. Consultar "la última fila" para saber cómo se ve un producto es frágil. Por qué no columnas nuevas en `store_products`: la relación es uno-a-muchos (frente, espalda, manga…), no cabe en columnas planas.

`store_products.design_url` y `placement` se conservan intactos como zona principal heredada.

```sql
CREATE TABLE public.product_print_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  placement text NOT NULL,
  design_url text,
  design_preview_url text,
  fit_mode text NOT NULL DEFAULT 'fit',
  scale numeric NOT NULL DEFAULT 0.8,
  tile_scale numeric NOT NULL DEFAULT 0.25,
  offset_x numeric NOT NULL DEFAULT 0.5,
  offset_y numeric NOT NULL DEFAULT 0.5,
  rotation numeric NOT NULL DEFAULT 0,
  area_width integer NOT NULL DEFAULT 0,
  area_height integer NOT NULL DEFAULT 0,
  natural_width integer,
  natural_height integer,
  dpi_estimate integer,
  external_file_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, placement)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_print_zones TO authenticated;
GRANT SELECT ON public.product_print_zones TO anon;
GRANT ALL ON public.product_print_zones TO service_role;

ALTER TABLE public.product_print_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage their print zones"
  ON public.product_print_zones FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "public reads zones of published stores"
  ON public.product_print_zones FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.stores s
                 WHERE s.id = product_print_zones.store_id AND s.status = 'published'));

CREATE TRIGGER trg_ppz_updated BEFORE UPDATE ON public.product_print_zones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_ppz_product ON public.product_print_zones(product_id);

-- Relleno retrocompatible desde lo ya publicado
INSERT INTO public.product_print_zones (product_id, store_id, owner_id, placement, design_url)
SELECT p.id, p.store_id, s.owner_id, COALESCE(p.placement, 'front'), p.design_url
FROM public.store_products p
JOIN public.stores s ON s.id = p.store_id
WHERE p.design_url IS NOT NULL
ON CONFLICT (product_id, placement) DO NOTHING;
```

Nada se borra, nada se renombra, nada cambia de tipo.

Validaciones por trigger (no `CHECK`), en el mismo paso: `fit_mode` dentro de `fit|fill|tile`, `scale` entre 0.05 y 3, desplazamientos entre 0 y 1, `rotation` entre −360 y 360.

## 3. Qué pasa con los datos existentes

- **23 productos**: los que tengan diseño reciben una fila de zona con los valores por defecto, que son exactamente los que el editor ya usaba (centrado, 0.8, sin giro, modo ajustar). Su apariencia no cambia.
- **14 filas de `commerce_design_assets`**: se quedan como están, siguen siendo el historial de archivos del proveedor. Después se les puede escribir `metadata` con el ajuste usado, pero no es requisito.
- **8 tiendas**: sin cambios.
- El código sigue leyendo `design_url` y `placement` cuando no hay fila de zona, así que una tienda publicada nunca queda sin diseño.

## 4. Propagación a fabricación

El proveedor de fabricación acepta, por zona, una lista de imágenes con `x`, `y`, `scale` y `angle` en fracciones del área imprimible; justo el mismo sistema de coordenadas del lienzo. La traducción es directa:

- `offset_x` → `x`, `offset_y` → `y`, `rotation` → `angle`.
- Modo **Ajustar**: `scale` tal cual.
- Modo **Rellenar**: se recalcula la escala a partir de la proporción del archivo y del área, para que cubra sin deformar; el recorte queda del lado del proveedor.
- Modo **Repetir patrón**: **el proveedor no tiene repetición nativa**. Se envía la misma imagen repetida en una cuadrícula calculada a partir de `tile_scale` (la misma técnica que ya usa la generación de vistas previas en `catalog.server.ts`, que hoy sí arma varias imágenes para el patrón). Límite real: el número de repeticiones por zona está acotado; con `tile_scale` muy pequeño se recortará la cuadrícula a un máximo seguro y la vendedora verá un aviso de que el patrón se dibujará más grande.
- Varias zonas: un `print_areas` con un `placeholders` por zona con diseño, en vez de la zona única actual.

También hay que añadir el ajuste al cálculo del `sync_hash` de `commerce_product_bindings`; si no, cambiar solo la posición no dispararía la resincronización.

## 5. Riesgos

- **Resincronización masiva**: al incluir el ajuste en el `sync_hash`, todos los productos ya sincronizados se volverían a enviar. Mitigación: el relleno usa exactamente los valores por defecto actuales, de modo que el hash solo cambia cuando la vendedora edita de verdad.
- **Productos sin costo confiable o precio bajo el costo base**: no se tocan las reglas de precio; el guardado de zonas es independiente.
- **Los 4 pedidos en `store_orders`**: no se modifican. Los artículos del pedido guardan una copia del producto al momento de la compra y el pedido al proveedor se arma con el identificador del producto ya creado, no con el diseño. Ningún pedido existente cambia de estado, precio ni contenido.
- **Tienda pública**: la vitrina usa `image_url`/`mockup_url`, que no se tocan.
- Riesgo bajo de aumento de llamadas al proveedor si se sube una imagen distinta por zona: cada archivo se sube una vez y se reutiliza su identificador.

## 6. Fases de ejecución

**5.1 — Base de datos** (requiere migración, con tu autorización por escrito)
Crear `product_print_zones`, permisos, reglas de acceso, trigger de validación y relleno retrocompatible. Regenerar los tipos del proyecto. Verificación: las 23 filas siguen visibles y los productos con diseño tienen su fila de zona.

**5.2 — Guardado desde el editor** (sin base de datos)
Archivos: `src/lib/catalog.functions.ts`, `src/routes/_authenticated.producto.$storeId.tsx`, `src/lib/product-draft.ts`.
Al guardar el producto se escriben todas las zonas con diseño. Verificación: crear un producto con frente y espalda distintos y comprobar que ambas zonas quedan guardadas.

**5.3 — Recuperar el ajuste al reabrir** (sin base de datos)
Archivos: `src/routes/_authenticated.tienda.$id.tsx`, `src/components/crear/CustomizeStep.tsx`.
Verificación: reabrir el producto y ver el diseño exactamente donde se dejó, en cada zona.

**5.4 — Lectura del ajuste en el orquestador** (sin base de datos)
Archivos: `src/lib/commerce/orchestrator.server.ts`, `src/lib/commerce/types.ts`.
El objeto neutral `design` pasa a ser una lista de zonas con su ajuste; `sync_hash` lo incluye. Verificación: registro de sincronización muestra las zonas correctas.

**5.5 — Envío a fabricación** (sin base de datos)
Archivo: `src/lib/commerce/providers/printify.server.ts`.
Sustituir los valores fijos por el ajuste real; múltiples zonas; traducción de rellenar y de patrón. Verificación: publicar un producto de prueba y comparar la vista previa de fabricación con el lienzo.

**5.6 — Avisos a la vendedora** (sin base de datos)
Archivos: `src/components/crear/CustomizeStep.tsx`, `src/components/crear/DesignCanvas.tsx`.
Aviso de baja resolución y de límite de repeticiones del patrón, en lenguaje claro y sin mencionar proveedores.

Nada de esto toca pagos.
