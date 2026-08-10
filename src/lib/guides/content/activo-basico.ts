import type { GuideDefinition } from "../types";

/**
 * CONTENIDO PROVISIONAL — marcador.
 *
 * La redacción definitiva la entrega el equipo de DªTªBLe. Aquí sólo existe
 * el esqueleto necesario para comprobar que el recorrido funciona de punta a
 * punta. La estructura es independiente del proveedor: sólo describe lo que
 * el cliente puede hacer hoy dentro de DªTªBLe.
 */
export const guideAssetBasico: GuideDefinition = {
  id: "activo-basico",
  title: "Guía de inicio de tu activo",
  intro:
    "[Texto provisional] Tu activo ya existe. Esta guía te dice, paso por paso, qué hacer ahora para dejarlo listo para operar y vender.",
  help:
    "[Texto provisional] Si algo no te queda claro, escríbenos desde tu cuenta y te acompañamos hasta que tu activo esté vendiendo.",
  steps: [
    {
      id: "recibe-activo",
      title: "Tu activo está preparado",
      body: "[Texto provisional] Terminamos de preparar tu activo. Aquí confirmas que ya está disponible en tu panel.",
      check: { kind: "auto", signal: "asset_ready" },
      done: "Aparece como preparado en tu panel.",
    },
    {
      id: "revisa-catalogo",
      title: "Revisa tus productos",
      body: "[Texto provisional] Entra a tu activo y revisa los productos que ya tienes cargados: nombre, descripción y precio.",
      action: { label: "Revisar mi activo", to: "/tienda/$id" },
      check: { kind: "auto", signal: "has_products" },
      done: "Tu activo tiene al menos un producto listo.",
    },
    {
      id: "ajusta-precios",
      title: "Ajusta tus precios",
      body: "[Texto provisional] Decide con qué precio quieres salir. Puedes cambiarlo cuando quieras.",
      action: { label: "Editar precios", to: "/tienda/$id" },
      check: { kind: "manual" },
      done: "Estás conforme con los precios que verá tu cliente.",
    },
    {
      id: "configura-cobros",
      title: "Configura cómo vas a cobrar",
      body: "[Texto provisional] Indica el correo con el que recibirás la información de tus cobros.",
      action: { label: "Configurar cobros", to: "/tienda/$id" },
      check: { kind: "auto", signal: "payment_email_set" },
      done: "Tu activo ya tiene datos de cobro guardados.",
    },
    {
      id: "publica",
      title: "Publica tu activo",
      body: "[Texto provisional] Al publicar, tu activo queda visible y puede recibir pedidos reales.",
      action: { label: "Publicar", to: "/tienda/$id" },
      check: { kind: "auto", signal: "is_published" },
      done: "Tu activo aparece como publicado.",
    },
    {
      id: "comparte",
      title: "Comparte tu enlace",
      body: "[Texto provisional] Copia el enlace de tu activo y compártelo con tus primeros clientes.",
      check: { kind: "manual" },
      done: "Ya compartiste tu enlace al menos una vez.",
    },
    {
      id: "primera-venta",
      title: "Tu primera venta",
      body: "[Texto provisional] Cuando entre tu primer pedido pagado, nosotros nos encargamos del resto del proceso.",
      check: { kind: "auto", signal: "has_paid_order" },
      done: "Tienes al menos un pedido pagado.",
    },
  ],
};
