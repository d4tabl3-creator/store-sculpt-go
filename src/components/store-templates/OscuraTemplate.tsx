import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { StoreTemplateProps } from "./index";

/**
 * Plantilla minimalista en blanco y negro.
 * Componente puro: todo el contenido llega por props.
 *
 * Secciones ocultas (Opción C): los bloques de Contacto, Horario y Redes
 * sociales están escritos y listos, pero permanecen ocultos porque la tabla
 * de tiendas todavía no guarda esos datos. Para encenderlos el día que
 * existan, cambiar la constante MOSTRAR_CONTACTO a true y alimentar los
 * campos desde las props.
 */

const MOSTRAR_CONTACTO = false;
const MOSTRAR_BUSCADOR = false;

const NEGRO = "#000000";
const BLANCO = "#FFFFFF";
const LINEA = "#F5F5F5";
const GRIS = "#8A8A8A";

const CSS = `
@keyframes osc-aparecer { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes osc-letra { from { opacity: 0; transform: translate(-50%,-50%) scale(1.06); letter-spacing: .08em; } to { opacity: 1; transform: translate(-50%,-50%) scale(1); letter-spacing: 0; } }
@keyframes osc-panel { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes osc-fondo { from { opacity: 0; } to { opacity: 1; } }

.osc-aparecer { animation: osc-aparecer .6s ease both; }
.osc-letra { animation: osc-letra 1.4s cubic-bezier(.22,1,.36,1) both; }
.osc-panel { animation: osc-panel .35s ease both; }
.osc-fondo { animation: osc-fondo .3s ease both; }

.osc-tiras { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding-bottom: 8px; max-width: 100%; }
.osc-tiras > * { scroll-snap-align: center; flex: 0 0 auto; }
.osc-tiras::-webkit-scrollbar { height: 3px; }
.osc-tiras::-webkit-scrollbar-thumb { background: ${LINEA}; border-radius: 999px; }

.osc-mini { transition: transform .3s ease, box-shadow .3s ease, opacity .3s ease, border-color .3s ease; }
.osc-mini:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,.25); opacity: 1; }
.osc-flecha { transition: transform .3s ease, background .3s ease, color .3s ease; }
.osc-flecha:hover { transform: translateY(-50%) scale(1.1); background: ${NEGRO}; color: ${BLANCO}; }
.osc-enlace { position: relative; }
.osc-enlace::after { content: ""; position: absolute; left: 0; bottom: -2px; height: 1px; width: 0; background: currentColor; transition: width .3s ease; }
.osc-enlace:hover::after { width: 100%; }

@media (prefers-reduced-motion: reduce) {
  .osc-aparecer, .osc-letra, .osc-panel, .osc-fondo { animation: none !important; }
  .osc-mini, .osc-flecha, .osc-enlace::after { transition: none !important; }
  .osc-flecha:hover, .osc-mini:hover { transform: translateY(-50%) !important; }
}
`;

