/**
 * Capa de presentación del catálogo.
 *
 * El catálogo entrega textos crudos (posiciones de impresión en inglés,
 * nombres internos de las plantas de producción). Aquí se traducen al idioma
 * detectado del dispositivo y se sustituye cualquier nombre de proveedor por
 * lenguaje propio de DªTªBLe. Los IDs internos NO se tocan: se siguen usando
 * para fabricar y enviar.
 */

type T = (es: string, en: string) => string;

const PLACEMENTS: Record<string, [string, string]> = {
  front: ["Frente", "Front"],
  back: ["Espalda", "Back"],
  neck: ["Cuello", "Neck"],
  "sleeve-left": ["Manga izquierda", "Left sleeve"],
  "sleeve-right": ["Manga derecha", "Right sleeve"],
  left: ["Lado izquierdo", "Left side"],
  right: ["Lado derecho", "Right side"],
  top: ["Arriba", "Top"],
  bottom: ["Abajo", "Bottom"],
  inside: ["Interior", "Inside"],
  outside: ["Exterior", "Outside"],
  default: ["Área principal", "Main area"],
  cover: ["Portada", "Cover"],
  wrap: ["Alrededor", "Wrap"],
};

/** Nombre de la zona de impresión en el idioma del usuario. */
export function placementLabel(id: string, fallback: string, t: T): string {
  const pair = PLACEMENTS[id];
  if (pair) return t(pair[0], pair[1]);
  return fallback || id.replace(/[-_]/g, " ").replace(/^\w/, (m) => m.toUpperCase());
}

/** Nunca se muestra el nombre real de la planta de producción. */
export function productionOptionLabel(index: number, t: T): string {
  return t(`Opción de producción ${index + 1}`, `Production option ${index + 1}`);
}

const CATEGORIES: Record<string, string> = {
  "Playeras y camisetas": "T-shirts and tops",
  "Sudaderas y abrigos": "Hoodies and outerwear",
  "Gorras y sombreros": "Caps and hats",
  "Tazas y termos": "Mugs and tumblers",
  "Bolsas y mochilas": "Bags and backpacks",
  "Fundas de celular": "Phone cases",
  "Cuadros y pósters": "Wall art and posters",
  "Hogar y decoración": "Home and decor",
  Papelería: "Stationery",
  "Ropa de niños": "Kids clothing",
  Accesorios: "Accessories",
  Otros: "Other",
};

/** Categoría de DªTªBLe en el idioma del usuario. */
export function categoryLabel(name: string, t: T): string {
  const en = CATEGORIES[name];
  return en ? t(name, en) : name;
}
