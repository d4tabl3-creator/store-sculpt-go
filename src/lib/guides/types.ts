/**
 * Sistema de acompañamiento del cliente (client-safe: sólo tipos y contratos).
 *
 * Una guía es un recorrido de pasos. Cada paso declara cómo se comprueba:
 *  - "auto": DªTªBLe lo reconoce por el estado real del activo.
 *  - "manual": el cliente lo marca cuando lo hace.
 *
 * Ninguna guía menciona proveedores concretos.
 */

/** Señales reales que DªTªBLe puede comprobar hoy sobre un activo. */
export type GuideSignal =
  | "asset_ready" // la preparación del activo terminó
  | "has_products" // el activo tiene al menos un producto
  | "payment_email_set" // hay correo de cobros configurado
  | "is_published" // el activo está publicado
  | "has_paid_order"; // existe al menos un pedido pagado

export type GuideStep = {
  id: string;
  title: string;
  /** Traducción al inglés (el idioma se detecta del dispositivo). */
  titleEn?: string;
  /** Explicación corta, en lenguaje del cliente. */
  body: string;
  bodyEn?: string;
  /** Qué hace exactamente el cliente en este paso. */
  action?: { label: string; to: string; params?: Record<string, string> } | null;
  /** Cómo sabe DªTªBLe que ya está hecho. */
  check: { kind: "auto"; signal: GuideSignal } | { kind: "manual" };
  /** Cómo sabe el cliente que terminó bien. */
  done?: string;
  doneEn?: string;
};

export type GuideDefinition = {
  id: string;
  title: string;
  titleEn?: string;
  intro: string;
  introEn?: string;
  steps: GuideStep[];
  help: string;
  helpEn?: string;
};

/** Clave de resolución: tipo de activo + proveedor (ambos opcionales). */
export type GuideMatch = {
  assetType?: string;
  provider?: string;
};

export type GuideStepState = GuideStep & {
  completed: boolean;
  /** true cuando el sistema lo reconoció solo. */
  auto: boolean;
};

export type GuideState = {
  guideId: string;
  title: string;
  titleEn?: string;
  intro: string;
  introEn?: string;
  help: string;
  helpEn?: string;
  steps: GuideStepState[];
  currentStepId: string | null;
  completedCount: number;
  totalCount: number;
  progress: number;
  finished: boolean;
};