export function OscuraTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const t = useT();
  const acento = store.primary_color;
  const total = products.length;
  const [indice, setIndice] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const activo = total > 0 ? products[Math.min(indice, total - 1)] : null;
  const inicial = (store.name.trim()[0] ?? "·").toUpperCase();

  const irA = useCallback(
    (i: number) => {
      if (total === 0) return;
      setIndice(((i % total) + total) % total);
    },
    [total],
  );
  const anterior = useCallback(() => irA(indice - 1), [irA, indice]);
  const siguiente = useCallback(() => irA(indice + 1), [irA, indice]);

  const irASeccion = (destino: string) => {
    setMenuAbierto(false);
    document.querySelector(destino)?.scrollIntoView({ behavior: "smooth" });
  };

  const secciones = [
    { etiqueta: t("Colección", "Collection"), destino: "#osc-coleccion" },
    { etiqueta: t("La tienda", "The store"), destino: "#osc-tienda" },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLANCO, color: NEGRO }}>
      <style>{CSS}</style>

      {/* ===== Menú lateral ===== */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="osc-fondo absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuAbierto(false)}
            aria-hidden="true"
          />
          <aside
            className="osc-panel relative flex h-full w-[85%] max-w-sm flex-col p-8 shadow-[0_0_80px_rgba(0,0,0,0.25)]"
            style={{ background: BLANCO }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-serif text-2xl tracking-[0.18em]" style={{ overflowWrap: "break-word" }}>
                {store.name}
              </span>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label={t("Cerrar menú", "Close menu")}
                className="flex size-10 shrink-0 items-center justify-center transition-opacity hover:opacity-60"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="mt-12 flex flex-col gap-6">
              {secciones.map((s) => (
                <button
                  key={s.destino}
                  type="button"
                  onClick={() => irASeccion(s.destino)}
                  className="group flex items-center justify-between pb-4 text-left font-serif text-2xl transition-opacity hover:opacity-60"
                  style={{ borderBottom: `1px solid ${LINEA}` }}
                >
                  {s.etiqueta}
                  <ArrowUpRight
                    className="size-5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </nav>

            {/* OCULTO — datos de contacto de la tienda, pendientes en la base */}
            {MOSTRAR_CONTACTO && (
              <div className="mt-auto space-y-3 pt-10 text-xs leading-relaxed" style={{ color: GRIS }}>
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: NEGRO }}>
                  {t("Contacto", "Contact")}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ===== Encabezado ===== */}
      <header className="relative z-20 px-5 pt-5 sm:px-10">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label={t("Abrir menú", "Open menu")}
            className="flex size-10 shrink-0 items-center justify-center transition-opacity hover:opacity-60"
          >
            <Menu className="size-6" strokeWidth={1.5} />
          </button>

          <div className="osc-aparecer flex min-w-0 flex-col items-center text-center">
            <h1
              className="font-serif text-2xl leading-none tracking-[0.18em] sm:text-4xl"
              style={{ overflowWrap: "break-word" }}
            >
              {store.name}
            </h1>
            {store.niche && (
              <p
                className="mt-2 text-[9px] uppercase tracking-[0.4em] sm:text-[10px]"
                style={{ color: GRIS }}
              >
                {store.niche}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {/* OCULTO — el buscador todavía no existe en la tienda pública */}
            {MOSTRAR_BUSCADOR && <span aria-hidden="true" />}
            {cartButton}
          </div>
        </div>

        <nav
          className="mt-4 hidden justify-center gap-10 pb-4 text-[11px] font-medium uppercase tracking-[0.35em] md:flex"
          style={{ borderBottom: `1px solid ${LINEA}` }}
        >
          {secciones.map((s) => (
            <button key={s.destino} type="button" onClick={() => irASeccion(s.destino)} className="osc-enlace">
              {s.etiqueta}
            </button>
          ))}
        </nav>
      </header>

      {/* ===== Letra gigante + carrusel ===== */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <span
          aria-hidden="true"
          className="osc-letra pointer-events-none absolute left-1/2 top-1/2 select-none font-serif leading-[0.74]"
          style={{ fontSize: "min(105vh, 92vw)", color: LINEA }}
        >
          {inicial}
        </span>

        <section
          id="osc-coleccion"
          aria-label={t("Colección", "Collection")}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16 pt-8 sm:px-10"
        >
          {!activo ? (
            <p
              className="osc-aparecer px-8 py-10 text-center text-sm uppercase tracking-[0.3em]"
              style={{ border: `1px solid ${LINEA}`, color: GRIS }}
            >
              {t("Sin productos aún", "No products yet")}
            </p>
          ) : (
            <>
              <div className="relative flex w-full max-w-md items-center justify-center">
                <div
                  key={`img-${activo.id}`}
                  className="osc-aparecer w-full overflow-hidden rounded-lg shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]"
                  style={{ border: `1px solid ${LINEA}`, background: BLANCO }}
                >
                  {activo.image_url ? (
                    <img
                      src={activo.image_url}
                      alt={activo.name}
                      width={640}
                      height={640}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div
                      className="grid aspect-square w-full place-items-center text-[11px] uppercase tracking-[0.25em]"
                      style={{ background: LINEA, color: GRIS }}
                    >
                      {t("Sin imagen", "No image")}
                    </div>
                  )}
                </div>

                {total > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={anterior}
                      aria-label={t("Producto anterior", "Previous product")}
                      className="osc-flecha absolute -left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full sm:-left-7"
                      style={{ border: `1px solid ${LINEA}`, background: BLANCO, color: NEGRO }}
                    >
                      <ArrowLeft className="size-4" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={siguiente}
                      aria-label={t("Producto siguiente", "Next product")}
                      className="osc-flecha absolute -right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full sm:-right-7"
                      style={{ border: `1px solid ${LINEA}`, background: BLANCO, color: NEGRO }}
                    >
                      <ArrowRight className="size-4" strokeWidth={1.5} />
                    </button>
                  </>
                )}
              </div>

              <div className="w-full max-w-md text-center">
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GRIS }}>
                  {String(indice + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </p>

                <h2
                  key={`n-${activo.id}`}
                  className="osc-aparecer mt-2 font-serif text-3xl leading-tight sm:text-4xl"
                >
                  {activo.name}
                </h2>

                {activo.description && (
                  <p
                    key={`d-${activo.id}`}
                    className="osc-aparecer mt-3 line-clamp-3 text-sm leading-relaxed"
                    style={{ color: GRIS }}
                  >
                    {activo.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
                  <p key={`p-${activo.id}`} className="osc-aparecer text-xl font-semibold tracking-wide">
                    ${(activo.price_cents / 100).toFixed(2)}
                  </p>

                  {activo.stock <= 0 ? (
                    <span
                      className="cursor-not-allowed px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.25em]"
                      style={{ border: `1px solid ${LINEA}`, color: GRIS }}
                    >
                      {t("Agotado", "Out of stock")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(activo)}
                      className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors duration-300"
                      style={{ border: `1px solid ${acento}`, color: NEGRO, background: BLANCO }}
                    >
                      {t("Añadir", "Add")}
                      <Plus className="size-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {total > 1 && (
                  <div className="osc-tiras mt-6">
                    {products.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => irA(i)}
                        aria-label={p.name}
                        aria-current={indice === i}
                        className="osc-mini block w-14 overflow-hidden rounded-md p-0 sm:w-16"
                        style={{
                          border: `1px solid ${indice === i ? acento : LINEA}`,
                          opacity: indice === i ? 1 : 0.6,
                          background: LINEA,
                        }}
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            loading="lazy"
                            width={240}
                            height={240}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <span className="block aspect-square w-full" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* ===== Presentación de la tienda ===== */}
      <section
        id="osc-tienda"
        className="relative z-10 px-6 py-14 sm:px-10"
        style={{ borderTop: `1px solid ${LINEA}`, background: BLANCO }}
      >
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.4fr] md:items-end">
          <div className="osc-aparecer">
            <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: GRIS }}>
              {t("La tienda", "The store")}
            </p>
            <p className="mt-4 font-serif text-4xl leading-tight sm:text-5xl" style={{ overflowWrap: "break-word" }}>
              {store.name}
            </p>
          </div>
          {store.niche && (
            <p className="osc-aparecer text-sm leading-relaxed sm:text-base" style={{ color: GRIS }}>
              {store.niche}
            </p>
          )}
        </div>
      </section>

      {/* ===== Pie ===== */}
      <footer className="relative z-10 px-6 pb-8 pt-12 sm:px-10" style={{ background: NEGRO, color: BLANCO }}>
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <p className="font-serif text-3xl tracking-[0.18em]" style={{ overflowWrap: "break-word" }}>
              {store.name}
            </p>
            {store.niche && (
              <p className="mt-3 text-[10px] uppercase tracking-[0.35em] opacity-70">{store.niche}</p>
            )}
          </div>

          {/* OCULTO — Contacto, Horario y Redes: pendientes en la base de datos.
              Cambiar MOSTRAR_CONTACTO a true cuando esos campos existan. */}
          {MOSTRAR_CONTACTO && (
            <>
              <div className="space-y-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{t("Contacto", "Contact")}</p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{t("Horario", "Hours")}</p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{t("Síguenos", "Follow us")}</p>
              </div>
            </>
          )}
        </div>

        <div
          className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 pt-6 text-[10px] uppercase tracking-[0.3em] sm:flex-row"
          style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
        >
          <p className="opacity-60">
            © {new Date().getFullYear()} {store.name} —{" "}
            {t("Todos los derechos reservados", "All rights reserved")}
          </p>
          <p className="opacity-60">
            {t("Hecho con", "Made with")}{" "}
            <span className="font-bold" style={{ color: acento }}>
              Dªtªblɛ
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
