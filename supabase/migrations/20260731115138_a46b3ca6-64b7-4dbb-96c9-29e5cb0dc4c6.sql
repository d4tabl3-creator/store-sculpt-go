INSERT INTO public.commerce_providers (id, label, enabled) VALUES
  ('printful', 'Fulfillment bajo demanda', true)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, enabled = true;