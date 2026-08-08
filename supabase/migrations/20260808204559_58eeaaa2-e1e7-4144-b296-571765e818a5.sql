ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS design_url text,
  ADD COLUMN IF NOT EXISTS mockup_url text,
  ADD COLUMN IF NOT EXISTS placement text;

DROP POLICY IF EXISTS "disenos propios lectura" ON storage.objects;
CREATE POLICY "disenos propios lectura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'disenos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "disenos propios subida" ON storage.objects;
CREATE POLICY "disenos propios subida" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'disenos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "disenos propios borrado" ON storage.objects;
CREATE POLICY "disenos propios borrado" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'disenos' AND (storage.foldername(name))[1] = auth.uid()::text);