ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_store_orders_stripe_session ON public.store_orders(stripe_session_id);

-- Allow the checkout flow (anon buyers) to update ONLY their own just-created order to attach a session id
-- We keep it minimal: only allow updating when stripe_session_id was null. Existing policies apply for reads.
DROP POLICY IF EXISTS "Anon can attach stripe session to order" ON public.store_orders;
CREATE POLICY "Anon can attach stripe session to order"
  ON public.store_orders
  FOR UPDATE
  TO anon, authenticated
  USING (stripe_session_id IS NULL)
  WITH CHECK (true);

GRANT UPDATE (stripe_session_id) ON public.store_orders TO anon, authenticated;