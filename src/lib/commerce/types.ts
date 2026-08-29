/**
 * Commerce Orchestrator — contratos de dominio.
 *
 * Este archivo es client-safe: sólo tipos y constantes. La UI lo usa para
 * mostrar el progreso de preparación de un Activo Digital sin conocer jamás
 * qué proveedor está detrás.
 */

export type ProviderId =
  | "internal"
  | "shopify"
  | "printful"
  | "printify"
  | "woocommerce"
  | "mercadolibre";

export type ProvisioningStatus =
  | "queued"
  | "creating"
  | "linking"
  | "seeding"
  | "webhooks"
  | "ready"
  | "failed";

/** Pasos visibles al usuario. Nunca nombran al proveedor. */
export const PROVISION_STEPS: Array<{
  key: ProvisioningStatus;
  label: string;
  progress: number;
}> = [
  { key: "queued", label: "Reservando tu espacio de trabajo", progress: 8 },
  { key: "creating", label: "Creando tu tienda independiente", progress: 28 },
  { key: "linking", label: "Conectando proveedores y pagos", progress: 50 },
  { key: "seeding", label: "Cargando catálogo e inventario", progress: 74 },
  { key: "webhooks", label: "Activando pedidos y sincronización", progress: 92 },
  { key: "ready", label: "Tu Activo Digital está listo", progress: 100 },
];

export function stepLabel(status: ProvisioningStatus): string {
  return PROVISION_STEPS.find((s) => s.key === status)?.label ?? "Preparando";
}

export type ProvisioningView = {
  storeId: string;
  status: ProvisioningStatus;
  step: ProvisioningStatus;
  progress: number;
  error: string | null;
  readyAt: string | null;
};

// ---------------------------------------------------------------------------
// Contratos que implementa cada conector (server-side)
// ---------------------------------------------------------------------------

export type ProviderStoreContext = {
  storeId: string;
  ownerId: string;
  storeName: string;
  slug: string;
  primaryColor: string;
  ownerEmail?: string | null;
};

export type ProviderCredentials = {
  adminToken?: string | null;
  webhookSecret?: string | null;
  apiVersion?: string | null;
  extra?: Record<string, unknown>;
};

export type ProviderBinding = {
  storeId: string;
  provider: ProviderId;
  externalStoreId: string | null;
  externalDomain: string | null;
  credentials: ProviderCredentials;
};

export type ProviderProduct = {
  productId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  stock: number;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  externalInventoryItemId?: string | null;
  /** Origen real en el catálogo del proveedor (si el producto vino de ahí). */
  sourceProvider?: string | null;
  sourceProductId?: string | null;
  sourceVariantId?: string | null;
  /** Diseño asociado, en formato neutral. */
  design?: DesignAssetRef | null;
};

export type ProviderProductResult = {
  externalProductId: string | null;
  externalVariantId: string | null;
  externalInventoryItemId: string | null;
  /** Archivo de impresión guardado en la biblioteca del proveedor, si aplica. */
  externalFileId?: string | null;
  externalTemplateId?: string | null;
};

export type ProviderOrderLine = {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  externalVariantId?: string | null;
  /** Diseño asociado a la línea, en formato neutral (ver DesignAsset). */
  design?: DesignAssetRef | null;
};

/** Dirección estructurada, neutral respecto al proveedor. */
export type ShippingDetails = {
  address1: string;
  address2?: string | null;
  city: string;
  stateCode?: string | null;
  stateName?: string | null;
  countryCode: string;
  zip: string;
};

export type ProviderOrder = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  /** Dirección estructurada cuando existe; los conectores la prefieren. */
  shipping?: ShippingDetails | null;
  totalCents: number;
  lines: ProviderOrderLine[];
};

// ---------------------------------------------------------------------------
// Diseños: representación neutral
// ---------------------------------------------------------------------------

/**
 * Un diseño puede venir de tres orígenes y la arquitectura no distingue entre
 * ellos: carga directa, editor provisional de DªTªBLe, o el Creador de Diseños
 * Integrado del proveedor cuando esté disponible.
 */
export type DesignSource = "upload" | "provisional_editor" | "embedded_designer";

export type DesignAssetRef = {
  /** URL pública/firmada del archivo de impresión. */
  url?: string | null;
  /** Identificador del archivo en la biblioteca del proveedor. */
  externalFileId?: string | null;
  /** Identificador de plantilla del proveedor, si el diseño se guardó como tal. */
  externalTemplateId?: string | null;
  placement?: string | null;
  source?: DesignSource;
};

