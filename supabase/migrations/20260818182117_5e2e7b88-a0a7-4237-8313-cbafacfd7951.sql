-- 1) member-photos: scope reads to owner / same-org / donor self
DROP POLICY IF EXISTS "Authenticated can view member photos" ON storage.objects;
CREATE POLICY "member_photos_scoped_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    -- own upload folder (self-registration path: <uid>/...)
    (storage.foldername(name))[1] = auth.uid()::text
    -- admin/<org_id>/... visible to that org's members, committee and admin
    OR (
      split_part(name, '/', 1) = 'admin'
      AND split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
      AND (
        public.is_org_admin((split_part(name, '/', 2))::uuid)
        OR public.is_org_member((split_part(name, '/', 2))::uuid)
        OR public.is_org_committee((split_part(name, '/', 2))::uuid)
      )
    )
    -- donors can see their own photo
    OR EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.user_id = auth.uid()
        AND name LIKE 'admin/' || d.org_id::text || '/donors/' || d.id::text || '/%'
    )
  )
);

-- 2) org-ads: scope reads to the owning organization
DROP POLICY IF EXISTS "org_ads_authenticated_read" ON storage.objects;
CREATE POLICY "org_ads_scoped_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'org-ads'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND (
    public.has_role(auth.uid(), 'mbr_admin')
    OR public.is_org_admin(((storage.foldername(name))[1])::uuid)
    OR public.is_org_member(((storage.foldername(name))[1])::uuid)
    OR public.is_org_committee(((storage.foldername(name))[1])::uuid)
  )
);

-- 3) revoke direct client execution of an internal SECURITY DEFINER helper
REVOKE EXECUTE ON FUNCTION public.varadhi_month_points(uuid) FROM anon, authenticated;
