
-- 1) Revoke EXECUTE on SECURITY DEFINER functions that should not be callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_paid_order(uuid, integer) FROM PUBLIC, anon, authenticated;
-- handle_new_user runs from the auth trigger; apply_paid_order runs from the webhook via service_role.
-- has_role and active_plan_for remain callable by authenticated (used by RLS/UI).

-- 2) Tighten store_orders UPDATE: owners can only change status/notes, and cannot forge totals/payment
DROP POLICY IF EXISTS "Owners update their orders" ON public.store_orders;

CREATE POLICY "Owners update their orders"
ON public.store_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_orders.store_id AND s.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_orders.store_id AND s.owner_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.store_orders_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses RLS entirely, so this trigger only constrains signed-in owners.
  -- Prevent owners from mutating financial / immutable fields.
  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
     OR NEW.items IS DISTINCT FROM OLD.items
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
    -- Allow if executed by service_role (webhook)
    IF current_setting('request.jwt.claims', true) IS NULL
       OR (current_setting('request.jwt.claims', true)::jsonb->>'role') <> 'service_role' THEN
      RAISE EXCEPTION 'Owners can only update status and notes on orders';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_orders_owner_guard ON public.store_orders;
CREATE TRIGGER trg_store_orders_owner_guard
BEFORE UPDATE ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.store_orders_owner_guard();