export type ProviderFileResult = {
  externalFileId: string;
  url: string;
  previewUrl: string | null;
  status: string;
};

export type ProviderTemplate = {
  externalTemplateId: string;
  title: string;
  externalProductId: string | null;
  previewUrl: string | null;
};

export type SizeGuideTable = {
  type: string;
  unit: string;
  description: string | null;
  rows: Array<Record<string, string>>;
};

export type ShippingRate = {
  id: string;
  label: string;
  costUsd: number;
  currency: string;
  minDays: number | null;
  maxDays: number | null;
};

/**
 * Capacidades declaradas por cada conector. El orquestador consulta esto y
 * jamás asume que un proveedor soporta algo: así Travelino, Mega Travel o
 * cualquier otro proveedor futuro se integran sin reescribir el núcleo.
 */
export type ProviderCapabilities = {
  catalog: boolean;
  variants: boolean;
  fileLibrary: boolean;
  templates: boolean;
  mockups: boolean;
  sizeGuide: boolean;
  shippingRates: boolean;
  orderTracking: boolean;
  webhooks: boolean;
  /** Creador de diseños oficial embebible dentro de DªTªBLe. */
  embeddedDesigner: boolean;
};

export const NO_CAPABILITIES: ProviderCapabilities = {
  catalog: false,
  variants: false,
  fileLibrary: false,
  templates: false,
  mockups: false,
  sizeGuide: false,
  shippingRates: false,
  orderTracking: false,
  webhooks: false,
  embeddedDesigner: false,
};


export type ProviderOrderResult = {
  externalOrderId: string | null;
  fulfillmentStatus: string;
};

export type NormalizedWebhook = {
  topic: string;
  externalStoreId: string | null;
  externalDomain: string | null;
  payload: Record<string, unknown>;
};

export interface CommerceProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** Lo que este conector sabe hacer de verdad. El orquestador nunca asume. */
  readonly capabilities: ProviderCapabilities;
  /** ¿Tiene credenciales de plataforma para operar? Si no, el orquestador degrada al motor nativo. */
  isConfigured(): boolean;

  /** Crea la tienda aislada del cliente en el proveedor. */
  provisionStore(ctx: ProviderStoreContext): Promise<{
    externalStoreId: string;
    externalDomain: string;
    credentials: ProviderCredentials;
  }>;
  /** Registra los webhooks de pedidos/inventario apuntando a DªTªBLe. */
  registerWebhooks(binding: ProviderBinding, callbackUrl: string): Promise<void>;
  upsertProduct(binding: ProviderBinding, product: ProviderProduct): Promise<ProviderProductResult>;
  deleteProduct(binding: ProviderBinding, externalProductId: string): Promise<void>;
  setInventory(binding: ProviderBinding, product: ProviderProduct, stock: number): Promise<void>;
  createOrder(binding: ProviderBinding, order: ProviderOrder): Promise<ProviderOrderResult>;
  /** Verifica firma y normaliza un webhook entrante. Devuelve null si la firma es inválida. */
  verifyAndParseWebhook(
    rawBody: string,
    headers: Headers,
    secret: string | null,
  ): Promise<NormalizedWebhook | null>;
  /** Libera recursos del proveedor cuando se elimina el Activo Digital. */
  teardown(binding: ProviderBinding): Promise<void>;

  // --- Opcionales: sólo si la capacidad correspondiente está declarada ---

  /** Sube un archivo de impresión a la biblioteca del proveedor (permanente). */
  uploadDesignFile?(
    binding: ProviderBinding,
    input: { url: string; filename?: string | null },
  ): Promise<ProviderFileResult>;
  /** Plantillas de producto guardadas en el proveedor. */
  listTemplates?(binding: ProviderBinding): Promise<ProviderTemplate[]>;
  getTemplate?(binding: ProviderBinding, externalTemplateId: string): Promise<ProviderTemplate | null>;
  /** Guía de tallas real del producto de catálogo. */
  getSizeGuide?(externalProductId: string): Promise<SizeGuideTable[]>;
  /** Costos y tiempos de envío reales para una dirección concreta. */
  estimateShipping?(
    binding: ProviderBinding,
    input: { shipping: ShippingDetails; lines: ProviderOrderLine[] },
  ): Promise<ShippingRate[]>;
}


export class OrchestratorError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly retriable: boolean = true,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "OrchestratorError";
  }
}
