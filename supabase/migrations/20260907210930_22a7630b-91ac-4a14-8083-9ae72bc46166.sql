ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'calida';

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_template_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_template_check CHECK (template IN ('calida','oscura','vibrante','tropical'));

UPDATE public.stores SET template = 'oscura' WHERE slug = 'naymi';