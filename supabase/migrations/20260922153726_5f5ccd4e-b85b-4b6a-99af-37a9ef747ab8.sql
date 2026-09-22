
-- 1. Remove permissive "everyone" read policies (data is read server-side with the trusted client)
DROP POLICY IF EXISTS "Anyone can read varadhi site settings" ON public.varadhi_site_settings;
DROP POLICY IF EXISTS "Anyone signed in can read point settings" ON public.varadhi_point_settings;
DROP POLICY IF EXISTS "tm_authenticated_read" ON public.translation_memory;

REVOKE SELECT ON public.varadhi_site_settings FROM anon, authenticated;
REVOKE SELECT ON public.varadhi_point_settings FROM anon, authenticated;
REVOKE SELECT ON public.translation_memory FROM anon, authenticated;
GRANT ALL ON public.varadhi_site_settings TO service_role;
GRANT ALL ON public.varadhi_point_settings TO service_role;
GRANT ALL ON public.translation_memory TO service_role;

-- 2. Click logging must be bound to the caller
DROP POLICY IF EXISTS "vc_insert_any" ON public.varadhi_clicks;
CREATE POLICY "vc_insert_self" ON public.varadhi_clicks
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
REVOKE INSERT ON public.varadhi_clicks FROM anon;

-- 3. Storage: bind object reads to the caller / their scope
DROP POLICY IF EXISTS "vl_listings_read" ON storage.objects;
CREATE POLICY "vl_listings_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'varadhi-listings' AND owner_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "mbr_global_ads_obj_read" ON storage.objects;
CREATE POLICY "mbr_global_ads_obj_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mbr-global-ads'
    AND (
      owner_id = (select auth.uid()::text)
      OR public.has_role(auth.uid(), 'mbr_admin')
      OR EXISTS (SELECT 1 FROM public.mbr_global_ads a WHERE a.url = storage.objects.name AND a.active)
    )
  );

DROP POLICY IF EXISTS "Authenticated can view milestone photos" ON storage.objects;
CREATE POLICY "Org members can view milestone photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'milestone-photos'
    AND (
      owner_id = (select auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.org_milestones m
        WHERE m.photo_url = storage.objects.name
          AND (public.is_org_member(m.org_id) OR public.is_org_admin(m.org_id) OR public.is_org_committee(m.org_id))
      )
    )
  );
