
DROP POLICY IF EXISTS "org_ads_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_authenticated_read" ON storage.objects;

CREATE POLICY "org_ads_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-ads' AND (
      public.has_role(auth.uid(), 'mbr_admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE (storage.foldername(name))[1] = o.id::text
          AND (o.admin_user_id = auth.uid() OR public.can_edit_org(o.id))
      )
    )
  );

CREATE POLICY "org_ads_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-ads' AND (
      public.has_role(auth.uid(), 'mbr_admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE (storage.foldername(name))[1] = o.id::text
          AND (o.admin_user_id = auth.uid() OR public.can_edit_org(o.id))
      )
    )
  );

CREATE POLICY "org_ads_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-ads' AND (
      public.has_role(auth.uid(), 'mbr_admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE (storage.foldername(name))[1] = o.id::text
          AND (o.admin_user_id = auth.uid() OR public.can_edit_org(o.id))
      )
    )
  );

CREATE POLICY "org_ads_authenticated_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'org-ads');
