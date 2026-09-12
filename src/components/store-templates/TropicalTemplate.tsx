import { useT } from "@/lib/i18n";
import type { StoreTemplateProps } from "./index";
import fondoTropical from "@/assets/hero-tropical.jpg";

/**
 * Plantilla tropical: crema, verde oliva, naranja y marrón.
 *
 * Secciones ocultas (Opción C): los iconos de búsqueda y cuenta están
 * escritos pero apagados, porque esas funciones no existen en la tienda
 * pública. Para encenderlos, cambiar MOSTRAR_ICONOS a true.
 *
 * El patrón tropical va como marca de agua detrás del bloque principal.
 */

const MOSTRAR_ICONOS = false;

const CREMA = "#F2E8D5";
const OLIVA = "#4A5D23";
const NARANJA = "#E07A2F";
const MARRON = "#3E2723";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

@keyframes trp-flota { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(1.5deg); } }
@keyframes trp-entra { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

.trp-flota { animation: trp-flota 6s ease-in-out infinite; }
.trp-flota-lenta { animation: trp-flota 9s ease-in-out infinite; }
.trp-entra { animation: trp-entra .7s cubic-bezier(.16,1,.3,1) both; }

.trp-boton { transition: transform .3s ease, background .3s ease, box-shadow .3s ease; }
.trp-boton:hover { transform: scale(1.05); }

.trp-tarjeta { transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease; }
.trp-tarjeta:hover { transform: scale(1.04); border-color: ${NARANJA}; box-shadow: 0 20px 40px -16px rgba(224,122,47,.35); }
.trp-tarjeta:hover .trp-foto { transform: scale(1.1); }
.trp-foto { transition: transform .5s ease; }

.trp-mini { transition: transform .3s ease, box-shadow .3s ease; }
.trp-mini:hover { transform: scale(1.05); box-shadow: 0 10px 24px -10px rgba(0,0,0,.5); }
.trp-mini:hover .trp-foto { transform: scale(1.1); }

.trp-enlace { transition: color .3s ease; }
.trp-enlace:hover { color: ${NARANJA}; }

@media (prefers-reduced-motion: reduce) {
  .trp-flota, .trp-flota-lenta, .trp-entra { animation: none !important; }
  .trp-boton, .trp-tarjeta, .trp-mini, .trp-foto, .trp-enlace { transition: none !important; }
  .trp-boton:hover, .trp-tarjeta:hover, .trp-mini:hover { transform: none !important; }
}
`;

const HOJA =
  "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z";

export function TropicalTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const t = useT();
  const total = products.length;
  const laterales = products.slice(0, 7);

  const secciones = [
    { etiqueta: t("Colección", "Collection"), destino: "#trp-productos" },
    { etiqueta: t("La tienda", "The store"), destino: "#trp-tienda" },
  ];

  const irA = (destino: string) => {
    document.querySelector(destino)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: CREMA,
        color: MARRON,
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* ===== Encabezado ===== */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between gap-4 px-5 py-4 md:px-8"
        style={{ background: CREMA, borderBottom: `1px solid rgba(62,39,35,0.15)` }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
            <path d="M16 4 28 26h-6.5L16 15l-5.5 11H4L16 4z" fill={OLIVA} />
            <path d="M16 15l5.5 11h-11L16 15z" fill={NARANJA} />
          </svg>
          <span
            className="truncate text-lg font-extrabold uppercase tracking-tight sm:text-xl"
            style={{ color: MARRON }}
          >
            {store.name}
          </span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex" style={{ color: MARRON }}>
          {secciones.map((s, i) => (
            <button
              key={s.destino}
              type="button"
              onClick={() => irA(s.destino)}
              className="trp-enlace pb-1"
              style={
                i === 0
                  ? { color: NARANJA, borderBottom: `2px solid ${NARANJA}` }
                  : undefined
              }
            >
              {s.etiqueta}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2" style={{ color: MARRON }}>
          {/* OCULTO — buscador y cuenta: no existen en la tienda pública */}
          {MOSTRAR_ICONOS && <span aria-hidden="true" />}
          {cartButton}
        </div>
      </header>

      <div className="flex">
        {/* ===== Barra lateral con productos ===== */}
        {laterales.length > 0 && (
          <aside
            className="hidden w-28 shrink-0 flex-col gap-3 px-3 py-4 lg:flex"
            style={{ background: OLIVA, borderRight: `1px solid rgba(62,39,35,0.15)` }}
          >
            {laterales.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => irA("#trp-productos")}
                aria-label={p.name}
                className="trp-mini group relative rounded-xl p-2 shadow-sm"
                style={{ background: CREMA }}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg" style={{ background: CREMA }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" loading="lazy" className="trp-foto h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full" style={{ background: "rgba(62,39,35,0.1)" }} />
                  )}
                </div>
                <span
                  className="absolute -right-1 -top-1 h-3 w-3 rounded-full"
                  style={{ background: [NARANJA, OLIVA, MARRON][i % 3], border: `2px solid ${CREMA}` }}
                />
              </button>
            ))}
          </aside>
        )}

        <main className="min-w-0 flex-1">
          {/* ===== Hero con el patrón de marca de agua ===== */}
          <section
            className="relative flex min-h-[70vh] items-center overflow-hidden"
            style={{
              backgroundImage: `url(${fondoTropical})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Velo crema: deja el patrón apenas insinuado */}
            <div className="absolute inset-0" style={{ background: CREMA, opacity: 0.88 }} />

            <svg
              viewBox="0 0 24 24"
              className="trp-flota absolute left-[8%] top-[12%] h-16 w-16"
              style={{ color: "rgba(74,93,35,0.7)" }}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={HOJA} />
            </svg>
            <svg
              viewBox="0 0 24 24"
              className="trp-flota-lenta absolute bottom-[10%] right-[6%] h-20 w-20"
              style={{ color: "rgba(62,39,35,0.45)" }}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={HOJA} />
            </svg>

            <div className="trp-entra relative z-10 mx-auto w-full max-w-3xl px-6 py-20 text-center md:px-10">
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em]"
                style={{ background: MARRON, color: CREMA }}
              >
                {t("Temporada", "Season")} {new Date().getFullYear()}
              </span>
              <h1
                className="mt-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl"
                style={{ color: MARRON }}
              >
                {t("Nueva Colección", "New Collection")}
              </h1>
              {store.niche && (
                <p
                  className="mx-auto mt-4 line-clamp-3 max-w-md text-base font-medium md:text-lg"
                  style={{ color: OLIVA }}
                >
                  {store.niche}
                </p>
              )}
              <button
                type="button"
                onClick={() => irA("#trp-productos")}
                className="trp-boton mt-8 rounded-xl px-10 py-4 text-lg font-bold uppercase tracking-widest"
                style={{ background: NARANJA, color: CREMA, boxShadow: "0 10px 30px -8px rgba(224,122,47,0.5)" }}
              >
                {t("Comprar", "Shop")}
              </button>
              <div className="mt-10 flex items-center justify-center gap-2" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NARANJA }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: OLIVA }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: MARRON }} />
              </div>
            </div>
          </section>

          {/* ===== Destacados ===== */}
          <section id="trp-productos" className="mx-auto max-w-6xl px-5 py-14 md:px-8">
            <h2
              className="text-center text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: MARRON }}
            >
              {t("Destacados de la colección", "Collection highlights")}
            </h2>

            {total === 0 ? (
              <p
                className="mx-auto mt-10 max-w-md rounded-2xl px-8 py-12 text-center text-sm font-semibold"
                style={{ background: CREMA, border: `2px solid rgba(62,39,35,0.2)`, color: OLIVA }}
              >
                {t("Muy pronto", "Coming soon")}
              </p>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <article
                    key={p.id}
                    className="trp-tarjeta overflow-hidden rounded-2xl shadow-md"
                    style={{ background: CREMA, border: `2px solid rgba(62,39,35,0.2)` }}
                  >
                    <div
                      className="relative aspect-square overflow-hidden"
                      style={{ background: "rgba(74,93,35,0.12)" }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          width={640}
                          height={640}
                          className="trp-foto h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-semibold" style={{ color: OLIVA }}>
                          {t("Sin imagen", "No image")}
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-2 text-xl font-bold" style={{ color: MARRON }}>
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-sm font-medium" style={{ color: OLIVA }}>
                          {p.description}
                        </p>
                      )}
                      <p className="mt-2 text-lg font-extrabold" style={{ color: MARRON }}>
                        ${(p.price_cents / 100).toFixed(2)}
                      </p>

                      {p.stock <= 0 ? (
                        <span
                          className="mt-4 block w-full cursor-not-allowed rounded-lg py-3 text-center text-sm font-bold uppercase tracking-wider"
                          style={{ background: "rgba(62,39,35,0.15)", color: "rgba(62,39,35,0.5)" }}
                        >
                          {t("Agotado", "Out of stock")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdd(p)}
                          className="trp-boton mt-4 w-full rounded-lg py-3 text-sm font-bold uppercase tracking-wider"
                          style={{ background: NARANJA, color: CREMA }}
                        >
                          {t("Comprar", "Buy")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ===== La tienda ===== */}
          <section id="trp-tienda" className="mx-auto max-w-6xl px-5 pb-14 md:px-8">
            <div
              className="rounded-2xl px-8 py-12 text-center"
              style={{ background: OLIVA, color: CREMA }}
            >
              <h2 className="text-3xl font-extrabold md:text-4xl" style={{ overflowWrap: "break-word" }}>
                {store.name}
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-bold uppercase tracking-wider">
                <span className="rounded-full px-4 py-2" style={{ background: NARANJA, color: CREMA }}>
                  {t("Envío a todo México", "Shipping across Mexico")}
                </span>
                <span className="rounded-full px-4 py-2" style={{ background: MARRON, color: CREMA }}>
                  {t("Pago seguro", "Secure payment")}
                </span>
                <span className="rounded-full px-4 py-2" style={{ background: CREMA, color: OLIVA }}>
                  {t("Hecho bajo pedido", "Made to order")}
                </span>
              </div>
            </div>
          </section>

          {/* ===== Pie ===== */}
          <footer
            className="px-5 py-8 text-center text-sm font-medium"
            style={{ background: MARRON, color: "rgba(242,232,213,0.8)" }}
          >
            <p>
              © {new Date().getFullYear()} {store.name}
            </p>
            <p className="mt-1">
              {t("Hecho con", "Made with")}{" "}
              <span className="font-bold" style={{ color: NARANJA }}>
                Dªtªblɛ
              </span>
            </p>
            <p className="mt-2">
              <a href="/politicas" className="underline">
                {t("Políticas de compra", "Purchase policies")}
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
