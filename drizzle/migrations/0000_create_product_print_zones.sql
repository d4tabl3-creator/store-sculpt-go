CREATE TABLE public.product_print_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  placement text NOT NULL,
  design_url text,
  design_preview_url text,
  fit_mode text NOT NULL DEFAULT 'fit',
  scale numeric NOT NULL DEFAULT 0.8,
  tile_scale numeric NOT NULL DEFAULT 0.25,
  offset_x numeric NOT NULL DEFAULT 0.5,
  offset_y numeric NOT NULL DEFAULT 0.5,
  rotation numeric NOT NULL DEFAULT 0,
  area_width integer NOT NULL DEFAULT 0,
  area_height integer NOT NULL DEFAULT 0,
  natural_width integer,
  natural_height integer,
  dpi_estimate integer,
  external_file_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, placement)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_print_zones TO authenticated;
GRANT SELECT ON public.product_print_zones TO anon;
GRANT ALL ON public.product_print_zones TO service_role;

ALTER TABLE public.product_print_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage their print zones"
  ON public.product_print_zones FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "public reads zones of published stores"
  ON public.product_print_zones FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.stores s
                 WHERE s.id = product_print_zones.store_id AND s.status = 'published'));

CREATE TRIGGER trg_ppz_updated BEFORE UPDATE ON public.product_print_zones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_ppz_product ON public.product_print_zones(product_id);

CREATE OR REPLACE FUNCTION public.product_print_zones_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fit_mode NOT IN ('fit','fill','tile') THEN
    RAISE EXCEPTION 'ZONE_INVALID: modo de llenado no válido' USING ERRCODE = 'check_violation';
  END IF;
  NEW.scale := LEAST(3, GREATEST(0.05, COALESCE(NEW.scale, 0.8)));
  NEW.tile_scale := LEAST(1, GREATEST(0.05, COALESCE(NEW.tile_scale, 0.25)));
  NEW.offset_x := LEAST(1, GREATEST(0, COALESCE(NEW.offset_x, 0.5)));
  NEW.offset_y := LEAST(1, GREATEST(0, COALESCE(NEW.offset_y, 0.5)));
  NEW.rotation := LEAST(360, GREATEST(-360, COALESCE(NEW.rotation, 0)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ppz_guard BEFORE INSERT OR UPDATE ON public.product_print_zones
  FOR EACH ROW EXECUTE FUNCTION public.product_print_zones_guard();

INSERT INTO public.product_print_zones (product_id, store_id, owner_id, placement, design_url)
SELECT p.id, p.store_id, s.owner_id, COALESCE(p.placement, 'front'), p.design_url
FROM public.store_products p
JOIN public.stores s ON s.id = p.store_id
WHERE p.design_url IS NOT NULL
ON CONFLICT (product_id, placement) DO NOTHING;