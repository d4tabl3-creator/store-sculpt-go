CREATE OR REPLACE FUNCTION public.store_orders_owner_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
     OR NEW.items IS DISTINCT FROM OLD.items
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
    IF current_setting('request.jwt.claims', true) IS NULL
       OR (current_setting('request.jwt.claims', true)::jsonb->>'role') <> 'service_role' THEN
      RAISE EXCEPTION 'Owners can only update status and notes on orders';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;