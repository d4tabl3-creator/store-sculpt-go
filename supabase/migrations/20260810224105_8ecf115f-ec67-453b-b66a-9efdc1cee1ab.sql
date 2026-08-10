CREATE TABLE public.commerce_design_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'internal' REFERENCES public.commerce_providers(id),
  kind text NOT NULL DEFAULT 'file',
  source text NOT NULL DEFAULT 'upload',
  placement text,
  url text,
  preview_url text,
  external_file_id text,
  external_template_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_design_assets TO authenticated;
GRANT ALL ON public.commerce_design_assets TO service_role;

ALTER TABLE public.commerce_design_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their design assets"
ON public.commerce_design_assets
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_design_assets_store ON public.commerce_design_assets(store_id);
CREATE INDEX idx_design_assets_product ON public.commerce_design_assets(product_id);

CREATE TRIGGER trg_design_assets_updated
BEFORE UPDATE ON public.commerce_design_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.commerce_product_bindings ADD COLUMN IF NOT EXISTS external_template_id text;