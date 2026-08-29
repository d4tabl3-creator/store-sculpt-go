REVOKE ALL ON FUNCTION public.apply_paid_order(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, integer) TO service_role;