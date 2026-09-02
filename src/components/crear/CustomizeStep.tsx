import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { mensajeUsuario } from "@/lib/user-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { DesignCanvas } from "@/components/crear/DesignCanvas";
import { getCatalogProduct, getProductPlacements } from "@/lib/catalog.functions";
import { useT } from "@/lib/i18n";
import { placementLabel, productionOptionLabel } from "@/lib/catalog-labels";
import {
  SIZE_ORDER,
  currentVariant,
  money,
  switchZone,
  zoneHasDesign,
  type DraftPlacement,
  type DraftProvider,
  type DraftVariant,
  type ProductDraft,
} from "@/lib/product-draft";



/** Paso 2: lienzo de diseño, variantes y opciones disponibles. */
export function CustomizeStep({
  draft,
  update,
}: {
  draft: ProductDraft;
  update: (patch: Partial<ProductDraft>) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(draft.variants.length === 0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (draft.variants.length) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const detail = (await getCatalogProduct({
          data: { productId: draft.productId, printProviderId: draft.printProviderId ?? undefined },
        })) as {
          product: { title: string; description: string };
          variants: DraftVariant[];
          providers: DraftProvider[];
          printProviderId: number;
        };
        if (!alive) return;
        const first = detail.variants.find((v) => v.inStock) || detail.variants[0];
        const pl = (await getProductPlacements({
          data: { productId: draft.productId, variantId: first?.id, printProviderId: detail.printProviderId },
        })) as DraftPlacement[];
        if (!alive) return;
        update({
          variants: detail.variants,
          providers: detail.providers ?? [],
          printProviderId: detail.printProviderId,
          placements: pl,
          placement: pl.find((p) => p.id === "front")?.id ?? pl[0]?.id ?? "front",
          color: first?.color ?? null,
          variantId: first?.id ?? null,
          selectedVariantIds: first ? [first.id] : [],
          priceCents: first?.priceCents ?? null,
          description: draft.description || detail.product.description || "",
        });
      } catch (err) {
        toast.error(mensajeUsuario(err, t("No se pudo abrir el editor. Intenta de nuevo en unos minutos.", "Could not open the editor. Please try again in a few minutes.")));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft.productId, draft.printProviderId]);

  /** Cambiar de opción de producción recarga variantes, áreas y costos reales. */
  function chooseProvider(id: number) {
    if (id === draft.printProviderId) return;
    update({
      printProviderId: id,
      variants: [],
      placements: [],
      variantId: null,
      selectedVariantIds: [],
      mockups: [],
      mockupUrl: null,
      priceCents: null,
    });
  }

  const colors = useMemo(() => {
    const map = new Map<string, DraftVariant>();
    for (const v of draft.variants) if (v.color && !map.has(v.color)) map.set(v.color, v);
    return [...map.entries()];
  }, [draft.variants]);

  const sizes = useMemo(() => {
    const list = draft.variants.filter((v) => (draft.color ? v.color === draft.color : true));
    return [...list].sort((a, b) => SIZE_ORDER.indexOf(a.size || "") - SIZE_ORDER.indexOf(b.size || ""));
  }, [draft.variants, draft.color]);

  const current = currentVariant(draft);

  /** Sólo se ofrecen las zonas que admite la variante elegida. */
  const zonas = useMemo(() => {
    const id = current?.id;
    return draft.placements.filter((p) => !p.variantIds?.length || !id || p.variantIds.includes(id));
  }, [draft.placements, current?.id]);

  const area = zonas.find((p) => p.id === draft.placement) ?? zonas[0] ?? draft.placements[0];

  // Si la zona activa no existe para esta variante, se pasa a una válida.
  useEffect(() => {
    if (!zonas.length) return;
    if (zonas.some((p) => p.id === draft.placement)) return;
    update(switchZone(draft, zonas.find((p) => p.id === "front")?.id ?? zonas[0].id));
  }, [zonas, draft.placement]);


  /** Vigencia corta del enlace del diseño; se renueva cuando hace falta. */
  const FIRMA_SEGUNDOS = 60 * 60 * 24 * 7;

  /** Extrae la ruta dentro del almacén a partir de un enlace firmado. */
  function rutaDesdeEnlace(url: string | null): string | null {
    if (!url) return null;
    const m = url.match(/\/object\/sign\/disenos\/([^?]+)/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }

  /** Renueva el enlace firmado del diseño si caducó o falló. */
  async function renovarEnlace(): Promise<boolean> {
    const path = rutaDesdeEnlace(draft.designUrl);
    if (!path) return false;
    try {
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, FIRMA_SEGUNDOS);
      if (!signed.data?.signedUrl) return false;
      update({ designUrl: signed.data.signedUrl });
      return true;
    } catch (err) {
      console.error("[disenos] no se pudo renovar el enlace del diseño", err);
      return false;
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Inicia sesión otra vez", "Please sign in again"));
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/disenos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("disenos").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, FIRMA_SEGUNDOS);
      if (!signed.data?.signedUrl) throw new Error(t("No se pudo preparar tu diseño", "Could not prepare your design"));
      update({ designUrl: signed.data.signedUrl, designPreview: URL.createObjectURL(file), mockups: [], mockupUrl: null });
    } catch (err) {
      toast.error(mensajeUsuario(err, t("No se pudo subir el diseño. Intenta de nuevo en unos minutos.", "Could not upload the design. Please try again in a few minutes.")));
    } finally {
      setUploading(false);
    }
  }


  function toggleVariant(id: number) {
    const on = draft.selectedVariantIds.includes(id);
    const next = on ? draft.selectedVariantIds.filter((x) => x !== id) : [...draft.selectedVariantIds, id];
    update({ selectedVariantIds: next.length ? next : [id], variantId: on ? draft.variantId : id, mockups: [], mockupUrl: null });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {t("Preparando el editor…", "Preparing the editor…")}
      </div>
    );
  }

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold uppercase">{t("Personalizar", "Customize")}</h1>
      <p className="mt-1 text-muted-foreground">
        {t(
          "Coloca tu diseño dentro de la zona de impresión. La vista de venta se genera en el siguiente paso.",
          "Place your design inside the print area. The sales preview is generated in the next step.",
        )}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          {draft.placements.length > 0 ? (
            <DesignCanvas
              productImage={current?.image || draft.image}
              designUrl={draft.designUrl || draft.designPreview}
              placementId={draft.placement}
              placementLabel={area ? placementLabel(area.id, area.label, t) : undefined}
              areaWidth={area?.areaWidth ?? 0}
              areaHeight={area?.areaHeight ?? 0}
              state={{ offsetX: draft.offsetX, offsetY: draft.offsetY, scale: draft.scale, rotation: draft.rotation }}
              onChange={(patch) => update({ ...patch, mockups: [], mockupUrl: null })}
              onRetryDesign={renovarEnlace}
              onReupload={() => fileRef.current?.click()}
            />


          ) : (
            <div className="aspect-square overflow-hidden rounded-2xl border-2 border-border bg-muted">
              <img src={current?.image || draft.image} alt={draft.catalogTitle} className="size-full object-cover" />
            </div>
          )}

          {current && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Precio de venta sugerido", "Suggested selling price")}</span>
                <span className="font-bold">{money(current.priceCents)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Costo de fabricación", "Production cost")}</span>
                <span>{money(current.productionCents ?? current.costCents)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Envío (se cobra aparte)", "Shipping (charged separately)")}</span>
                <span>{money(current.shippingCents ?? 0)} MXN</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("El costo lo define la producción y no se puede editar.", "The cost is set by production and cannot be edited.")}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {draft.providers.length > 1 && (
            <div>
              <Label>{t("Opciones de producción", "Production options")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.providers.map((pv, i) => (
                  <button
                    key={pv.id}
                    onClick={() => chooseProvider(pv.id)}
                    className={`rounded-lg border-2 px-3 py-1 text-left text-xs font-bold ${
                      draft.printProviderId === pv.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                    }`}
                  >
                    {productionOptionLabel(i, t)}
                    {pv.location ? <span className="block font-normal text-muted-foreground">{pv.location}</span> : null}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Cada opción tiene sus propios costos, tallas y colores.", "Each option has its own costs, sizes and colors.")}
              </p>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <Label>{t("Color", "Color")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map(([c, v]) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => update({ color: c, variantId: v.id, selectedVariantIds: [v.id], mockups: [], mockupUrl: null })}
                    className={`size-8 rounded-full border-2 ${draft.color === c ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
                    style={{ background: v.colorCode || "#ccc" }}
                  />
                ))}
              </div>
            </div>
          )}

          {sizes.some((v) => v.size) && (
            <div>
              <Label>{t("Tallas y medidas que ofrecerás", "Sizes you will offer")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((v) => (
                  <button
                    key={v.id}
                    disabled={!v.inStock}
                    onClick={() => toggleVariant(v.id)}
                    className={`rounded-lg border-2 px-3 py-1 text-xs font-bold disabled:opacity-40 ${
                      draft.selectedVariantIds.includes(v.id) ? "border-primary bg-primary-soft" : "border-border bg-card"
                    }`}
                  >
                    {v.size || v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft.placements.length > 0 ? (
            <>
              <div>
                <Label>{t("¿Dónde va tu diseño?", "Where does your design go?")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.placements.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => update({ placement: p.id, mockups: [], mockupUrl: null })}
                      className={`rounded-lg border-2 px-3 py-1 text-xs font-bold ${
                        draft.placement === p.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                      }`}
                    >
                      {placementLabel(p.id, p.label, t)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>{t("Tu diseño (PNG con fondo transparente, mínimo 1500 px)", "Your design (PNG with transparent background, minimum 1500 px)")}</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                />
                <Button variant="outline" className="mt-2 w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                  {draft.designUrl ? t("Cambiar diseño", "Change design") : t("Subir diseño", "Upload design")}
                </Button>
              </div>

              {draft.designUrl && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t("Arrastra tu diseño dentro de la zona punteada para colocarlo.", "Drag your design inside the dotted area to position it.")}
                  </p>
                  <div>
                    <Label>{t("Tamaño del diseño", "Design size")}</Label>
                    <Slider
                      className="mt-3"
                      value={[draft.scale]}
                      min={0.1}
                      max={1}
                      step={0.05}
                      onValueChange={([v]) => update({ scale: v, mockups: [], mockupUrl: null })}
                    />
                  </div>
                  <div>
                    <Label>{t("Giro del diseño", "Design rotation")}</Label>
                    <Slider
                      className="mt-3"
                      value={[draft.rotation]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([v]) => update({ rotation: v, mockups: [], mockupUrl: null })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => update({ offsetX: 0.5, offsetY: 0.5, scale: 0.8, rotation: 0, mockups: [], mockupUrl: null })}
                  >
                    <RotateCcw className="mr-2 size-4" /> {t("Centrar diseño", "Center design")}
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("Este producto se vende tal cual, sin personalización de diseño.", "This product is sold as-is, without design customization.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
