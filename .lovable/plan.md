# Editor de diseño: paridad funcional con el editor del proveedor

Objetivo: que la persona vea su diseño en el lienzo, pueda elegir todas las zonas de impresión reales del producto y cuente con herramientas de llenado (ajustar, rellenar, repetir patrón, centrar, escalar libre), con una vista previa fiel del resultado.

Entrega por fases. Cada fase se autoriza por separado. Sin cambios en base de datos ni migraciones, salvo la excepción señalada en la Fase 4 (que solo se ejecuta si la autorizas explícitamente).

---

## (a) Diagnóstico del bug de la imagen invisible

El lienzo muestra el diseño con `<img src={draft.designPreview || draft.designUrl}>` (`CustomizeStep.tsx:149`, `DesignCanvas.tsx:142`). Hay dos fuentes y ambas tienen un modo de falla verificable en el código:

1. `designPreview` es un `URL.createObjectURL(file)` creado en el navegador (`CustomizeStep.tsx:112`). Ese enlace solo vive mientras la pestaña siga abierta con el mismo documento: si hay recarga, navegación entre pasos que remonte el documento, o si el navegador móvil descarta la pestaña en segundo plano, el enlace queda muerto y el navegador pinta exactamente el icono de imagen rota con el texto alternativo "Tu diseño". Coincide con el síntoma reportado.
2. `designUrl` es un enlace firmado del almacenamiento privado pedido con 3650 días de vigencia (`CustomizeStep.tsx:110`). Si el servicio recorta o rechaza vigencias tan largas, o si el enlace se genera en un contexto y se consume en otro, el enlace responde error y el resultado visual es el mismo icono roto.

Diagnóstico honesto: la causa exacta en producción no está confirmada; lo confirmado es que ambas rutas de imagen pueden producir ese síntoma y que no existe ningún manejador `onError` ni estado de fallo en el lienzo, por lo que el fallo es silencioso. **La Fase 1 empieza por confirmar cuál de las dos fuentes falla** (instrumentación temporal `onError` + verificación del enlace firmado en producción) y solo después aplica la corrección.

Corrección prevista una vez confirmado: preferir siempre el enlace persistente sobre el temporal, revalidar la carga con `onError` (reintento + regeneración del enlace firmado), mostrar un estado visible "no se pudo cargar tu diseño, vuelve a subirlo" en lugar de un icono roto, y acortar la vigencia del enlace firmado a un valor aceptado con renovación bajo demanda.

## (b) Todas las zonas de impresión reales del producto

Hoy el sistema sí lee las zonas del proveedor (`catalog.server.ts:274-290`), pero toma **solo las de una variante**: la seleccionada, o la primera que tenga zonas. Si esa variante trae únicamente "frente", el resto de zonas del producto (espalda, etiqueta, área completa) desaparecen de la interfaz. Además, `generateMockups` envía una sola zona con una sola imagen (`catalog.server.ts:352-359`).

Cambio propuesto:
- Unir las zonas de **todas** las variantes del producto/proveedor, sin duplicar por identificador, conservando ancho y alto reales de cada una.
- Marcar por zona qué variantes la soportan, para no ofrecer una zona imposible en la talla/color elegido.
- Conservar el orden natural (frente, espalda, mangas, etiqueta, área completa) y traducir etiquetas con el diccionario que ya existe, sin exponer nombres de proveedor.
- Guardar el diseño **por zona** en el borrador (posición, escala, giro y modo de llenado propios), en vez de un único estado global.

## (c) Herramientas mínimas de paridad

Sobre el lienzo, con la proporción exacta del área imprimible:
- **Ajustar (fit)**: el diseño entra completo dentro del área.
- **Rellenar (fill/cover)**: el diseño cubre el área completa; lo que sobra se recorta. Resuelve el caso de la corbata de patrón completo.
- **Repetir patrón (tile)**: el diseño se repite en mosaico con densidad regulable, generando una imagen compuesta del tamaño real del área.
- **Centrar** y **escala libre**: se elimina el tope actual de escala 1 (`CustomizeStep.tsx:294`, límite duplicado en `catalog.server.ts:337`) y se permite pasar de 1 con aviso de recorte.
- **Móvil**: controles de tamaño y giro pegados al lienzo (barra flotante bajo el área), no al final de la columna.
- Aviso de resolución: si la imagen es pequeña para el área a la escala elegida, se advierte antes de publicar.

## (d) Previsualización real

