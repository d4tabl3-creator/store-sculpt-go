DROP POLICY IF EXISTS "Anon can attach stripe session to order" ON public.store_orders;
REVOKE UPDATE (stripe_session_id) ON public.store_orders FROM anon, authenticated;