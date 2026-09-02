import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

/**
 * Lienzo de diseño.
 *
 * IMPORTANTE: el lienzo NO es la fotografía promocional del producto. El
 * lienzo es la ZONA IMPRIMIBLE real, dibujada aparte, con la relación de
 * aspecto exacta que entrega el proveedor (areaWidth × areaHeight en px).
 * La foto del producto aparece únicamente como referencia pequeña al lado,
 * con la zona resaltada, para que el comerciante ubique dónde caerá su
 * diseño. La maqueta de venta se genera en el paso siguiente.
 *
 * FALLBACK DOCUMENTADO: el proveedor entrega el TAMAÑO del área imprimible
 * pero no sus coordenadas sobre la foto del producto. Por eso la referencia
 * usa proporciones estándar por tipo de posición. Las coordenadas que se
 * envían a fabricación son relativas al área imprimible, así que el fallback
 * sólo afecta la miniatura de referencia, nunca el resultado impreso.
 */

/** Referencia visual: fracciones del alto/ancho de la foto del producto. */
const AREA_BOX: Record<string, { cx: number; cy: number; w: number }> = {
  front: { cx: 0.5, cy: 0.44, w: 0.34 },
  back: { cx: 0.5, cy: 0.44, w: 0.34 },
  neck: { cx: 0.5, cy: 0.24, w: 0.12 },
  "sleeve-left": { cx: 0.22, cy: 0.42, w: 0.1 },
  "sleeve-right": { cx: 0.78, cy: 0.42, w: 0.1 },
  left: { cx: 0.32, cy: 0.5, w: 0.24 },
  right: { cx: 0.68, cy: 0.5, w: 0.24 },
  top: { cx: 0.5, cy: 0.3, w: 0.4 },
  bottom: { cx: 0.5, cy: 0.7, w: 0.4 },
  cover: { cx: 0.5, cy: 0.5, w: 0.55 },
  wrap: { cx: 0.5, cy: 0.5, w: 0.6 },
  default: { cx: 0.5, cy: 0.5, w: 0.45 },
};

export type DesignPlacementState = {
  /** Centro del diseño dentro del área imprimible (0-1). */
  offsetX: number;
  offsetY: number;
  /** Ancho del diseño como fracción del ancho del área imprimible. */
  scale: number;
  /** Giro en grados. */
  rotation: number;
  /** Ajustar, Rellenar o Repetir patrón. */
  fitMode?: "fit" | "fill" | "tile";
  /** Tamaño de cada repetición (fracción del ancho del área). */
  tileScale?: number;
};

