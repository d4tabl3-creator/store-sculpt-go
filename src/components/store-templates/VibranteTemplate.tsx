import { useT } from "@/lib/i18n";
import type { StoreTemplateProps } from "./index";

/**
 * Plantilla vibrante: rosa, verde y naranja tropical.
 *
 * Secciones ocultas (Opción C): los iconos de búsqueda y cuenta, el corazón
 * de favoritos y los banners promocionales están escritos pero apagados,
 * porque esas funciones y esos datos no existen todavía. Para encenderlos,
 * cambiar el interruptor correspondiente a true.
 *
 * El fondo del hero es un patrón dibujado con formas, no una fotografía:
 * no depende de archivos externos ni de licencias de terceros.
 */

const MOSTRAR_ICONOS = false;
const MOSTRAR_FAVORITOS = false;
const MOSTRAR_BANNERS = false;

const ROSA = "oklch(0.62 0.24 350)";
const VERDE = "oklch(0.62 0.11 195)";
const NARANJA = "oklch(0.72 0.17 55)";
const CREMA = "oklch(0.975 0.012 85)";
const TINTA = "oklch(0.22 0.03 285)";
const SUAVE = "oklch(0.5 0.03 285)";
const BORDE = "oklch(0.9 0.02 85)";
const BLANCO = "#FFFFFF";

const ACENTOS = [ROSA, VERDE, NARANJA];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap');

