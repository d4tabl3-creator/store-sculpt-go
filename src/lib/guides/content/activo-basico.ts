import type { GuideDefinition } from "../types";

/**
 * Guía de inicio real y breve. Sin texto provisional y sin mencionar
 * proveedores: sólo describe lo que el comerciante puede hacer hoy dentro
 * de DªTªBLe. Cada texto trae su versión en inglés para respetar el idioma
 * detectado del dispositivo.
 */
export const guideAssetBasico: GuideDefinition = {
  id: "activo-basico",
  title: "Guía de inicio de tu tienda",
  titleEn: "Getting your store started",
  intro: "Seis pasos para dejar tu tienda lista para vender.",
  introEn: "Six steps to get your store ready to sell.",
  help: "¿Te atoraste? Escríbenos desde tu cuenta y te acompañamos.",
  helpEn: "Stuck? Write to us from your account and we'll help you.",
  steps: [
    {
      id: "revisa-catalogo",
      title: "Revisa tus productos",
      titleEn: "Review your products",
      body: "Revisa nombre, descripción y foto de cada producto de tu tienda.",
      bodyEn: "Check the name, description and photo of each product in your store.",
      action: { label: "Ver mis productos", to: "/tienda/$id" },
      check: { kind: "auto", signal: "has_products" },
      done: "Tu tienda tiene al menos un producto.",
      doneEn: "Your store has at least one product.",
    },
    {
      id: "ajusta-precios",
      title: "Fija tus precios",
      titleEn: "Set your prices",
      body: "Define el precio de venta de cada producto. Nunca puede ser menor a su costo real.",
      bodyEn: "Set the selling price of each product. It can never be below its real cost.",
      action: { label: "Editar precios", to: "/tienda/$id" },
      check: { kind: "manual" },
      done: "Estás conforme con los precios que verá tu cliente.",
      doneEn: "You're happy with the prices your customer will see.",
    },
    {
      id: "configura-cobros",
      title: "Configura tus cobros",
      titleEn: "Set up payments",
      body: "Indica el correo donde recibirás avisos de pedidos y cobros.",
      bodyEn: "Set the email where you'll receive order and payment notifications.",
      action: { label: "Configurar cobros", to: "/tienda/$id" },
      check: { kind: "auto", signal: "payment_email_set" },
      done: "Tu tienda ya tiene datos de cobro guardados.",
      doneEn: "Your store has payment details saved.",
    },
    {
      id: "publica",
      title: "Publica tu tienda",
      titleEn: "Publish your store",
      body: "Al publicar, tu tienda queda visible y puede recibir pedidos reales.",
      bodyEn: "Once published, your store is visible and can take real orders.",
      action: { label: "Publicar", to: "/tienda/$id" },
      check: { kind: "auto", signal: "is_published" },
      done: "Tu tienda aparece como publicada.",
      doneEn: "Your store shows as published.",
    },
    {
      id: "comparte",
      title: "Comparte tu enlace",
      titleEn: "Share your link",
      body: "Copia la dirección de tu tienda y compártela con tus primeros clientes.",
      bodyEn: "Copy your store address and share it with your first customers.",
      check: { kind: "manual" },
      done: "Ya compartiste tu enlace al menos una vez.",
      doneEn: "You've shared your link at least once.",
    },
    {
      id: "primera-venta",
      title: "Tu primera venta",
      titleEn: "Your first sale",
      body: "Cuando entre tu primer pedido pagado, nosotros nos encargamos de producirlo y enviarlo.",
      bodyEn: "When your first paid order arrives, we take care of making and shipping it.",
      check: { kind: "auto", signal: "has_paid_order" },
      done: "Tienes al menos un pedido pagado.",
      doneEn: "You have at least one paid order.",
    },
  ],
};
