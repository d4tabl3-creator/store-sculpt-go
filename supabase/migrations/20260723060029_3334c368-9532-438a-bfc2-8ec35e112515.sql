
REVOKE EXECUTE ON FUNCTION public.active_plan_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.active_plan_for(uuid) TO service_role;
