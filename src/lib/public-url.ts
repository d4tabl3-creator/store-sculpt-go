/**
 * URL pública única de Datable Stores.
 *
 * Centraliza el dominio del sitio para metadatos, sitemap, correos y
 * redirecciones de autenticación. El dominio definitivo es
 * https://store.datable.com.mx; puede sobreescribirse con la variable
 * PUBLIC_APP_URL (servidor) o VITE_PUBLIC_APP_URL (cliente) mientras el
 * dominio termina de configurarse.
 */
export const DEFAULT_PUBLIC_URL = "https://store.datable.com.mx";

function clean(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Base pública del sitio (sin barra final). Segura en cliente y servidor. */
export function publicUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" ? process.env?.["PUBLIC_APP_URL"] : undefined) ||
    (typeof import.meta !== "undefined"
      ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
          "VITE_PUBLIC_APP_URL"
        ]
      : undefined);
  return clean(fromEnv || DEFAULT_PUBLIC_URL);
}

/** URL absoluta pública para una ruta interna. */
export function publicUrlFor(path: string): string {
  return `${publicUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Destino de los enlaces de correo de autenticación.
 * En el navegador usa el origen actual para no sacar al usuario del entorno
 * donde inició el flujo; en cualquier otro caso usa la URL pública.
 */
export function authRedirectUrl(path = "/"): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin ? clean(window.location.origin) : publicUrl();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
