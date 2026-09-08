import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { StoreTemplateProps } from "./index";

/* Paleta del diseño minimalista: blanco puro, negro puro, gris de líneas. */
const BLANCO = "#FFFFFF";
const NEGRO = "#000000";
const LINEA = "#EDEDED";
const GRIS = "#8A8A8A";
const GRIS_SUAVE = "#F5F5F5";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Montserrat:wght@300;400;500;600&display=swap');

@keyframes oscura-letra { from { opacity: 0; transform: translate(-50%,-46%) scale(1.12); letter-spacing: .06em; } to { opacity: 1; transform: translate(-50%,-50%) scale(1); letter-spacing: 0; } }
@keyframes oscura-diapositiva { from { opacity: 0; transform: translateX(40px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes oscura-aparecer { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.oscura-letra { animation: oscura-letra 1.8s cubic-bezier(.16,1,.3,1) both; }
.oscura-diapositiva { animation: oscura-diapositiva .7s cubic-bezier(.16,1,.3,1) both; }
.oscura-aparecer { animation: oscura-aparecer .6s cubic-bezier(.16,1,.3,1) both; }

.oscura-tiras { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
.oscura-tiras > * { scroll-snap-align: center; flex: 0 0 auto; }
.oscura-tiras::-webkit-scrollbar { height: 3px; }
.oscura-tiras::-webkit-scrollbar-thumb { background: ${LINEA}; border-radius: 999px; }

.oscura-mini { transition: transform .3s ease, box-shadow .3s ease, opacity .3s ease, border-color .3s ease; }
.oscura-mini:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,.25); }
.oscura-boton { transition: background .3s ease, color .3s ease, opacity .3s ease; }
.oscura-flecha { transition: transform .3s ease, background .3s ease, color .3s ease; }
.oscura-flecha:hover { transform: translateY(-50%) scale(1.1); }

@media (prefers-reduced-motion: reduce) {
  .oscura-letra, .oscura-diapositiva, .oscura-aparecer { animation: none !important; }
  .oscura-mini, .oscura-boton, .oscura-flecha { transition: none !important; }
}
`;

export function OscuraTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const acento = store.primary_color;
  const total = products.length;
  const [indice, setIndice] = useState(0);

  const irA = useCallback(
    (i: number) => {
      if (total === 0) return;
      setIndice(((i % total) + total) % total);
    },
    [total],
  );
  const anterior = useCallback(() => irA(indice - 1), [irA, indice]);
  const siguiente = useCallback(() => irA(indice + 1), [irA, indice]);

  const activo = products[Math.min(indice, Math.max(total - 1, 0))];
  const inicial = store.name.trim().slice(0, 1).toUpperCase() || "·";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: BLANCO,
        color: NEGRO,
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* ===== Encabezado ===== */}
      <header
        style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 20px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              overflowWrap: "break-word",
            }}
          >
            {store.name}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: GRIS,
            }}
          >
            {store.niche}
          </div>
        </div>
        <div style={{ color: NEGRO }}>{cartButton}</div>
      </header>

      {/* ===== Cuerpo ===== */}
      <main
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Letra gigante de fondo */}
        <span
          aria-hidden="true"
          className="oscura-letra"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "min(105vh, 90vw)",
            lineHeight: 0.74,
            color: acento,
            opacity: 0.1,
          }}
        >
          {inicial}
        </span>

        {total === 0 ? (
          <section
            style={{
              position: "relative",
              zIndex: 10,
              display: "grid",
              placeItems: "center",
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  color: GRIS,
                }}
              >
                Colección
              </p>
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 26,
                }}
              >
                Muy pronto
              </p>
            </div>
          </section>
        ) : (
          <div
            style={{
              position: "relative",
              zIndex: 10,
              display: "grid",
              gap: 28,
              alignItems: "center",
              padding: "8px 24px 96px",
              maxWidth: 1200,
              width: "100%",
              margin: "0 auto",
              gridTemplateColumns: "1fr",
            }}
            className="oscura-cuerpo"
          >
            {/* Imagen grande del producto activo */}
            <div style={{ position: "relative", width: "100%", maxWidth: 460, margin: "0 auto" }}>
              <div
                key={`img-${activo.id}`}
                className="oscura-diapositiva"
                style={{
                  overflow: "hidden",
                  borderRadius: 8,
                  border: `1px solid ${LINEA}`,
                  background: GRIS_SUAVE,
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,.25)",
                }}
              >
                {activo.image_url ? (
                  <img
                    src={activo.image_url}
                    alt={activo.name}
                    width={640}
                    height={640}
                    style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      display: "grid",
                      placeItems: "center",
                      color: GRIS,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.25em",
                    }}
                  >
                    Sin imagen
                  </div>
                )}
              </div>

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={anterior}
                    aria-label="Producto anterior"
                    className="oscura-flecha"
                    style={{
                      position: "absolute",
                      left: -14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 44,
                      width: 44,
                      borderRadius: 999,
                      border: `1px solid ${LINEA}`,
                      background: BLANCO,
                      color: NEGRO,
                      cursor: "pointer",
                    }}
                  >
                    <ArrowLeft size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={siguiente}
                    aria-label="Producto siguiente"
                    className="oscura-flecha"
                    style={{
                      position: "absolute",
                      right: -14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 44,
                      width: 44,
                      borderRadius: 999,
                      border: `1px solid ${LINEA}`,
                      background: BLANCO,
                      color: NEGRO,
                      cursor: "pointer",
                    }}
                  >
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>

            {/* Datos del producto */}
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: GRIS }}>
                {String(indice + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </p>

              <h1
                key={`n-${activo.id}`}
                className="oscura-aparecer"
                style={{
                  marginTop: 8,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 30,
                  lineHeight: 1.15,
                  fontWeight: 400,
                }}
              >
                {activo.name}
              </h1>

              {activo.description && (
                <p
                  key={`d-${activo.id}`}
                  className="oscura-aparecer"
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontWeight: 300,
                    color: GRIS,
                    animationDelay: "80ms",
                  }}
                >
                  {activo.description}
                </p>
              )}

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 18,
                }}
              >
                <p
                  key={`p-${activo.id}`}
                  className="oscura-aparecer"
                  style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.02em", animationDelay: "140ms" }}
                >
                  ${(activo.price_cents / 100).toFixed(2)}
                </p>

                <button
                  type="button"
                  onClick={() => onAdd(activo)}
                  disabled={activo.stock <= 0}
                  className="oscura-boton"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: `1px solid ${activo.stock <= 0 ? LINEA : acento}`,
                    background: activo.stock <= 0 ? GRIS_SUAVE : acento,
                    color: activo.stock <= 0 ? GRIS : BLANCO,
                    padding: "11px 22px",
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.25em",
                    cursor: activo.stock <= 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {activo.stock <= 0 ? "Agotado" : "Añadir"}
                  {activo.stock > 0 && <Plus size={14} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Miniaturas deslizables */}
              {total > 1 && (
                <div className="oscura-tiras" style={{ marginTop: 24, justifyContent: "flex-start" }}>
                  {products.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => irA(i)}
                      aria-label={p.name}
                      aria-current={indice === i}
                      className="oscura-mini"
                      style={{
                        width: 60,
                        overflow: "hidden",
                        borderRadius: 6,
                        border: `1px solid ${indice === i ? NEGRO : LINEA}`,
                        opacity: indice === i ? 1 : 0.55,
                        background: GRIS_SUAVE,
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          width={240}
                          height={240}
                          style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Botón circular flotante: abre el mismo carrito del encabezado */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 24,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 56,
          width: 56,
          borderRadius: 999,
          border: `1px solid ${NEGRO}`,
          background: BLANCO,
          color: NEGRO,
          boxShadow: "0 10px 30px -12px rgba(0,0,0,.4)",
        }}
      >
        {cartButton}
      </div>

      <footer
        style={{
          borderTop: `1px solid ${LINEA}`,
          padding: "28px 16px",
          textAlign: "center",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: GRIS,
        }}
      >
        Hecho con <span style={{ fontWeight: 700, color: acento }}>Dªtªblɛ</span>
      </footer>

      {/* Dos columnas en pantallas grandes, igual que el diseño original */}
      <style>{`
        @media (min-width: 1024px) {
          .oscura-cuerpo { grid-template-columns: 1fr 1fr; gap: 56px; padding-top: 24px; }
          .oscura-cuerpo > div:last-child { text-align: left; }
          .oscura-cuerpo > div:last-child > div { justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}
