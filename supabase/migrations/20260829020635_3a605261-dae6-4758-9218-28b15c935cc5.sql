INSERT INTO public.commerce_providers (id, label, enabled)
VALUES ('printify', 'Fulfillment bajo demanda', true)
ON CONFLICT (id) DO UPDATE SET enabled = true;

UPDATE public.commerce_providers SET enabled = false WHERE id = 'printful';

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS base_cost_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS base_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_margin_cents integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_paid_order(_order_id uuid, _commission_bps integer DEFAULT 2000)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o record;
  item jsonb;
  gross int;
  base_total int := 0;
  seller_margin int;
  commission int;
  item_cost int;
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

  -- Descontar inventario y acumular el costo base real de cada línea.
  FOR item IN SELECT * FROM jsonb_array_elements(o.items)
  LOOP
    IF (item ? 'productId') THEN
      UPDATE public.store_products
         SET stock = GREATEST(0, stock - COALESCE((item->>'qty')::int, 0))
       WHERE id = (item->>'productId')::uuid
         AND store_id = o.store_id;

      SELECT COALESCE(base_cost_cents, 0) INTO item_cost
        FROM public.store_products
       WHERE id = (item->>'productId')::uuid
         AND store_id = o.store_id;

      base_total := base_total + COALESCE(item_cost, 0) * COALESCE((item->>'qty')::int, 0);
    END IF;
  END LOOP;

  gross := o.total_cents;

  -- La comisión NUNCA se calcula sobre la venta bruta: solo sobre la ganancia
  -- adicional del vendedor (precio de venta menos costo base de fabricación y envío).
  seller_margin := GREATEST(0, gross - base_total);
  commission := (seller_margin * COALESCE(_commission_bps, 0)) / 10000;

  INSERT INTO public.commission_ledger (
    order_id, store_id, owner_id,
    gross_cents, base_cost_cents, seller_margin_cents,
    commission_cents, net_owed_cents
  )
  VALUES (
    _order_id, o.store_id, o.owner_id,
    gross, base_total, seller_margin,
    commission, seller_margin - commission
  )
  ON CONFLICT (order_id) DO NOTHING;
END;
$function$;