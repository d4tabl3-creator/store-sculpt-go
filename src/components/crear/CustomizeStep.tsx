import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { getCatalogProduct, getProductPlacements } from "@/lib/catalog.functions";
import { useT } from "@/lib/i18n";
import { SIZE_ORDER, currentVariant, money, type DraftPlacement, type DraftVariant, type ProductDraft } from "@/lib/product-draft";

/** Paso 2: preparar diseño, variantes y opciones disponibles. */
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
        const detail = (await getCatalogProduct({ data: { productId: draft.productId } })) as {
          product: { title: string; description: string };
          variants: DraftVariant[];
        };
        if (!alive) return;
        const first = detail.variants.find((v) => v.inStock) || detail.variants[0];
        const pl = (await getProductPlacements({ data: { productId: draft.productId, variantId: first?.id } })) as DraftPlacement[];
        if (!alive) return;
        update({
          variants: detail.variants,
          placements: pl,
          placement: pl[0]?.id ?? "front",
          color: first?.color ?? null,
          variantId: first?.id ?? null,
          selectedVariantIds: first ? [first.id] : [],
          priceCents: first?.priceCents ?? null,
          description: draft.description || detail.product.description || "",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("No se pudo abrir el editor", "Could not open the editor"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft.productId]);

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

  async function upload(file: File) {
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error(t("Inicia sesión otra vez", "Please sign in again"));
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/disenos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("disenos").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (!signed.data?.signedUrl) throw new Error(t("No se pudo preparar tu diseño", "Could not prepare your design"));
      update({ designUrl: signed.data.signedUrl, designPreview: URL.createObjectURL(file), mockups: [], mockupUrl: null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("No se pudo subir el diseño", "Could not upload the design"));
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
        {t("Prepara tu diseño y define las opciones que verán tus clientes.", "Prepare your design and set the options your customers will see.")}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-border bg-muted">
            <img src={draft.mockupUrl || current?.image || draft.image} alt={draft.catalogTitle} className="size-full object-cover" />
            {!draft.mockupUrl && draft.designPreview && (
              <img
                src={draft.designPreview}
                alt={t("Tu diseño", "Your design")}
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 object-contain opacity-90"
                style={{ width: `${draft.scale * 55}%`, top: `${18 + draft.offsetY * 50}%` }}
              />
            )}
          </div>
          {current && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Precio de venta sugerido", "Suggested selling price")}</span>
                <span className="font-bold">{money(current.priceCents)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Costo de producción y envío", "Production and shipping cost")}</span>
                <span>{money(current.costCents)} MXN</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
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
                      {p.label}
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
                  <div>
                    <Label>{t("Tamaño del diseño", "Design size")}</Label>
                    <Slider
                      className="mt-3"
                      value={[draft.scale]}
                      min={0.2}
                      max={1}
                      step={0.05}
                      onValueChange={([v]) => update({ scale: v, mockups: [], mockupUrl: null })}
                    />
                  </div>
                  <div>
                    <Label>{t("Altura del diseño", "Design height")}</Label>
                    <Slider
                      className="mt-3"
                      value={[draft.offsetY]}
                      min={0}
                      max={Math.max(0, 1 - draft.scale)}
                      step={0.02}
                      onValueChange={([v]) => update({ offsetY: v, mockups: [], mockupUrl: null })}
                    />
                  </div>
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
