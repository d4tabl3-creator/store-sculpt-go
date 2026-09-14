-- =====================================================================
-- Dªtªblɛ Stores — FASE 5, PARTE A (correcciones)
-- Autorizada por Alexa el 14-sep-2026
-- 100 % ADITIVA salvo un UPDATE controlado de 22 filas de relleno.
-- No borra tablas, no borra columnas, no modifica ningún precio.
-- =====================================================================

-- 1. Corrección del relleno: las 22 filas se crearon con tamaño 0.8,
--    pero lo que hoy viaja de verdad a fabricación es 0.9. Se igualan
--    para que ningún producto ya publicado se imprima más chico.
UPDATE public.product_print_zones
   SET scale = 0.9, updated_at = now()
 WHERE scale = 0.8;

-- 2. Porcentaje único de ganancia por tienda.
--    Nace en NULL: mientras la vendedora no lo defina, nada cambia de precio.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS markup_pct numeric(6,2);

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_markup_pct_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_markup_pct_check
  CHECK (markup_pct IS NULL OR (markup_pct >= 0 AND markup_pct <= 1000));

COMMENT ON COLUMN public.stores.markup_pct IS
  'Ganancia de la vendedora en %, sobre el costo base de cada variante. NULL = aun no la define.';

-- 3. Variantes vendibles (talla + color).
--    Mismo patrón de columnas y de seguridad que product_print_zones.
CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  store_id                uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id                uuid NOT NULL,
  source_variant_id       text NOT NULL,
  size                    text,
  color                   text,
  color_code              text,
  image_url               text,
  production_cost_cents   integer NOT NULL DEFAULT 0,
  shipping_cost_cents     integer NOT NULL DEFAULT 0,
  in_stock                boolean NOT NULL DEFAULT true,
  sort_order              integer NOT NULL DEFAULT 0,
  metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_product_variants_unique UNIQUE (product_id, source_variant_id)
);

CREATE INDEX IF NOT EXISTS store_product_variants_product_idx
  ON public.store_product_variants (product_id, sort_order);

CREATE INDEX IF NOT EXISTS store_product_variants_store_idx
  ON public.store_product_variants (store_id);

COMMENT ON TABLE public.store_product_variants IS
  'Una fila por talla+color vendible de un producto. El costo de fabrica vive aqui porque cambia entre variantes.';

ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage their product variants" ON public.store_product_variants;
CREATE POLICY "owners manage their product variants"
  ON public.store_product_variants FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "public reads variants of published stores" ON public.store_product_variants;
CREATE POLICY "public reads variants of published stores"
  ON public.store_product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_product_variants.store_id AND s.status = 'published'
  ));

-- 4. Relleno: cada producto actual recibe su variante actual.
INSERT INTO public.store_product_variants
  (product_id, store_id, owner_id, source_variant_id, image_url,
   production_cost_cents, shipping_cost_cents, sort_order)
SELECT p.id, p.store_id, s.owner_id, p.source_variant_id, p.image_url,
       COALESCE(p.production_cost_cents, 0), COALESCE(p.shipping_cost_cents, 0), 0
FROM public.store_products p
JOIN public.stores s ON s.id = p.store_id
WHERE p.source_variant_id IS NOT NULL
ON CONFLICT (product_id, source_variant_id) DO NOTHING;