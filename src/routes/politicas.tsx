import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/politicas")({
  head: () => ({
    meta: [
      { title: "Políticas de compra — Dªtªblɛ" },
      {
        name: "description",
        content:
          "Políticas de compra, envíos, devoluciones y tratamiento de datos de las tiendas alojadas en Dªtªblɛ.",
      },
    ],
  }),
  component: Politicas,
});

const TEXTO = `
# Políticas de compra

Estas políticas aplican a todas las compras realizadas en las tiendas alojadas en Dªtªblɛ.

## 1. Cómo se fabrican los productos

Todos los productos de esta tienda se fabrican bajo pedido. Esto significa que nada está hecho de antemano: la pieza que compras empieza a producirse una vez que se confirma tu pago, con el diseño que eligió la tienda.

Por eso el plazo de entrega se compone de dos tiempos: el de producción y el de envío.

## 2. Tiempos de entrega

El plazo estimado de cada producto se muestra durante la compra y corresponde al tiempo que informa el taller de fabricación para ese artículo en particular.

Los plazos se cuentan en días hábiles, de lunes a viernes, sin contar sábados, domingos ni días festivos oficiales en México. El conteo inicia el día hábil siguiente a la confirmación del pago.

Los plazos son estimados. Pueden variar por temporada alta, causas de fuerza mayor o retrasos de la paquetería.

## 3. Costo de envío

El costo de envío se calcula y se muestra antes de pagar, como un concepto separado del precio del producto. Es el costo real que cobra el taller de fabricación por enviar tu pedido a México.

## 4. Devoluciones y cambios

Al tratarse de productos fabricados bajo pedido, no aceptamos devoluciones ni cambios en los siguientes casos:

- Te equivocaste de talla.
- Te equivocaste de color.
- Cambiaste de opinión después de recibirlo.
- El color se ve distinto en tu pantalla que en persona.
- Daños ocurridos después de la entrega, incluidos los causados por el lavado o el uso.

Cada producto incluye su guía de tallas y su descripción. Te pedimos revisarlas antes de comprar.

## 5. Productos defectuosos, dañados o equivocados

Sí respondemos en estos casos:

- El producto llegó dañado.
- El producto tiene un defecto de fabricación.
- El diseño se imprimió mal: colocación incorrecta, colores equivocados o artículo equivocado.
- Recibiste un producto distinto al que pediste.
- El paquete se perdió o se dañó en tránsito.

En cualquiera de estos casos te ofrecemos, a tu elección, la reposición del producto sin costo o el reembolso completo.

### Cómo reportarlo

Escríbenos a hola@datable.com.mx dentro de los 30 días naturales posteriores a la entrega del producto, incluyendo:

- Tu número de pedido.
- Una fotografía clara donde se vea el problema.
- Si el problema afecta a varios artículos del mismo pedido, una fotografía o video adicional donde se vean todos los artículos afectados en una sola toma.

No necesitas devolvernos el producto. Consérvalo.

Pasados los 30 días posteriores a la entrega ya no es posible atender el reclamo.

## 6. Qué no se considera un defecto

Estas características son consecuencia natural del método de fabricación y no dan lugar a reposición ni reembolso:

- Estampado directo sobre tela: existe una tolerancia de hasta 1.3 cm (media pulgada) en la colocación del diseño. Las variaciones menores de posición no se consideran defecto.
- Bordado: pequeñas variaciones en la densidad o la textura de la puntada, y la visibilidad o textura del refuerzo del bordado en el interior de la prenda.

## 7. Dirección de entrega incorrecta

La dirección de envío es responsabilidad de quien compra. Si el pedido no puede entregarse porque la dirección estaba incompleta o equivocada, las opciones son:

- Reenviarlo, cubriendo nuevamente el costo de fabricación y envío.
- Reembolso parcial, únicamente del precio del producto, sin el costo de envío.

Te pedimos revisar tu dirección con cuidado antes de confirmar.

## 8. Cancelaciones

Un pedido puede cancelarse únicamente si la producción no ha comenzado. Una vez que el taller inicia la fabricación no es posible cancelar, porque la pieza ya se está haciendo exclusivamente para ti. Si necesitas cancelar, escríbenos lo antes posible a hola@datable.com.mx.

## 9. Pagos

Los pagos se procesan mediante una pasarela de pago certificada. No almacenamos los datos de tu tarjeta en ningún momento. Los precios están expresados en pesos mexicanos (MXN).

## 10. Datos personales

Los datos que nos proporcionas —nombre, correo, teléfono y dirección— se usan exclusivamente para procesar y entregar tu pedido y para comunicarnos contigo sobre él. Se comparten únicamente con el taller de fabricación y la paquetería, en la medida necesaria para hacerte llegar tu compra. No se venden ni se ceden a terceros con fines publicitarios.

Puedes solicitar el acceso, la corrección o la eliminación de tus datos escribiendo a hola@datable.com.mx.

## 11. Contacto

Correo: hola@datable.com.mx

## Responsable

Alejandra Ramírez Rojas

RFC: RARA840413N99

Domicilio fiscal: Arrecife Boca Paila #109, Fraccionamiento Las Moras, Puerto Vallarta, Jalisco, C.P. 48315
`;

function Politicas() {
  const bloques = TEXTO.trim().split("\\n\\n");
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <article className="space-y-4">
        {bloques.map((b, i) => {
          const linea = b.trim();
          if (linea.startsWith("### ")) {
            return (
              <h3 key={i} className="pt-4 text-lg font-semibold">
                {linea.slice(4)}
              </h3>
            );
          }
          if (linea.startsWith("## ")) {
            return (
              <h2 key={i} className="pt-6 text-xl font-bold">
                {linea.slice(3)}
              </h2>
            );
          }
          if (linea.startsWith("# ")) {
            return (
              <h1 key={i} className="text-3xl font-bold">
                {linea.slice(2)}
              </h1>
            );
          }
          if (linea.startsWith("- ")) {
            return (
              <ul key={i} className="list-disc space-y-1 pl-6 text-sm leading-relaxed text-muted-foreground">
                {linea.split("\\n").map((li, j) => (
                  <li key={j}>{li.replace(/^- /, "")}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {linea}
            </p>
          );
        })}
      </article>
    </main>
  );
}
