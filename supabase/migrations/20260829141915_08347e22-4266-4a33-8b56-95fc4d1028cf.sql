-- =============================================================================
-- FASE 2 — Estructura de costos y comisión de DªTªBLe Stores
--
-- Reglas comerciales vigentes (29 ago 2026):
--   production_cost_cents  = costo real de fabricación del proveedor
--   shipping_cost_cents    = costo real de envío del proveedor
--   seller_margin_cents    = precio de venta del producto − fabricación
--   commission (Datable)   = 20 % de seller_margin_cents
--   seller_net_margin      = seller_margin − commission
--   El envío se cobra al cliente por separado y NUNCA entra en la comisión.
--
-- Esta migración NO borra datos ni columnas. `base_cost_cents` se conserva
-- como columna derivada (fabricación + envío) para compatibilidad con código
-- que aún la lea; el trigger la mantiene sincronizada.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Respaldo lógico de las filas que se van a transformar
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._backup_fase2_store_products AS
  SELECT now() AS backed_up_at, * FROM public.store_products;
CREATE TABLE IF NOT EXISTS public._backup_fase2_commission_ledger AS
  SELECT now() AS backed_up_at, * FROM public.commission_ledger;
CREATE TABLE IF NOT EXISTS public._backup_fase2_stores_shipping AS
  SELECT now() AS backed_up_at, id, shipping_options FROM public.stores;
REVOKE ALL ON public._backup_fase2_store_products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public._backup_fase2_commission_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public._backup_fase2_stores_shipping FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. store_products: costos separados
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS production_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost_cents   integer NOT NULL DEFAULT 0,
  -- true cuando el reparto fabricación/envío no pudo reconstruirse y debe
  -- volver a leerse del proveedor (sync_product lo corrige).
  ADD COLUMN IF NOT EXISTS costs_need_resync     boolean NOT NULL DEFAULT false;

-- Valores existentes: sólo se conocía la suma. Se asigna todo a fabricación
-- (criterio conservador: el precio mínimo sube, nunca baja) y se marca para
-- resincronizar con el proveedor. No se pierde ningún valor: base_cost_cents
-- queda intacto y además respaldado.
UPDATE public.store_products
   SET production_cost_cents = base_cost_cents,
       shipping_cost_cents   = 0,
       costs_need_resync     = (base_cost_cents > 0)
 WHERE production_cost_cents = 0 AND shipping_cost_cents = 0;

-- ---------------------------------------------------------------------------
-- 2. Guardia de precio: > 0 y >= costo de FABRICACIÓN (no del envío).
--    Mantiene base_cost_cents = fabricación + envío.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_products_price_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Compatibilidad: si una escritura antigua sólo trae base_cost_cents (suma),
  -- se conserva como fabricación y se marca para resincronizar con el proveedor.
  IF COALESCE(NEW.production_cost_cents, 0) = 0 AND COALESCE(NEW.shipping_cost_cents, 0) = 0
     AND COALESCE(NEW.base_cost_cents, 0) > 0 THEN
    NEW.production_cost_cents := NEW.base_cost_cents;
    NEW.costs_need_resync := true;
  END IF;
  NEW.base_cost_cents := COALESCE(NEW.production_cost_cents, 0) + COALESCE(NEW.shipping_cost_cents, 0);

  IF NEW.price_cents IS NULL OR NEW.price_cents <= 0 THEN
    RAISE EXCEPTION 'PRICE_INVALID: el precio de venta debe ser mayor a cero.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.price_cents < COALESCE(NEW.production_cost_cents, 0) THEN
    RAISE EXCEPTION 'PRICE_BELOW_COST: el precio de venta (%) no puede ser menor al costo de fabricación (%).',
      NEW.price_cents, NEW.production_cost_cents
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_products_price_guard_trg ON public.store_products;
CREATE TRIGGER store_products_price_guard_trg
BEFORE INSERT OR UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.store_products_price_guard();

-- ---------------------------------------------------------------------------
-- 3. Protección de costos del proveedor: sólo el servidor (service_role) o el
--    propietario de la base pueden escribirlos. El navegador (authenticated)
--    no puede crearlos ni modificarlos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_products_cost_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  privileged boolean := current_user IN ('service_role', 'postgres', 'supabase_admin');
BEGIN
  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.production_cost_cents, 0) <> 0
       OR COALESCE(NEW.shipping_cost_cents, 0) <> 0
       OR COALESCE(NEW.base_cost_cents, 0) <> 0 THEN
      RAISE EXCEPTION 'COST_PROTECTED: los costos del proveedor sólo los establece el servidor.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.production_cost_cents IS DISTINCT FROM OLD.production_cost_cents
     OR NEW.shipping_cost_cents IS DISTINCT FROM OLD.shipping_cost_cents
     OR NEW.base_cost_cents IS DISTINCT FROM OLD.base_cost_cents
     OR NEW.costs_need_resync IS DISTINCT FROM OLD.costs_need_resync
     OR NEW.source_provider IS DISTINCT FROM OLD.source_provider
     OR NEW.source_product_id IS DISTINCT FROM OLD.source_product_id
     OR NEW.source_variant_id IS DISTINCT FROM OLD.source_variant_id THEN
    RAISE EXCEPTION 'COST_PROTECTED: los costos del proveedor no pueden modificarse desde la cuenta del vendedor.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_products_cost_guard_trg ON public.store_products;
