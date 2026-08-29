ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_products
SET price_cents = GREATEST(base_cost_cents, 100) * 13 / 10
WHERE price_cents <= 0 AND base_cost_cents > 0;

UPDATE public.store_products
SET price_cents = 9900
WHERE price_cents <= 0;

CREATE OR REPLACE FUNCTION public.store_products_price_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.price_cents IS NULL OR NEW.price_cents <= 0 THEN
    RAISE EXCEPTION 'El precio de venta debe ser mayor a cero.';
  END IF;
  IF NEW.base_cost_cents > 0 AND NEW.price_cents < NEW.base_cost_cents THEN
    RAISE EXCEPTION 'El precio de venta no puede ser menor al costo real (% centavos).', NEW.base_cost_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_products_price_guard_trg ON public.store_products;
CREATE TRIGGER store_products_price_guard_trg
BEFORE INSERT OR UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.store_products_price_guard();