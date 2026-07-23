
-- 1. New private table for payment email
CREATE TABLE public.store_payment_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  payment_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payment_settings TO authenticated;
GRANT ALL ON public.store_payment_settings TO service_role;

ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own payment settings"
  ON public.store_payment_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners insert own payment settings"
  ON public.store_payment_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners update own payment settings"
  ON public.store_payment_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners delete own payment settings"
  ON public.store_payment_settings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE TRIGGER touch_store_payment_settings
  BEFORE UPDATE ON public.store_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Migrate existing data
INSERT INTO public.store_payment_settings (store_id, payment_email)
SELECT id, payment_email FROM public.stores WHERE payment_email IS NOT NULL;

-- 3. Drop public column
ALTER TABLE public.stores DROP COLUMN payment_email;

-- 4. Restrict has_role: revoke from authenticated (not used in any RLS policy directly)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, PUBLIC;
