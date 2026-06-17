
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Allow org admin to upload/update/delete member photos under path: admin/<org_id>/...
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
