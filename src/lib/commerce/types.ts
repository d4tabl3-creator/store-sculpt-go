/**
 * Commerce Orchestrator — contratos de dominio.
 *
 * Este archivo es client-safe: sólo tipos y constantes. La UI lo usa para
 * mostrar el progreso de preparación de un Activo Digital sin conocer jamás
 * qué proveedor está detrás.
 */

export type ProviderId = "internal" | "shopify" | "printful" | "woocommerce" | "mercadolibre";

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
};

export type ProviderProductResult = {
  externalProductId: string | null;
  externalVariantId: string | null;
  externalInventoryItemId: string | null;
};

export type ProviderOrderLine = {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  externalVariantId?: string | null;
};

export type ProviderOrder = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  totalCents: number;
  lines: ProviderOrderLine[];
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