@keyframes vib-flotar { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes vib-entra { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.vib-flotar { animation: vib-flotar 5s ease-in-out infinite; }
.vib-flotar-lento { animation: vib-flotar 7s ease-in-out infinite; }
.vib-entra { animation: vib-entra .6s ease both; }

.vib-crece { transition: transform .25s ease, box-shadow .25s ease, filter .25s ease; }
.vib-crece:hover { transform: scale(1.06); filter: brightness(1.05); }
.vib-crece:active { transform: scale(0.98); }

.vib-tarjeta { transition: transform .3s ease, box-shadow .3s ease; }
.vib-tarjeta:hover { transform: translateY(-8px); box-shadow: 0 20px 40px -16px rgba(0,0,0,.25); }
.vib-tarjeta:hover .vib-foto { transform: scale(1.05); }
.vib-foto { transition: transform .5s ease; }

.vib-circulo { transition: transform .3s ease; }
.vib-circulo:hover { transform: scale(1.1); }

@media (prefers-reduced-motion: reduce) {
  .vib-flotar, .vib-flotar-lento, .vib-entra { animation: none !important; }
  .vib-crece, .vib-tarjeta, .vib-foto, .vib-circulo { transition: none !important; }
  .vib-crece:hover, .vib-tarjeta:hover, .vib-circulo:hover { transform: none !important; }
}
`;

/** Patrón tropical dibujado con formas. Sin imágenes ni dependencias. */
function PatronTropical() {
  const hoja = "M100 14 C142 56, 142 144, 100 186 C58 144, 58 56, 100 14 Z";
  return (
    <svg
      viewBox="0 0 400 460"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id="vib-patron" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill={CREMA} />

          <g transform="translate(-10 -20) rotate(-18 100 100) scale(0.62)">
            <path d={hoja} fill={VERDE} />
            <path d="M100 24 L100 176" stroke={CREMA} strokeWidth="5" strokeLinecap="round" />
          </g>

          <g transform="translate(96 6) rotate(26 100 100) scale(0.5)">
            <path d={hoja} fill={ROSA} />
            <path d="M100 24 L100 176" stroke={CREMA} strokeWidth="6" strokeLinecap="round" />
          </g>

          <g transform="translate(-4 92) rotate(58 100 100) scale(0.44)">
            <path d={hoja} fill={NARANJA} />
            <path d="M100 24 L100 176" stroke={CREMA} strokeWidth="7" strokeLinecap="round" />
          </g>

          <g transform="translate(88 104) rotate(-42 100 100) scale(0.58)">
            <path d={hoja} fill={VERDE} opacity="0.85" />
            <path d="M100 24 L100 176" stroke={CREMA} strokeWidth="5" strokeLinecap="round" />
          </g>

          <circle cx="30" cy="150" r="7" fill={NARANJA} />
          <circle cx="176" cy="72" r="5" fill={VERDE} />
          <circle cx="150" cy="188" r="6" fill={ROSA} />
          <circle cx="60" cy="20" r="4" fill={ROSA} />
        </pattern>
      </defs>
      <rect width="400" height="460" fill="url(#vib-patron)" />
    </svg>
  );
}

export function VibranteTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const t = useT();
  const total = products.length;
  const accesos = products.slice(0, 6);

  const secciones = [
    { etiqueta: t("Colección", "Collection"), destino: "#vib-productos" },
    { etiqueta: t("La tienda", "The store"), destino: "#vib-tienda" },
  ];

  const irA = (destino: string) => {
    document.querySelector(destino)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: CREMA,
        color: TINTA,
        fontFamily: "'Nunito Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* ===== Encabezado ===== */}
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{ background: "color-mix(in oklch, " + CREMA + " 90%, transparent)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <span
            className="flex min-w-0 items-center gap-2 text-xl font-semibold sm:text-2xl"
            style={{ color: ROSA, fontFamily: "'Fredoka', ui-sans-serif, sans-serif", overflowWrap: "break-word" }}
          >
            <span className="inline-block size-5 shrink-0 rounded-full" style={{ background: ROSA }} />
            {store.name}
          </span>

          <nav className="hidden items-center gap-7 md:flex">
            {secciones.map((s, i) => (
              <button
                key={s.destino}
                type="button"
                onClick={() => irA(s.destino)}
                className="text-sm font-semibold"
                style={{ color: i === 0 ? VERDE : SUAVE }}
              >
                {s.etiqueta}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4" style={{ color: TINTA }}>
            {/* OCULTO — buscador y cuenta: no existen en la tienda pública */}
            {MOSTRAR_ICONOS && <span aria-hidden="true" />}
            {cartButton}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden" style={{ background: VERDE }}>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-0">
          <div className="relative z-10 order-2 md:order-1">
            <div
              className="vib-flotar-lento aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-2xl md:aspect-[5/6] md:rounded-none md:rounded-r-[3rem] md:shadow-none"
            >
              <PatronTropical />
            </div>
          </div>

          <div className="order-1 py-6 text-center md:order-2 md:py-20 md:text-left">
            <h1
              className="vib-flotar text-5xl font-bold leading-tight md:text-7xl"
              style={{ color: ROSA, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
            >
              {t("Nueva Colección", "New Collection")}
            </h1>
            {store.niche && (
              <p
                className="mt-4 line-clamp-2 text-lg font-semibold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {store.niche}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
              <button
                type="button"
                onClick={() => irA("#vib-productos")}
                className="vib-crece rounded-full px-8 py-3.5 text-lg font-semibold shadow-lg"
                style={{ background: NARANJA, color: BLANCO, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
              >
                {t("Comprar ahora", "Shop now")}
              </button>
              <button
                type="button"
                onClick={() => irA("#vib-productos")}
                className="vib-crece rounded-full px-8 py-3.5 text-lg font-semibold shadow-lg"
                style={{ background: BLANCO, color: VERDE, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
              >
                {t("Ver todo", "View all")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Accesos circulares ===== */}
      {accesos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
            {accesos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => irA("#vib-productos")}
                className="group flex flex-col items-center gap-3"
                aria-label={p.name}
              >
                <span
                  className="vib-flotar vib-circulo block size-24 overflow-hidden rounded-full sm:size-28"
                  style={{
                    animationDelay: `${i * 0.4}s`,
                    boxShadow: `0 0 0 4px ${CREMA}, 0 0 0 8px ${ACENTOS[i % 3]}`,
                    background: BORDE,
                  }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      loading="lazy"
                      width={256}
                      height={256}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="block size-full" />
                  )}
                </span>
                <span
                  className="line-clamp-1 max-w-[7rem] text-sm font-semibold"
                  style={{ color: TINTA, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Cuadrícula de productos ===== */}
      <section id="vib-productos" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2
            className="text-3xl font-bold"
            style={{ color: TINTA, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
          >
            {t("Productos destacados", "Featured products")}
          </h2>
        </div>

        {total === 0 ? (
          <p
            className="mx-auto max-w-md rounded-3xl bg-white px-8 py-12 text-center text-sm font-semibold"
            style={{ color: SUAVE }}
          >
            {t("Muy pronto", "Coming soon")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <article
                key={p.id}
                className="vib-tarjeta group overflow-hidden rounded-3xl shadow-sm"
                style={{ background: BLANCO }}
              >
                <div className="relative overflow-hidden" style={{ background: BORDE }}>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      width={768}
                      height={960}
                      className="vib-foto aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <div
                      className="grid aspect-[4/5] w-full place-items-center text-xs font-semibold"
                      style={{ color: SUAVE }}
                    >
                      {t("Sin imagen", "No image")}
                    </div>
                  )}
                  {/* OCULTO — favoritos: la tienda todavía no los guarda */}
                  {MOSTRAR_FAVORITOS && <span aria-hidden="true" />}
                </div>

                <div className="flex flex-col gap-1 p-5">
                  <h3
                    className="line-clamp-2 text-base font-semibold"
                    style={{ color: TINTA, fontFamily: "'Fredoka', ui-sans-serif, sans-serif" }}
                  >
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: SUAVE }}>
                      {p.description}
                    </p>
                  )}
                  <p className="mt-1 text-lg font-bold" style={{ color: TINTA }}>
                    ${(p.price_cents / 100).toFixed(2)}
                  </p>

                  {p.stock <= 0 ? (
                    <span
                      className="mt-3 cursor-not-allowed rounded-full px-6 py-2.5 text-center text-sm font-semibold"
                      style={{ background: BORDE, color: SUAVE }}
                    >
                      {t("Agotado", "Out of stock")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(p)}
                      className="vib-crece mt-3 rounded-full px-6 py-2.5 text-sm font-semibold shadow-md"
                      style={{
                        background: ACENTOS[i % 3],
                        color: BLANCO,
                        fontFamily: "'Fredoka', ui-sans-serif, sans-serif",
                      }}
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

      {/* OCULTO — banners promocionales: no existen promociones en la base.
          Cambiar MOSTRAR_BANNERS a true cuando existan. */}
      {MOSTRAR_BANNERS && (
        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-2" />
      )}

      {/* ===== La tienda ===== */}
      <section id="vib-tienda" className="mx-auto max-w-6xl px-4 pb-16">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-12 text-center"
          style={{ background: VERDE, color: BLANCO }}
        >
          <h2
            className="text-3xl font-bold md:text-4xl"
            style={{ fontFamily: "'Fredoka', ui-sans-serif, sans-serif", overflowWrap: "break-word" }}
          >
            {store.name}
          </h2>
          {store.niche && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base" style={{ color: "rgba(255,255,255,0.9)" }}>
              {store.niche}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-semibold">
            <span className="rounded-full px-4 py-2" style={{ background: NARANJA, color: BLANCO }}>
              {t("Envío a todo México", "Shipping across Mexico")}
            </span>
            <span className="rounded-full px-4 py-2" style={{ background: ROSA, color: BLANCO }}>
              {t("Pago seguro", "Secure payment")}
            </span>
            <span className="rounded-full px-4 py-2" style={{ background: BLANCO, color: VERDE }}>
              {t("Hecho bajo pedido", "Made to order")}
            </span>
          </div>
        </div>
      </section>

      {/* ===== Pie ===== */}
      <footer
        className="py-8 text-center text-sm"
        style={{ borderTop: `1px solid ${BORDE}`, color: SUAVE }}
      >
        <p>
          © {new Date().getFullYear()} {store.name}
        </p>
        <p className="mt-1">
          {t("Hecho con", "Made with")}{" "}
          <span className="font-bold" style={{ color: ROSA }}>
            Dªtªblɛ
          </span>
        </p>
      </footer>
    </div>
  );
}
