type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    /** Datos extra del editor (producto, zona, archivo) para el próximo error. */
    __datableEditorContext?: Record<string, unknown>;
  }
}

/**
 * Contexto del dispositivo: sirve para confirmar si un fallo es por presión de
 * memoria del navegador. Nunca contiene datos personales.
 */
function deviceContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };
  const mem = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;
  return {
    route: window.location.pathname,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    deviceMemoryGb: nav.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    connection: nav.connection?.effectiveType ?? null,
    jsHeapUsedMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    jsHeapLimitMb: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
    ...(window.__datableEditorContext ?? {}),
  };
}

/** Guarda el contexto del editor (producto, zona, tamaño del archivo). */
export function setEditorErrorContext(context: Record<string, unknown> | null) {
  if (typeof window === "undefined") return;
  if (!context) delete window.__datableEditorContext;
  else window.__datableEditorContext = { ...window.__datableEditorContext, ...context };
}

export function reportLovableError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: LovableErrorOptions = {},
) {
  if (typeof window === "undefined") return;
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[datable] error reportado:", err, context);
  window.__lovableEvents?.captureException?.(
    err,
    {
      source: "react_error_boundary",
      message: err.message,
      stack: err.stack ?? null,
      ...deviceContext(),
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
      ...options,
    },
  );
}

let listenersInstalled = false;

/** Registra los errores del navegador que ocurren fuera de React. */
export function installGlobalErrorReporting() {
  if (typeof window === "undefined" || listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener("error", (event) => {
    reportLovableError(
      event.error ?? event.message,
      { source: "window_error", file: event.filename ?? null, line: event.lineno ?? null },
      { mechanism: "onerror", handled: false },
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportLovableError(
      event.reason,
      { source: "unhandled_rejection" },
      { mechanism: "unhandledrejection", handled: false },
    );
  });
}
