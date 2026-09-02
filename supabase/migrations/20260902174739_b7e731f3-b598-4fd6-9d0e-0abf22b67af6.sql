ALTER TABLE public._backup_fase2_stores_shipping ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_fase2_stores_shipping FROM anon, authenticated;
GRANT ALL ON public._backup_fase2_stores_shipping TO service_role;