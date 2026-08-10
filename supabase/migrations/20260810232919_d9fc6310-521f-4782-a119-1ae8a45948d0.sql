CREATE TABLE public.guide_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id text NOT NULL,
  completed_steps text[] NOT NULL DEFAULT '{}',
  current_step text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, guide_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;
GRANT ALL ON public.guide_progress TO service_role;

ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own guide progress" ON public.guide_progress
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert own guide progress" ON public.guide_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own guide progress" ON public.guide_progress
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete own guide progress" ON public.guide_progress
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER trg_guide_progress_updated
  BEFORE UPDATE ON public.guide_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();