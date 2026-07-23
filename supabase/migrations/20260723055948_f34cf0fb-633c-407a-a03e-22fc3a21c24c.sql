
-- 1. Ampliar profiles con datos bancarios
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS clabe text,
  ADD COLUMN IF NOT EXISTS beneficiary_name text,
  ADD COLUMN IF NOT EXISTS tax_id text;

-- 2. merchant_subscriptions
CREATE TABLE public.merchant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('starter','pro')),
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe','coupon')),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchant_subs_user ON public.merchant_subscriptions(user_id);
GRANT SELECT ON public.merchant_subscriptions TO authenticated;
GRANT ALL ON public.merchant_subscriptions TO service_role;
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription readable" ON public.merchant_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_ms_updated BEFORE UPDATE ON public.merchant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. demo_coupons
CREATE TABLE public.demo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('starter','pro')),
  days_valid int NOT NULL DEFAULT 30 CHECK (days_valid > 0 AND days_valid <= 365),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_coupons TO authenticated;
GRANT ALL ON public.demo_coupons TO service_role;
ALTER TABLE public.demo_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.demo_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.demo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. coupon_redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.demo_coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own redemptions readable" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 5. commission_ledger
CREATE TABLE public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.store_orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_cents int NOT NULL,
  commission_cents int NOT NULL,
  net_owed_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at timestamptz,
  payout_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cl_owner ON public.commission_ledger(owner_id, status);
GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin reads ledger" ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- 6. processed_stripe_events (idempotency)
CREATE TABLE public.processed_stripe_events (
  id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.processed_stripe_events TO service_role;
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
-- (no policies for regular users; service role only)

-- 7. active_plan_for(user) -> text ('starter' | 'pro' | NULL)
CREATE OR REPLACE FUNCTION public.active_plan_for(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan
  FROM public.merchant_subscriptions
  WHERE user_id = _user_id
    AND status IN ('active','trialing','past_due')
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY
    CASE plan WHEN 'pro' THEN 1 ELSE 2 END,
    created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.active_plan_for(uuid) TO authenticated, service_role;

-- 8. apply_paid_order — marca pagado, baja stock, inserta commission (idempotente)
CREATE OR REPLACE FUNCTION public.apply_paid_order(
  _order_id uuid,
  _commission_bps int DEFAULT 1000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  item jsonb;
  gross int;
  commission int;
BEGIN
  SELECT so.*, s.owner_id
    INTO o
  FROM public.store_orders so
  JOIN public.stores s ON s.id = so.store_id
  WHERE so.id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF o.payment_status = 'paid' THEN RETURN; END IF;

  UPDATE public.store_orders
     SET payment_status = 'paid', status = 'paid'
   WHERE id = _order_id;

  -- decrement stock per item (best-effort, floors at 0)
  FOR item IN SELECT * FROM jsonb_array_elements(o.items)
  LOOP
    IF (item ? 'productId') THEN
      UPDATE public.store_products
         SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
       WHERE id = (item->>'productId')::uuid
         AND store_id = o.store_id;
    END IF;
  END LOOP;

  gross := o.total_cents;
  commission := (gross * _commission_bps) / 10000;

  INSERT INTO public.commission_ledger (order_id, store_id, owner_id, gross_cents, commission_cents, net_owed_cents)
  VALUES (_order_id, o.store_id, o.owner_id, gross, commission, gross - commission)
  ON CONFLICT (order_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, int) TO service_role;
REVOKE EXECUTE ON FUNCTION public.apply_paid_order(uuid, int) FROM public, authenticated;
