ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS source_provider text,
  ADD COLUMN IF NOT EXISTS source_product_id text,
  ADD COLUMN IF NOT EXISTS source_variant_id text;

ALTER TABLE public.stores ALTER COLUMN kit_id DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN kit_id SET DEFAULT 'catalogo';