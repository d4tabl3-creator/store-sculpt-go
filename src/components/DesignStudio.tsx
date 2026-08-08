import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { createProductMockup, getCatalogProduct, getProductPlacements } from "@/lib/catalog.functions";

export type StudioResult = {
  productId: number;
  variantId: number;
  title: string;
  image: string;
  category: string;
  priceCents: number;
  designUrl?: string;
  mockupUrl?: string;
  placement?: string;
};

type Variant = {
  id: number;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  image: string;
  priceCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number;
  inStock: boolean;
};

type Placement = { id: string; label: string; areaWidth: number; areaHeight: number };

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
}

export function DesignStudio({
  productId,
  productTitle,
  category,
  open,
  onOpenChange,
  onSave,
}: {
  productId: number | null;
  productTitle: string;
  category: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (r: StudioResult) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [placement, setPlacement] = useState<string>("front");
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const [offsetY, setOffsetY] = useState(0.1);
  const [mockup, setMockup] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !productId) return;
    setLoading(true);
    setMockup(null);
    setDesignUrl(null);
    setDesignPreview(null);
    (async () => {
      try {
        const detail = (await getCatalogProduct({ data: { productId } })) as {
          product: { title: string };
          variants: Variant[];
        };
        setVariants(detail.variants);
        setName(detail.product.title);
        const first = detail.variants.find((v) => v.inStock) || detail.variants[0];
        setColor(first?.color ?? null);
        setVariantId(first?.id ?? null);
        const pl = (await getProductPlacements({ data: { productId, variantId: first?.id } })) as Placement[];
        setPlacements(pl);
        if (pl.length) setPlacement(pl[0].id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo abrir el estudio");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, productId]);

  const colors = useMemo(() => {
    const map = new Map<string, Variant>();
    for (const v of variants) if (v.color && !map.has(v.color)) map.set(v.color, v);
    return [...map.entries()];
  }, [variants]);

  const sizes = useMemo(() => {
    const list = variants.filter((v) => (color ? v.color === color : true));
    return list.sort((a, b) => SIZE_ORDER.indexOf(a.size || "") - SIZE_ORDER.indexOf(b.size || ""));
  }, [variants, color]);

  const current = variants.find((v) => v.id === variantId) ?? sizes[0] ?? variants[0];

  async function upload(file: File) {
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Inicia sesión otra vez");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/disenos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("disenos").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage.from("disenos").createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (!signed.data?.signedUrl) throw new Error("No se pudo preparar tu diseño");
      setDesignUrl(signed.data.signedUrl);
      setDesignPreview(URL.createObjectURL(file));
      setMockup(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el diseño");
    } finally {
      setUploading(false);
    }
  }

  async function render() {
    if (!productId || !designUrl || !current) return;
    setRendering(true);
    try {
      const res = (await createProductMockup({
        data: {
          productId,
          variantIds: [current.id],
          placement,
          imageUrl: designUrl,
          scale,
          offsetX: (1 - scale) / 2,
          offsetY,
        },
      })) as Array<{ placement: string; url: string }>;
      const hit = res.find((m) => m.placement === placement) || res[0];
      if (!hit) throw new Error("No se pudo generar la vista previa");
      setMockup(hit.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar la vista previa");
    } finally {
      setRendering(false);
    }
  }

  function save() {
    if (!productId || !current) return;
    onSave({
      productId,
      variantId: current.id,
      title: name.trim() || productTitle,
      image: mockup || current.image,
      category,
      priceCents: current.priceCents,
      designUrl: designUrl ?? undefined,
      mockupUrl: mockup ?? undefined,
      placement: mockup ? placement : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Estudio de diseño · {productTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Abriendo estudio…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vista previa */}
            <div>
              <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-border bg-muted">
                <img
                  src={mockup || current?.image}
                  alt={productTitle}
                  className="size-full object-cover"
                />
                {!mockup && designPreview && (
                  <img
                    src={designPreview}
                    alt="Tu diseño"
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 object-contain opacity-90"
                    style={{ width: `${scale * 55}%`, top: `${18 + offsetY * 50}%` }}
                  />
                )}
                {rendering && (
                  <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm font-bold">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Generando vista real…
                    </span>
                  </div>
                )}
              </div>
              {current && (
                <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio de venta sugerido</span>
                    <span className="font-bold">{money(current.priceCents)} MXN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo de producción y envío</span>
                    <span>{money(current.costCents)} MXN</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold text-primary">
                    <span>Tu ganancia por venta</span>
                    <span>
                      {money(current.marginCents)} ({current.marginPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="grid gap-4">
              <div>
                <Label htmlFor="pname">Nombre del producto en tu tienda</Label>
                <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {colors.length > 0 && (
                <div>
                  <Label>Color</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colors.map(([c, v]) => (
                      <button
                        key={c}
                        title={c}
                        onClick={() => {
                          setColor(c);
                          setVariantId(v.id);
                          setMockup(null);
                        }}
                        className={`size-8 rounded-full border-2 ${color === c ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
                        style={{ background: v.colorCode || "#ccc" }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizes.some((v) => v.size) && (
                <div>
                  <Label>Talla / medida</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizes.map((v) => (
                      <button
                        key={v.id}
                        disabled={!v.inStock}
                        onClick={() => {
                          setVariantId(v.id);
                          setMockup(null);
                        }}
                        className={`rounded-lg border-2 px-3 py-1 text-xs font-bold disabled:opacity-40 ${
                          variantId === v.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                        }`}
                      >
                        {v.size || v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {placements.length > 0 ? (
                <>
                  <div>
                    <Label>¿Dónde va tu diseño?</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {placements.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPlacement(p.id);
                            setMockup(null);
                          }}
                          className={`rounded-lg border-2 px-3 py-1 text-xs font-bold ${
                            placement === p.id ? "border-primary bg-primary-soft" : "border-border bg-card"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Tu diseño (PNG con fondo transparente, mínimo 1500 px)</Label>
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
                      {designUrl ? "Cambiar diseño" : "Subir diseño"}
                    </Button>
                  </div>

                  {designUrl && (
                    <>
                      <div>
                        <Label>Tamaño del diseño</Label>
                        <Slider
                          className="mt-3"
                          value={[scale]}
                          min={0.2}
                          max={1}
                          step={0.05}
                          onValueChange={([v]) => {
                            setScale(v);
                            setMockup(null);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Altura del diseño</Label>
                        <Slider
                          className="mt-3"
                          value={[offsetY]}
                          min={0}
                          max={Math.max(0, 1 - scale)}
                          step={0.02}
                          onValueChange={([v]) => {
                            setOffsetY(v);
                            setMockup(null);
                          }}
                        />
                      </div>
                      <Button onClick={render} disabled={rendering} className="shine-on-hover">
                        {rendering ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
                        Ver cómo queda de verdad
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este producto se vende tal cual, sin personalización de diseño.
                </p>
              )}

              <Button onClick={save} className="shadow-cta">
                Agregar a mi tienda
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