DROP TRIGGER IF EXISTS a_store_products_cost_guard_trg ON public.store_products;
-- Debe correr ANTES que el price_guard (orden alfabético de nombre de trigger)
-- para que el price_guard no recalcule base_cost_cents y oculte el cambio.
CREATE TRIGGER a_store_products_cost_guard_trg
BEFORE INSERT OR UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.store_products_cost_guard();

-- ---------------------------------------------------------------------------
-- 4. Publicación de tienda: no se puede pasar a 'published' con productos
--    inválidos (precio <= 0, precio < fabricación, o costo desconocido en
--    productos que fabrica un proveedor).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stores_publish_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bad int;
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    SELECT count(*) INTO bad
      FROM public.store_products p
     WHERE p.store_id = NEW.id
       AND (
         p.price_cents <= 0
         OR p.price_cents < p.production_cost_cents
         OR (COALESCE(p.source_provider, 'internal') <> 'internal' AND p.production_cost_cents <= 0)
       );
    IF bad > 0 THEN
      RAISE EXCEPTION 'PUBLISH_BLOCKED: % producto(s) con precio o costo inválido. Corrígelos antes de publicar.', bad
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_publish_guard_trg ON public.stores;
CREATE TRIGGER stores_publish_guard_trg
BEFORE INSERT OR UPDATE OF status ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.stores_publish_guard();

-- ---------------------------------------------------------------------------
-- 5. store_orders: envío cobrado al cliente como concepto separado
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS subtotal_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0;
-- Pedidos anteriores (hoy: ninguno) se consideran sin envío separado.
UPDATE public.store_orders SET subtotal_cents = total_cents WHERE subtotal_cents = 0 AND shipping_cents = 0;

-- ---------------------------------------------------------------------------
-- 6. commission_ledger: desglose completo
-- ---------------------------------------------------------------------------
ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS production_cost_cents   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost_cents     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_charged_cents  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net_margin_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_bps          integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 7. apply_paid_order: comisión EXCLUSIVAMENTE sobre la ganancia del vendedor
--    (precio de producto − fabricación). Envío y fabricación jamás entran.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_paid_order(_order_id uuid, _commission_bps integer DEFAULT 2000)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o record;
  item jsonb;
  qty int;
  line_price int;
  line_prod int;
  line_ship int;
  prod_total int := 0;
  ship_cost_total int := 0;
  seller_margin int := 0;
  commission int;
  net_margin int;
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

  FOR item IN SELECT * FROM jsonb_array_elements(o.items)
  LOOP
    qty := COALESCE((item->>'qty')::int, 0);
    line_price := COALESCE((item->>'price_cents')::int, 0);

    IF (item ? 'productId') THEN
      UPDATE public.store_products
         SET stock = GREATEST(0, stock - qty)
       WHERE id = (item->>'productId')::uuid
         AND store_id = o.store_id;

      -- Preferir el costo congelado en la línea del pedido (snapshot al
      -- momento del checkout); si no existe, leer el costo actual del producto.
      line_prod := (item->>'production_cost_cents')::int;
      line_ship := (item->>'shipping_cost_cents')::int;
      IF line_prod IS NULL OR line_ship IS NULL THEN
        SELECT COALESCE(line_prod, p.production_cost_cents), COALESCE(line_ship, p.shipping_cost_cents)
          INTO line_prod, line_ship
          FROM public.store_products p
         WHERE p.id = (item->>'productId')::uuid AND p.store_id = o.store_id;
      END IF;
    ELSE
      line_prod := COALESCE((item->>'production_cost_cents')::int, 0);
      line_ship := COALESCE((item->>'shipping_cost_cents')::int, 0);
    END IF;

    prod_total      := prod_total + COALESCE(line_prod, 0) * qty;
    ship_cost_total := ship_cost_total + COALESCE(line_ship, 0) * qty;
    -- Ganancia por línea: precio del producto − fabricación. Nunca negativa.
    seller_margin   := seller_margin + GREATEST(0, line_price - COALESCE(line_prod, 0)) * qty;
  END LOOP;

  commission := (seller_margin * COALESCE(_commission_bps, 0)) / 10000;
  net_margin := seller_margin - commission;

  INSERT INTO public.commission_ledger (
    order_id, store_id, owner_id,
    gross_cents, base_cost_cents, seller_margin_cents,
    production_cost_cents, shipping_cost_cents, shipping_charged_cents,
    commission_bps, commission_cents, seller_net_margin_cents, net_owed_cents
  )
  VALUES (
    _order_id, o.store_id, o.owner_id,
    o.total_cents, prod_total + ship_cost_total, seller_margin,
    prod_total, ship_cost_total, COALESCE(o.shipping_cents, 0),
    COALESCE(_commission_bps, 0), commission, net_margin, net_margin
  )
  ON CONFLICT (order_id) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_paid_order(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paid_order(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Envío fijo artificial ($99) y "Recoge en tienda": se retiran de las
--    tiendas existentes. El checkout calcula el envío desde el proveedor.
--    (Respaldo en _backup_fase2_stores_shipping.)
-- ---------------------------------------------------------------------------
UPDATE public.stores SET shipping_options = '[]'::jsonb;