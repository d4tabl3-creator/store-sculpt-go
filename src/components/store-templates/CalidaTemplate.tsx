import { ArrowRight, Diamond, Leaf, Package, ShieldCheck, Truck } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { StoreTemplateProps } from "./index";

/**
 * Plantilla cálida: verde petróleo, naranja y crema.
 *
 * Secciones ocultas (Opción C): los iconos de búsqueda y cuenta están
 * escritos pero apagados, porque esas funciones no existen en la tienda
 * pública. Para encenderlas, cambiar MOSTRAR_ICONOS a true.
 */

const MOSTRAR_ICONOS = false;

const PETROLEO = "#053A41";
const NARANJA = "#FC931F";
const NARANJA_OSCURO = "#E07F14";
const CREMA = "#F5F0E6";
const MARRON = "#3E2723";
const BORDE = "#E0D7C6";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');

@keyframes cal-flota { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(2deg); } }
@keyframes cal-flota-lenta { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes cal-entra { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

.cal-flota { animation: cal-flota 6s ease-in-out infinite; }
.cal-flota-lenta { animation: cal-flota-lenta 8s ease-in-out infinite; }
.cal-entra { animation: cal-entra .6s ease both; }

.cal-tarjeta { transition: transform .3s ease, box-shadow .3s ease; }
.cal-tarjeta:hover { transform: scale(1.04); box-shadow: 0 20px 40px -12px rgba(62,39,35,.35); }
.cal-tarjeta:hover .cal-foto { transform: scale(1.1); }
.cal-foto { transition: transform .3s ease; }

.cal-boton { transition: transform .3s ease, background .3s ease; }
.cal-boton:hover { transform: scale(1.05); background: ${NARANJA_OSCURO}; }

.cal-icono { transition: transform .3s ease, border-color .3s ease, color .3s ease; }
.cal-icono:hover { transform: scale(1.1); border-color: ${NARANJA}; color: ${NARANJA}; }

.cal-enlace { transition: color .3s ease; }
.cal-enlace:hover { color: ${NARANJA}; }

@media (prefers-reduced-motion: reduce) {
  .cal-flota, .cal-flota-lenta, .cal-entra { animation: none !important; }
  .cal-tarjeta, .cal-boton, .cal-icono, .cal-foto, .cal-enlace { transition: none !important; }
  .cal-tarjeta:hover, .cal-boton:hover, .cal-icono:hover { transform: none !important; }
}
`;

export function CalidaTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const t = useT();
  const total = products.length;
  const portada = products.find((p) => p.image_url)?.image_url ?? null;

  const secciones = [
    { etiqueta: t("Colección", "Collection"), destino: "#cal-productos" },
    { etiqueta: t("La tienda", "The store"), destino: "#cal-tienda" },
  ];

  const garantias = [
    { icono: Diamond, texto: t("Calidad garantizada", "Guaranteed quality") },
    { icono: Truck, texto: t("Envío a todo México", "Shipping across Mexico") },
    { icono: ShieldCheck, texto: t("Pago seguro", "Secure payment") },
    { icono: Package, texto: t("Hecho bajo pedido", "Made to order") },
  ];

  const irA = (destino: string) => {
    document.querySelector(destino)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: CREMA, color: MARRON, fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{CSS}</style>

      {/* ===== Encabezado sobre el hero ===== */}
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">
          <span
            className="text-xl font-extrabold uppercase tracking-widest sm:text-2xl"
            style={{ color: CREMA, overflowWrap: "break-word" }}
          >
            {store.name}
          </span>

          <nav className="hidden items-center gap-10 md:flex">
            {secciones.map((s) => (
              <button
                key={s.destino}
                type="button"
                onClick={() => irA(s.destino)}
                className="cal-enlace text-sm font-medium tracking-wide"
                style={{ color: "rgba(245,240,230,0.8)" }}
              >
                {s.etiqueta}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-5" style={{ color: CREMA }}>
            {/* OCULTO — buscador y cuenta: no existen en la tienda pública */}
            {MOSTRAR_ICONOS && <span aria-hidden="true" />}
            {cartButton}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        className="relative flex min-h-[90vh] items-center overflow-hidden"
        style={{
          background: `radial-gradient(120% 90% at 78% 30%, #0A5560 0%, ${PETROLEO} 55%, #032B31 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to right, ${PETROLEO} 0%, rgba(5,58,65,0.85) 28%, transparent 60%)` }}
        />

        {/* Círculo naranja flotante */}
        <div
          className="cal-flota pointer-events-none absolute right-[12%] top-1/4 hidden h-40 w-40 rounded-full lg:block"
          style={{ background: "rgba(252,147,31,0.9)", filter: "blur(2px)" }}
          aria-hidden="true"
        />

        {/* Hoja decorativa flotante */}
        <div className="cal-flota-lenta pointer-events-none absolute bottom-10 left-[8%] hidden lg:block" aria-hidden="true">
          <Leaf size={64} style={{ color: "rgba(252,147,31,0.6)" }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="cal-entra max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: NARANJA }}>
              {t("Edición limitada", "Limited edition")}
            </p>
            <h1 className="text-5xl font-extrabold leading-tight text-white md:text-7xl">
              {t("Nueva", "New")}
              <br />
              {t("Colección", "Collection")}
            </h1>
            {store.niche && (
              <p
                className="mt-6 line-clamp-3 max-w-md text-base font-light md:text-lg"
                style={{ color: "rgba(245,240,230,0.9)" }}
              >
                {store.niche}
              </p>
            )}
            <button
              type="button"
              onClick={() => irA("#cal-productos")}
              className="cal-boton mt-10 inline-flex items-center gap-3 rounded-full px-10 py-4 text-sm font-bold uppercase tracking-wider text-white"
              style={{ background: NARANJA, boxShadow: "0 10px 30px -8px rgba(252,147,31,0.6)" }}
            >
              {t("Comprar ahora", "Shop now")}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-6 z-10 flex gap-3 md:left-12" aria-hidden="true">
          <span className="h-2 w-8 rounded-full" style={{ background: NARANJA }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "rgba(245,240,230,0.5)" }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "rgba(245,240,230,0.5)" }} />
        </div>
      </section>

      {/* ===== Cuadrícula de productos ===== */}
      <section id="cal-productos" className="py-20" style={{ background: CREMA }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: NARANJA }}>
              {t("Destacados", "Featured")}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl" style={{ color: MARRON }}>
              {t("Productos de la temporada", "This season's products")}
            </h2>
          </div>

          {total === 0 ? (
            <p
              className="mx-auto max-w-md rounded-[20px] bg-white px-8 py-12 text-center text-sm uppercase tracking-[0.2em]"
              style={{ color: MARRON, border: `1px solid ${BORDE}` }}
            >
              {t("Muy pronto", "Coming soon")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <article
                  key={p.id}
                  className="cal-tarjeta relative rounded-[20px] bg-white p-6"
                  style={{ boxShadow: "0 8px 30px -12px rgba(62,39,35,0.25)" }}
                >
                  <div className="flex h-52 items-center justify-center overflow-hidden rounded-xl" style={{ background: CREMA }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        width={480}
                        height={480}
                        className="cal-foto h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "rgba(62,39,35,0.45)" }}>
                        {t("Sin imagen", "No image")}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 line-clamp-2 text-base font-bold" style={{ color: MARRON }}>
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "rgba(62,39,35,0.6)" }}>
                      {p.description}
                    </p>
                  )}

                  <p className="mt-2 text-lg font-extrabold" style={{ color: PETROLEO }}>
                    ${(p.price_cents / 100).toFixed(2)}
                  </p>

                  {p.stock <= 0 ? (
                    <span
                      className="mt-4 block w-full cursor-not-allowed rounded-full py-3 text-center text-sm font-bold uppercase tracking-wide"
                      style={{ background: BORDE, color: "rgba(62,39,35,0.5)" }}
                    >
                      {t("Agotado", "Out of stock")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(p)}
                      className="cal-boton mt-4 w-full rounded-full py-3 text-sm font-bold uppercase tracking-wide text-white"
                      style={{ background: NARANJA }}
                    >
                      {t("Añadir al carrito", "Add to cart")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Sección lifestyle ===== */}
      <section id="cal-tienda" className="pb-20" style={{ background: CREMA }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 lg:grid-cols-2">
          {portada && (
            <div className="overflow-hidden rounded-[20px]" style={{ boxShadow: "0 15px 40px -15px rgba(5,58,65,0.5)" }}>
              <img
                src={portada}
                alt=""
                loading="lazy"
                className="h-full min-h-[320px] w-full object-cover"
              />
            </div>
          )}

          <div
            className="relative flex flex-col justify-center overflow-hidden rounded-[20px] p-10 md:p-14"
            style={{
              border: `2px solid ${NARANJA}`,
              background: `linear-gradient(135deg, ${PETROLEO} 0%, #0A5560 100%)`,
              boxShadow: "0 15px 40px -15px rgba(5,58,65,0.5)",
            }}
          >
            <Leaf
              size={180}
              className="pointer-events-none absolute -bottom-8 -right-8"
              style={{ color: "rgba(252,147,31,0.12)" }}
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: NARANJA }}>
                {t("La esencia", "The essence")}
              </p>
              <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl" style={{ overflowWrap: "break-word" }}>
                {store.name}
              </h2>
              <p className="mt-4 max-w-md" style={{ color: "rgba(245,240,230,0.85)" }}>
                {t(
                  "Cada pieza se produce cuando alguien la compra: nada se fabrica de más y cada pedido se hace especialmente para quien lo pidió.",
                  "Each piece is produced only when someone orders it: nothing is made in excess, and every order is created for the person who placed it.",
                )}
              </p>
              <button
                type="button"
                onClick={() => irA("#cal-productos")}
                className="cal-boton mt-8 inline-flex w-fit items-center gap-3 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wider text-white"
                style={{ background: NARANJA, boxShadow: "0 10px 30px -8px rgba(252,147,31,0.6)" }}
              >
                {t("Ver colección", "View collection")}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Garantías ===== */}
      <section className="py-16" style={{ background: CREMA, borderTop: `1px solid ${BORDE}` }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
          {garantias.map(({ icono: Icono, texto }) => (
            <div key={texto} className="flex flex-col items-center gap-4 text-center">
              <div
                className="cal-icono flex h-16 w-16 items-center justify-center rounded-full bg-white"
                style={{ border: "1px solid rgba(62,39,35,0.2)", color: MARRON, boxShadow: "0 6px 20px -8px rgba(62,39,35,0.3)" }}
              >
                <Icono size={28} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold" style={{ color: MARRON }}>
                {texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Pie ===== */}
      <footer className="py-10" style={{ background: PETROLEO }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 text-center">
          <p
            className="text-xl font-extrabold uppercase tracking-widest"
            style={{ color: CREMA, overflowWrap: "break-word" }}
          >
            {store.name}
          </p>
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-1 w-8 rounded-full" style={{ background: "rgba(245,240,230,0.3)" }} />
            <span className="h-1 w-8 rounded-full" style={{ background: NARANJA }} />
            <span className="h-1 w-8 rounded-full" style={{ background: "rgba(245,240,230,0.3)" }} />
          </div>
          <p className="text-sm" style={{ color: "rgba(245,240,230,0.6)" }}>
            © {new Date().getFullYear()} {store.name}. {t("Todos los derechos reservados", "All rights reserved")}
          </p>
          <p className="text-xs" style={{ color: "rgba(245,240,230,0.6)" }}>
            {t("Hecho con", "Made with")}{" "}
            <span className="font-bold" style={{ color: NARANJA }}>
              Dªtªblɛ
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
