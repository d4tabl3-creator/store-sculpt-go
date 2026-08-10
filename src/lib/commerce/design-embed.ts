/**
 * Capa de montaje del Creador de Diseños Integrado (oficial del proveedor).
 *
 * Estado: PENDIENTE de acuerdo Enterprise con el proveedor.
 *
 * Reglas de esta capa:
 *  - No contiene ninguna simulación del creador oficial.
 *  - No conoce ni depende del editor provisional de DªTªBLe.
 *  - Cuando el proveedor conceda el acceso, se rellena `mount()` y se activa
 *    la bandera: ni el orquestador, ni la base de datos, ni el asistente de
 *    creación necesitan cambios.
 *
 * Es client-safe: sólo tipos, banderas y un contrato de montaje.
 */

import type { DesignAssetRef, ProviderId } from "./types";

export type EmbeddedDesignerContext = {
  provider: ProviderId;
  storeId: string;
  /** Producto del catálogo sobre el que se diseña. */
  externalProductId: string;
  externalVariantIds: number[];
  locale?: string;
};

/** Resultado neutral que devuelve cualquier creador de diseños. */
export type EmbeddedDesignerResult = {
  design: DesignAssetRef;
  previewUrl: string | null;
};

export type EmbeddedDesignerAdapter = {
  /** Monta el creador oficial dentro del contenedor dado. */
  mount(
    container: HTMLElement,
    ctx: EmbeddedDesignerContext,
    onDone: (result: EmbeddedDesignerResult) => void,
  ): Promise<() => void>;
};

/**
 * Adaptador activo. Permanece en null hasta que exista acceso oficial.
 * Registrarlo es el único paso necesario para sustituir el editor provisional.
 */
let adapter: EmbeddedDesignerAdapter | null = null;

export function registerEmbeddedDesigner(next: EmbeddedDesignerAdapter) {
  adapter = next;
}

export function getEmbeddedDesigner(): EmbeddedDesignerAdapter | null {
  return adapter;
}

/** ¿Está disponible el creador oficial? Si no, DªTªBLe usa el editor provisional. */
export function isEmbeddedDesignerAvailable(): boolean {
  return adapter !== null;
}
