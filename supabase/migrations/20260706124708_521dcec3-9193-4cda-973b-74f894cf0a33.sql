
CREATE POLICY "org_ads_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-ads' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.admin_user_id = auth.uid() AND (storage.foldername(name))[1] = o.id::text));
CREATE POLICY "org_ads_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-ads' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.admin_user_id = auth.uid() AND (storage.foldername(name))[1] = o.id::text));
CREATE POLICY "org_ads_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-ads' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.admin_user_id = auth.uid() AND (storage.foldername(name))[1] = o.id::text));
CREATE POLICY "org_ads_authenticated_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'org-ads');
