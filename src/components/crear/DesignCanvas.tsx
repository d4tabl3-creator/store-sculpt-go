import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

/**
 * Lienzo de diseño.
 *
 * Muestra la foto del producto y, ENCIMA, la zona imprimible real como área
 * delimitada. El diseño del comerciante se coloca, mueve, escala y rota
 * DENTRO de esa zona. Este lienzo nunca es una maqueta promocional: la
 * maqueta se genera aparte, en el paso siguiente.
 *
 * FALLBACK INTERNO (documentado a propósito): el proveedor entrega el tamaño
 * del área imprimible en píxeles (areaWidth/areaHeight) pero NO entrega las
 * coordenadas de esa área sobre la foto del producto. Por eso la caja se
 * ubica con proporciones estándar por tipo de posición (frente, espalda,
 * mangas…), conservando la relación de aspecto REAL del área del proveedor.
 * Las coordenadas que se envían para fabricar/maquetar son relativas al área
 * imprimible, así que el fallback sólo afecta la referencia visual.
 */

/** Caja de referencia visual: fracciones del alto/ancho de la foto del producto. */
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
};

export function DesignCanvas({
  productImage,
  designUrl,
  placementId,
  areaWidth,
  areaHeight,
  state,
  onChange,
}: {
  productImage: string;
  designUrl: string | null;
  placementId: string;
  areaWidth: number;
  areaHeight: number;
  state: DesignPlacementState;
  onChange: (patch: Partial<DesignPlacementState>) => void;
}) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const box = AREA_BOX[placementId] ?? AREA_BOX.default;
  const ratio = areaWidth > 0 && areaHeight > 0 ? areaHeight / areaWidth : 1.25;
  // El lienzo es cuadrado, así que el alto en % se deriva del ancho por la
  // relación de aspecto real del área del proveedor.
  const areaW = box.w;
  const areaH = Math.min(0.9, box.w * ratio);

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
    <div className="relative aspect-square select-none overflow-hidden rounded-2xl border-2 border-border bg-muted">
      <img src={productImage} alt="" className="pointer-events-none size-full object-cover" draggable={false} />

      {/* Zona imprimible real del producto */}
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          if (!designUrl) return;
          setDragging(true);
          move(e.clientX, e.clientY);
        }}
        className={`absolute rounded-sm border-2 border-dashed border-primary/80 bg-primary/5 ${designUrl ? "cursor-move" : ""}`}
        style={{
          left: `${(box.cx - areaW / 2) * 100}%`,
          top: `${(box.cy - areaH / 2) * 100}%`,
          width: `${areaW * 100}%`,
          height: `${areaH * 100}%`,
        }}
      >
        <span className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          {t("Zona de impresión", "Print area")}
        </span>

        {designUrl ? (
          <img
            src={designUrl}
            alt={t("Tu diseño", "Your design")}
            draggable={false}
            className="pointer-events-none absolute object-contain"
            style={{
              left: `${state.offsetX * 100}%`,
              top: `${state.offsetY * 100}%`,
              width: `${state.scale * 100}%`,
              transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
            }}
          />
        ) : (
          <span className="pointer-events-none absolute inset-0 grid place-items-center px-2 text-center text-[11px] font-semibold text-primary">
            {t("Aquí va tu diseño", "Your design goes here")}
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/85 px-2 py-1 text-[10px] text-muted-foreground">
        {areaWidth > 0 ? `${areaWidth} × ${areaHeight} px` : t("Área de impresión", "Print area")}
      </div>
    </div>
  );
}
