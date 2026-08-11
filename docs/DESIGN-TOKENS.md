# Tokens visuales de DªTªBLe

Guía breve para usar el sistema visual de Datable de forma consistente.

## Regla principal

Los colores semánticos representan la función o el estado de una acción dentro de Datable. **Nunca representan un proveedor, una integración o una marca externa.**

Usa las clases semánticas del sistema (`bg-primary`, `text-action`, `border-success`, etc.) en lugar de introducir colores nuevos en cada pantalla.

## Tokens funcionales

| Token | Color de referencia | Significado | Úsalo para | No lo uses para |
| --- | --- | --- | --- | --- |
| `identity` (`primary`) | `#6D4AFF` | Identidad de Datable y reconocimiento de marca. | Logotipo, encabezados de identidad, elementos que identifican a Datable y selección de la marca. | Indicar que algo está terminado, falló o pertenece a un proveedor. |
| `action` | `#2563EB` | Acción principal que la persona puede ejecutar. | Botones principales, enlaces de conversión y controles que requieren una decisión. | Decorar todos los elementos ni comunicar estados del sistema. |
| `progress` | `#0D9488` | Proceso activo o trabajo en curso. | Barras de avance, pasos en ejecución, sincronizaciones y estados pendientes de completar. | Confirmar que algo ya terminó. |
| `success` | `#16A34A` | Resultado correcto o estado listo. | Confirmaciones, pasos completados, publicación activa y operaciones exitosas. | Llamar la atención sobre una acción pendiente. |
| `warning` | `#D97706` | Atención necesaria, sin indicar necesariamente un error. | Datos incompletos, vencimientos próximos, límites o decisiones que conviene revisar. | Errores definitivos o mensajes normales sin necesidad de atención. |
| `error` (`destructive`) | `#DC2626` | Fallo o acción peligrosa. | Errores, operaciones rechazadas, eliminación y consecuencias irreversibles. | Advertencias leves o estados en proceso. |
| `info` | `#0284C7` | Información útil y neutral. | Ayudas contextuales, aclaraciones y datos que mejoran la comprensión. | Éxitos, errores o llamadas principales a la acción. |

## Variantes suaves

Cada token funcional tiene una variante `-soft` para fondos sutiles, etiquetas y superficies de apoyo:

- `primary-soft`
- `action-soft`
- `progress-soft`
- `success-soft`
- `warning-soft`
- `destructive-soft`
- `info-soft`

Ejemplo: `bg-success-soft text-success` para una confirmación discreta.

## Contraste y componentes

- En superficies sólidas usa el par correspondiente `*-foreground` para mantener contraste.
- Para botones, alertas, insignias, progreso y estados reutiliza las variantes de los componentes del sistema antes de crear estilos nuevos.
- Un mismo color puede aparecer en varias pantallas si comunica la misma función; no debe cambiar de significado según el proveedor.
- Si un estado no encaja claramente en estos significados, usa los neutrales (`muted`, `secondary`, `border`) o consulta antes de añadir un token nuevo.

## Ejemplos rápidos

```tsx
<Badge className="bg-primary-soft text-primary">Identidad Datable</Badge>
<Button>Continuar</Button>
<Progress className="bg-progress" />
<Alert className="border-warning bg-warning-soft text-warning">Revisa tus datos</Alert>
```

La paleta completa, sus valores para modo claro/oscuro y las variables CSS viven en `src/styles.css`.