export function DesignCanvas({
  productImage,
  designUrl,
  placementId,
  placementLabel,
  areaWidth,
  areaHeight,
  state,
  onChange,
  onRetryDesign,
  onReupload,
  onNaturalSize,
  children,
}: {
  productImage: string;
  designUrl: string | null;
  placementId: string;
  placementLabel?: string;
  areaWidth: number;
  areaHeight: number;
  state: DesignPlacementState;
  onChange: (patch: Partial<DesignPlacementState>) => void;
  /** Renueva el enlace del diseño cuando la imagen no carga. Devuelve true si lo logró. */
  onRetryDesign?: () => Promise<boolean>;
  /** Abre el selector de archivos para volver a subir el diseño. */
  onReupload?: () => void;
  /** Medidas reales del archivo subido, para avisar de baja resolución. */
  onNaturalSize?: (w: number, h: number) => void;
  /** Controles pegados al lienzo (tamaño, giro, modo). */
  children?: React.ReactNode;
}) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  // La clave ignora el token del enlace: renovarlo no cuenta como diseño nuevo.
  const designKey = designUrl ? designUrl.split("?")[0] : null;
  const retries = useRef(0);

  // Un diseño distinto siempre parte de cero: se limpia el estado de error.
  useEffect(() => {
    retries.current = 0;
    setFailed(false);
  }, [designKey]);

  /** La imagen no cargó: se renueva el enlace una sola vez y, si no, se avisa. */
  async function handleImgError() {
    if (!designUrl) return;
    if (onRetryDesign && retries.current < 1) {
      retries.current += 1;
      const ok = await onRetryDesign().catch(() => false);
      if (ok) return;
    }
    setFailed(true);
  }


  const mode = state.fitMode ?? "fit";
  const tile = state.tileScale ?? 0.25;
  const box = AREA_BOX[placementId] ?? AREA_BOX.default;
  const ratio = areaWidth > 0 && areaHeight > 0 ? areaHeight / areaWidth : 1.25;
  const refW = box.w;
  const refH = Math.min(0.9, box.w * ratio);


  const move = useCallback(
    (clientX: number, clientY: number) => {
      const el = boxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      onChange({ offsetX: x, offsetY: y });
    },
    [onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, move]);

  return (
    <div className="space-y-3">
      {/* LIENZO: zona de impresión real, independiente de la foto del producto */}
      <div className="rounded-2xl border-2 border-border bg-card p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {t("Zona de impresión", "Print area")}
            {placementLabel ? ` · ${placementLabel}` : ""}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {areaWidth > 0 ? `${areaWidth} × ${areaHeight} px` : t("Medida no publicada", "Size not published")}
          </span>
        </div>

        <div className="grid place-items-center">
          <div
            ref={boxRef}
            onPointerDown={(e) => {
              if (!designUrl) return;
              // Captura el puntero para que el gesto no lo robe el scroll de la página.
              e.preventDefault();
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch {
                /* navegadores sin captura de puntero: se sigue con listeners globales */
              }
              setDragging(true);
              move(e.clientX, e.clientY);
            }}
            className={`relative w-full max-w-[320px] overflow-hidden rounded-lg border-2 border-dashed border-primary/70 ${
              designUrl ? "cursor-move" : ""
            }`}
            style={{
              touchAction: designUrl ? "none" : undefined,
              aspectRatio: `${areaWidth > 0 ? areaWidth : 100} / ${areaHeight > 0 ? areaHeight : 125}`,
              backgroundColor: "hsl(var(--card))",
              backgroundImage:
                "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%)",
              backgroundSize: "18px 18px",
              backgroundPosition: "0 0, 9px 9px",
            }}
          >
            {designUrl && !failed ? (
              mode === "tile" ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-[-50%]"
                    style={{
                      backgroundImage: `url("${designUrl}")`,
                      backgroundRepeat: "repeat",
                      backgroundSize: `${tile * 100 * 2}% auto`,
                      backgroundPosition: `${state.offsetX * 100}% ${state.offsetY * 100}%`,
                      transform: `rotate(${state.rotation}deg)`,
                    }}
                  />
                  {/* Copia oculta: detecta carga fallida y medidas reales del archivo. */}
                  <img
                    src={designUrl}
                    alt=""
                    className="hidden"
                    onError={() => void handleImgError()}
                    onLoad={(e) => onNaturalSize?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  />
                </>
              ) : (
                <img
                  src={designUrl}
                  alt={t("Tu diseño", "Your design")}
                  draggable={false}
                  onError={() => void handleImgError()}
                  onLoad={(e) => onNaturalSize?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  className="pointer-events-none absolute"
                  style={{
                    left: `${state.offsetX * 100}%`,
                    top: `${state.offsetY * 100}%`,
                    width: `${state.scale * 100}%`,
                    height: mode === "fill" ? `${state.scale * 100}%` : undefined,
                    objectFit: mode === "fill" ? "cover" : "contain",
                    transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
                  }}
                />
              )
            ) : designUrl && failed ? (
              <div className="absolute inset-0 grid place-items-center gap-2 px-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("No se pudo cargar tu diseño, vuelve a subirlo.", "We couldn't load your design, please upload it again.")}
                </p>
                {onReupload && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReupload();
                    }}
                    className="rounded-lg border-2 border-primary bg-primary-soft px-3 py-1 text-xs font-bold"
                  >
                    {t("Volver a subir", "Upload again")}
                  </button>
                )}
              </div>
            ) : (
              <span className="pointer-events-none absolute inset-0 grid place-items-center px-3 text-center text-xs font-semibold text-muted-foreground">
                {t("Sube tu diseño y aparecerá aquí", "Upload your design and it will appear here")}
              </span>
            )}

          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t(
            "Todo lo que quede dentro de este recuadro es lo que se imprime.",
            "Everything inside this frame is what gets printed.",
          )}
        </p>
      </div>

      {/* REFERENCIA: foto del producto con la zona resaltada (no es el lienzo) */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img src={productImage} alt="" className="size-full object-cover" draggable={false} />
          <div
            className="absolute rounded-[2px] border-2 border-primary bg-primary/15"
            style={{
              left: `${(box.cx - refW / 2) * 100}%`,
              top: `${(box.cy - refH / 2) * 100}%`,
              width: `${refW * 100}%`,
              height: `${refH * 100}%`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Referencia: aquí va aproximadamente la zona de impresión sobre el producto. La vista final de venta se genera en el paso de maquetas.",
            "Reference: this is roughly where the print area sits on the product. The final sales view is generated in the mockup step.",
          )}
        </p>
      </div>
    </div>
  );
}