- Vista fiel inmediata en el lienzo (misma proporción, mismo recorte, misma repetición que se enviará a fabricación).
- Vista previa del producto con el diseño: se sigue usando la generación de maquetas ya existente, pero enviando la zona correcta y la imagen efectiva (para "repetir patrón" se envía la imagen compuesta, ya que el proveedor no repite por sí solo).
- La composición del patrón se hace en el navegador con lienzo HTML y se sube al mismo almacenamiento de diseños. Sin dependencias nuevas.

---

## (e) Fases, archivos, riesgos y pruebas

Los 3 escenarios de verificación en cada fase: **A** flujo normal en escritorio, **B** flujo en móvil (pantalla angosta, gesto táctil), **C** condición degradada (enlace de imagen caído, red lenta, producto sin zonas de impresión).

### Fase 1 — Bug de la imagen invisible (base de todo)
Archivos: `src/components/crear/DesignCanvas.tsx`, `src/components/crear/CustomizeStep.tsx`.
Trabajo: confirmar la fuente que falla; priorizar enlace persistente; `onError` con reintento y regeneración del enlace firmado; estado visible de fallo; vigencia del enlace ajustada.
Riesgo: bajo. Solo presentación y obtención del enlace.
Pruebas: A y B suben una imagen y la ven en el lienzo; C con enlace inválido muestra el mensaje amable y el botón para volver a subir, nunca un icono roto.
Complejidad: baja (S).

### Fase 2 — Todas las zonas de impresión
Archivos: `src/lib/catalog.server.ts` (unión de zonas por variante), `src/lib/product-draft.ts` (estado por zona), `src/components/crear/CustomizeStep.tsx` (selector de zonas con miniaturas y estado "con diseño / vacía").
Trabajo: unión de zonas, soporte por variante, diseño independiente por zona, envío de la zona correcta a la vista previa.
Riesgo: medio. Puede cambiar la zona por omisión de productos ya publicados; se mitiga conservando "frente" como preselección cuando existe y sin alterar productos ya guardados.
Pruebas: A en un producto con varias zonas (playera) y en uno de área completa (corbata); B selector usable en móvil; C producto sin zonas mantiene el mensaje actual de "se vende tal cual".
Complejidad: media (M).

### Fase 3 — Herramientas de llenado y controles cercanos
Archivos: `src/components/crear/DesignCanvas.tsx`, `src/components/crear/CustomizeStep.tsx`, `src/lib/product-draft.ts`, y el tope de escala en `src/lib/catalog.server.ts`.
Trabajo: ajustar / rellenar / repetir patrón / centrar, escala libre, recorte fiel, barra de controles bajo el lienzo en móvil, aviso de resolución.
Riesgo: medio. El tope de escala existe para evitar diseños fuera de área; se sustituye por recorte controlado más aviso, no por envío sin validar.
Pruebas: A rellenar y repetir patrón en la corbata y comprobar cobertura total; B gesto de arrastre y control deslizante en móvil; C imagen de baja resolución dispara el aviso.
Complejidad: media-alta (L).

### Fase 4 — Vista previa fiel y patrón compuesto
Archivos: `src/components/crear/MockupsStep.tsx`, `src/lib/catalog.functions.ts`, `src/lib/catalog.server.ts`, más un módulo nuevo de composición en el navegador (`src/lib/design-compose.ts`).
Trabajo: componer en el navegador la imagen final del modo "repetir patrón" al tamaño real del área, subirla al almacenamiento existente y enviarla a la generación de maquetas con la zona correcta.
Riesgo: medio. Imágenes compuestas grandes pueden ser pesadas en móviles antiguos; se limita el tamaño máximo de composición.
**Excepción de base de datos a señalar**: si se decide guardar más de una zona por producto publicado, harían falta columnas nuevas. Propuesta: **no** hacerlo en esta fase; publicar con la zona principal y dejar el multizona persistente para una fase posterior con autorización explícita.
Pruebas: A la maqueta muestra el patrón completo; B generación desde móvil; C fallo del proveedor muestra mensaje amable y conserva el diseño.
Complejidad: media-alta (L).

### Fase 5 (opcional) — Multizona persistente
Requiere cambio de esquema para guardar varias zonas por producto. Solo si lo autorizas después de ver las fases 1 a 4 en producción. Complejidad alta (XL).

---

## (f) Resumen de complejidad

| Fase | Alcance | Complejidad |
|---|---|---|
| 1 | Bug imagen invisible | Baja |
| 2 | Todas las zonas de impresión | Media |
| 3 | Herramientas de llenado | Media-alta |
| 4 | Vista previa fiel y patrón | Media-alta |
| 5 | Multizona persistente (opcional) | Alta |

Nada del flujo actual de publicación se modifica hasta la Fase 4, y esa fase mantiene compatibilidad con lo que ya funciona en producción.
