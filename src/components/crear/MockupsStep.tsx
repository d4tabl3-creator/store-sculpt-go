import { useEffect, useState } from "react";
import { Check, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeUsuario } from "@/lib/user-message";
import { Button } from "@/components/ui/button";
import { createProductMockup } from "@/lib/catalog.functions";
import { useT } from "@/lib/i18n";
import { currentVariant, type ProductDraft } from "@/lib/product-draft";

/** Paso 3: maquetas del producto terminado. */
export function MockupsStep({
  draft,
  update,
}: {
  draft: ProductDraft;
  update: (patch: Partial<ProductDraft>) => void;
}) {
  const t = useT();
  const [rendering, setRendering] = useState(false);
  const current = currentVariant(draft);

  const variantImages = [...new Set(draft.variants.filter((v) => (draft.color ? v.color === draft.color : true)).map((v) => v.image).filter(Boolean))].slice(0, 6);

  async function render() {
    if (!draft.designUrl || !current) return;
    setRendering(true);
    try {
      const res = (await createProductMockup({
        data: {
          productId: draft.productId,
          variantIds: draft.selectedVariantIds.length ? draft.selectedVariantIds.slice(0, 5) : [current.id],
          placement: draft.placement,
          imageUrl: draft.designUrl,
          scale: draft.scale,
          offsetX: draft.offsetX,
          offsetY: draft.offsetY,
          angle: draft.rotation,
          printProviderId: draft.printProviderId ?? undefined,
        },
      })) as Array<{ placement: string; url: string }>;
      const urls = [...new Set(res.map((m) => m.url))];
      if (!urls.length) throw new Error(t("No se pudieron generar las maquetas", "Could not generate mockups"));
      update({ mockups: urls, mockupUrl: urls[0] });
    } catch (err) {
      toast.error(mensajeUsuario(err, t("No se pudieron generar las maquetas. Intenta de nuevo en unos minutos.", "Could not generate mockups. Please try again in a few minutes.")));
    } finally {
      setRendering(false);
    }
  }

  useEffect(() => {
    if (draft.designUrl && !draft.mockups.length && !rendering) void render();
  }, [draft.designUrl]);

  const gallery = draft.mockups.length ? draft.mockups : variantImages;

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold uppercase">{t("Maquetas", "Mockups")}</h1>
      <p className="mt-1 text-muted-foreground">
        {t("Así se verá tu producto. Elige la imagen principal de tu tienda.", "This is how your product will look. Choose the main image for your store.")}
      </p>

      {rendering && (
        <div className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("Generando maquetas…", "Generating mockups…")}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((url) => {
          const on = (draft.mockupUrl || gallery[0]) === url;
          return (
            <button
              key={url}
              onClick={() => update({ mockupUrl: draft.mockups.includes(url) ? url : null, image: url })}
              className={`relative overflow-hidden rounded-2xl border-2 bg-card transition-all ${on ? "border-primary" : "border-border hover:border-primary/50"}`}
            >
              {on && (
                <span className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" />
                </span>
              )}
              <img src={url} alt={draft.name} loading="lazy" className="aspect-square size-full object-cover" />
            </button>
          );
        })}
      </div>

      {draft.designUrl && !rendering && (
        <Button variant="outline" className="mt-6" onClick={render}>
          <Wand2 className="mr-2 size-4" /> {t("Volver a generar", "Generate again")}
        </Button>
      )}

      {!draft.designUrl && (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("Este producto se vende tal cual: estas son sus fotos.", "This product is sold as-is: these are its photos.")}
        </p>
      )}
    </section>
  );
}
