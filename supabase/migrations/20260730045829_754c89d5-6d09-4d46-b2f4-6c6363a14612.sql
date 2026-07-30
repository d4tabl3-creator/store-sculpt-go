
-- 1. Providers catalog
CREATE TABLE public.commerce_providers (
  id text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_providers TO anon, authenticated;
GRANT ALL ON public.commerce_providers TO service_role;
ALTER TABLE public.commerce_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers are public" ON public.commerce_providers FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.commerce_providers (id, label, enabled) VALUES
  ('internal', 'Motor nativo DaTaBLe', true),
  ('shopify', 'Infraestructura de comercio A', true),
  ('woocommerce', 'Infraestructura de comercio B', false),
  ('mercadolibre', 'Marketplace regional', false);

-- 2. Store bindings (status, no secrets)
CREATE TABLE public.commerce_store_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'internal' REFERENCES public.commerce_providers(id),
  external_store_id text,
  external_domain text,
  provisioning_status text NOT NULL DEFAULT 'queued',
  provisioning_step text NOT NULL DEFAULT 'queued',
  provisioning_progress integer NOT NULL DEFAULT 0,
  provisioning_error text,
  attempts integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csb_owner ON public.commerce_store_bindings(owner_id);
CREATE INDEX idx_csb_status ON public.commerce_store_bindings(provisioning_status);
GRANT SELECT ON public.commerce_store_bindings TO authenticated;
GRANT ALL ON public.commerce_store_bindings TO service_role;
ALTER TABLE public.commerce_store_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads bindings" ON public.commerce_store_bindings
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_csb_updated BEFORE UPDATE ON public.commerce_store_bindings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Credentials (service role only, no grants to app roles)
CREATE TABLE public.commerce_store_credentials (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.commerce_providers(id),
  admin_token text,
  webhook_secret text,
  api_version text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.commerce_store_credentials TO service_role;
ALTER TABLE public.commerce_store_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_csc_updated BEFORE UPDATE ON public.commerce_store_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Product bindings
CREATE TABLE public.commerce_product_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.commerce_providers(id),
  external_product_id text,
  external_variant_id text,
  external_inventory_item_id text,
  sync_hash text,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, provider)
);
CREATE INDEX idx_cpb_store ON public.commerce_product_bindings(store_id);
GRANT SELECT ON public.commerce_product_bindings TO authenticated;
GRANT ALL ON public.commerce_product_bindings TO service_role;
ALTER TABLE public.commerce_product_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads product bindings" ON public.commerce_product_bindings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = commerce_product_bindings.store_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_cpb_updated BEFORE UPDATE ON public.commerce_product_bindings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Order bindings
CREATE TABLE public.commerce_order_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.commerce_providers(id),
  external_order_id text,
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  tracking_number text,
  tracking_url text,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, provider)
);
CREATE INDEX idx_cob_store ON public.commerce_order_bindings(store_id);
GRANT SELECT ON public.commerce_order_bindings TO authenticated;
GRANT ALL ON public.commerce_order_bindings TO service_role;
ALTER TABLE public.commerce_order_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads order bindings" ON public.commerce_order_bindings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = commerce_order_bindings.store_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_cob_updated BEFORE UPDATE ON public.commerce_order_bindings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Sync jobs queue
CREATE TABLE public.commerce_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL REFERENCES public.commerce_providers(id),
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csj_pending ON public.commerce_sync_jobs(status, run_after);
CREATE INDEX idx_csj_store ON public.commerce_sync_jobs(store_id);
GRANT SELECT ON public.commerce_sync_jobs TO authenticated;
GRANT ALL ON public.commerce_sync_jobs TO service_role;
ALTER TABLE public.commerce_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads sync jobs" ON public.commerce_sync_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = commerce_sync_jobs.store_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_csj_updated BEFORE UPDATE ON public.commerce_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. Event log
CREATE TABLE public.commerce_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text,
  direction text NOT NULL DEFAULT 'outbound',
  event text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cel_store ON public.commerce_event_log(store_id, created_at DESC);
GRANT SELECT ON public.commerce_event_log TO authenticated;
GRANT ALL ON public.commerce_event_log TO service_role;
ALTER TABLE public.commerce_event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads event log" ON public.commerce_event_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = commerce_event_log.store_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
