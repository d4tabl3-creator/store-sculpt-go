
-- Lock down active_plan_for: caller must be self or admin
CREATE OR REPLACE FUNCTION public.active_plan_for(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT plan FROM public.merchant_subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','trialing','past_due')
      AND (current_period_end IS NULL OR current_period_end > now())
    ORDER BY CASE plan WHEN 'pro' THEN 1 ELSE 2 END, created_at DESC
    LIMIT 1
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.active_plan_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.active_plan_for(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.processed_stripe_events IS 'Internal: webhook idempotency. Access is service_role only by design.';
