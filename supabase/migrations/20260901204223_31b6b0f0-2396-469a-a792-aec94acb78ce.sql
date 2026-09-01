ALTER TABLE public._backup_fase2_commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_fase2_store_products ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public._backup_fase2_commission_ledger FROM anon, authenticated;
REVOKE ALL ON public._backup_fase2_store_products FROM anon, authenticated;

GRANT ALL ON public._backup_fase2_commission_ledger TO service_role;
GRANT ALL ON public._backup_fase2_store_products TO service_role;