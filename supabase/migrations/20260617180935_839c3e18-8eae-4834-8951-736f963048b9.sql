
DROP POLICY IF EXISTS "Org admin can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Org admin can update member photos" ON storage.objects;
DROP POLICY IF EXISTS "Org admin can delete member photos" ON storage.objects;

CREATE POLICY "Org admin can upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND (storage.foldername(name))[1] = 'admin'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(name))[2]
      AND o.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Org admin can update member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (storage.foldername(name))[1] = 'admin'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(name))[2]
      AND o.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Org admin can delete member photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (storage.foldername(name))[1] = 'admin'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(name))[2]
      AND o.admin_user_id = auth.uid()
  )
);
