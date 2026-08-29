CREATE TABLE public.provider_cost_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider, cache_key)
);

GRANT ALL ON public.provider_cost_cache TO service_role;

ALTER TABLE public.provider_cost_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_provider_cost_cache_expires ON public.provider_cost_cache (expires_at);

CREATE TRIGGER trg_provider_cost_cache_updated
BEFORE UPDATE ON public.provider_cost_cache
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();