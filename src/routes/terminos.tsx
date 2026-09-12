import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos del servicio para vendedoras — Dªtªblɛ" },
      {
        name: "description",
        content:
          "Condiciones del servicio entre Dªtªblɛ y las personas que abren una tienda en la plataforma.",
      },
    ],
  }),
  component: Terminos,
});

const TEXTO = `
# Términos del servicio para vendedoras

Este documento regula la relación entre Dªtªblɛ y las personas que abren una tienda en la plataforma. Es distinto de las Políticas de compra, que regulan la relación entre tu tienda y quien te compra.

## 1. Qué es Dªtªblɛ y qué no es

Dªtªblɛ te da una tienda en línea, el catálogo de productos, el cobro y la conexión con el taller de fabricación.

Dªtªblɛ no fabrica los productos. La fabricación y el envío los realiza un taller externo con el que Dªtªblɛ mantiene la relación comercial. Tú no tienes trato directo con ese taller, y no lo necesitas: todo pasa por la plataforma.

## 2. Tu tienda y tus productos

Tú eliges qué productos ofreces, con qué diseño y a qué precio. Eres responsable de:

- Tener los derechos sobre los diseños que subes. No puedes usar marcas, logotipos, personajes ni obras de terceros sin autorización.
- La descripción y las imágenes de tus productos.
- Atender a tus clientas y responder sus dudas.

Dªtªblɛ puede retirar un producto o suspender una tienda si detecta contenido que infrinja derechos de terceros o que sea ilegal, violento, sexual explícito, o que promueva odio o daño.

## 3. Precios, ganancia y comisión

- Cada producto tiene un costo base que la plataforma te muestra antes de publicarlo. Ese es tu costo: comprende la fabricación del producto y el servicio de Dªtªblɛ.
- Tú fijas el precio de venta, con un único límite: nunca por debajo del costo base.
- Tu ganancia es la diferencia entre tu precio de venta y el costo base.
- Dªtªblɛ cobra una comisión del 20% sobre tu ganancia, nunca sobre el precio de venta ni sobre el costo base.
- El envío no entra en este cálculo. Se cobra a la clienta como concepto separado, al costo real de envío, y no se descuenta de tu ganancia ni genera comisión.

Ejemplo: un producto con costo base de $140. Lo vendes en $200. Tu ganancia es $60, la comisión de Dªtªblɛ es $12, y tú recibes $48. El envío que pagó tu clienta se destina íntegramente a cubrir el envío.

### Productos que no están en existencia

Si el precio de un producto queda por debajo de su costo base, ese producto deja de estar en existencia automáticamente: sigue apareciendo en tu panel, pero tus clientas no pueden comprarlo. Tu panel te indica cuál es el precio mínimo para que vuelva a estar disponible.

Esta regla no se negocia ni admite excepciones. Existe para que ningún pedido entre en producción sin cubrir lo que cuesta fabricarlo y respaldarlo.

## 4. Cobros y liquidación

Los pagos de tus clientas se procesan mediante una pasarela certificada y se reciben a nombre de Dªtªblɛ, que a su vez paga la fabricación y el envío al taller.

### Retención de 30 días

Tu ganancia por cada pedido se retiene durante los 30 días naturales posteriores a la entrega, que es exactamente el plazo en el que tu clienta puede reportar un producto defectuoso. Cumplido ese plazo sin reclamos, la ganancia de ese pedido queda liberada y disponible para liquidación.

Esta retención existe para proteger a ambas partes: si se te liquidara la ganancia el mismo día de la venta y a los veinte días hubiera que reponer el producto, quedaría un saldo en contra.

Si dentro de esos 30 días se presenta un reclamo aprobado y el pedido se reembolsa, la ganancia de ese pedido no se libera.

### Periodicidad y monto mínimo

- Las liquidaciones se procesan cada quincena, e incluyen únicamente los pedidos cuya ganancia ya esté liberada conforme al punto anterior.
- El monto mínimo de liquidación es de $150 MXN. Este mínimo cubre el costo de la transferencia bancaria, ida y vuelta, para que la comisión no se coma tu ganancia.
- Si al cierre de la quincena tu saldo liberado es menor a $150 MXN, no se pierde: se acumula para la siguiente liquidación, hasta alcanzar el mínimo.
- Al cerrar tu tienda se liquida el saldo liberado completo, sin aplicar el mínimo.

## 5. Productos defectuosos: cómo funciona y qué te toca

Esta es la parte más importante de este documento. Léela completa.

### Quién responde

El taller de fabricación ofrece reposición sin costo o reembolso completo cuando un producto llega dañado, con defecto de fabricación, mal impreso, equivocado, o cuando se pierde en tránsito.

El reclamo ante el taller sólo puede levantarlo Dªtªblɛ, porque es quien tiene la cuenta con él. Tú no puedes hacerlo directamente, aunque quieras. Por eso el procedimiento es el siguiente.

### Tu obligación: avisar a tiempo

El taller acepta reclamos únicamente dentro de los 30 días posteriores a la entrega. Para que Dªtªblɛ alcance a reunir la evidencia y presentarlo, tú debes reportarlo dentro de los primeros 20 días posteriores a la entrega, escribiendo a hola@datable.com.mx con:

- El número de pedido.
- Fotografía clara del problema.
- Si afecta a varios artículos, una foto o video de todos juntos en una sola toma.

Si reportas después del día 20, Dªtªblɛ hará el intento, pero no puede garantizar que el taller acepte el reclamo. Pasados los 30 días, el reclamo se pierde y el costo no es recuperable.

### Qué pasa después

Dªtªblɛ presenta el reclamo, da seguimiento y te informa el resultado. Si el taller lo aprueba, la reposición se envía a tu clienta sin costo para ti ni para ella, o se aplica el reembolso correspondiente.

Si el taller lo rechaza por considerar que no es un defecto, Dªtªblɛ te entregará la respuesta y la justificación.

### Lo que el taller no cubre

No hay reposición ni reembolso si tu clienta pidió la talla o el color equivocado, si cambió de opinión, si el daño ocurrió después de la entrega, ni si la dirección de envío estaba mal escrita.

Tampoco se consideran defectos las variaciones menores propias del método: hasta 1.3 cm de tolerancia en la colocación del estampado directo sobre tela, y pequeñas variaciones de densidad o textura en los bordados.

### Tu responsabilidad frente a tu clienta

Las Políticas de compra que se muestran en tu tienda ya recogen todo lo anterior. No ofrezcas a tus clientas condiciones distintas —plazos más largos, devoluciones por arrepentimiento, garantías adicionales— porque el taller no las cubrirá y el costo recaería íntegramente en ti.

## 6. Cancelación y cierre de tu tienda

Puedes cerrar tu tienda cuando quieras. Los pedidos ya pagados se completan con normalidad y tu ganancia pendiente se te liquida conforme al punto 4.

Dªtªblɛ puede suspender una tienda por incumplimiento de estos términos, previo aviso, salvo en casos de contenido ilegal donde la suspensión es inmediata.

## 7. Datos de tus clientas

Los datos de tus clientas se tratan conforme a las Políticas de compra. No puedes usarlos para fines distintos a la atención de sus pedidos, ni cederlos o venderlos a terceros.

## 8. Cambios a estos términos

Dªtªblɛ puede modificar estos términos avisando por correo con al menos 15 días naturales de anticipación. Si no estás de acuerdo, puedes cerrar tu tienda antes de que entren en vigor.

## 9. Contacto

Correo: hola@datable.com.mx

## Titular de la plataforma

Alejandra Ramírez Rojas

RFC: RARA840413N99

Domicilio fiscal: Arrecife Boca Paila #109, Fraccionamiento Las Moras, Puerto Vallarta, Jalisco, C.P. 48315
`;

function Terminos() {
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
