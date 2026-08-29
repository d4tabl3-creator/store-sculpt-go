REVOKE EXECUTE ON FUNCTION public.apply_paid_order(uuid, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, integer) TO service_role;