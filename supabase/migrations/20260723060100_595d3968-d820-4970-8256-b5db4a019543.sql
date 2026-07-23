REVOKE EXECUTE ON FUNCTION public.apply_paid_order(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, int) TO service_role;