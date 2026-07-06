-- Ensure the existing organization banner settings table has explicit API grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow committee/admin users who can edit an organization to read/update that organization's settings,
-- including the ad_banners JSON field used by the member dashboard banner slot.
DROP POLICY IF EXISTS "Org editors can view org settings" ON public.organizations;
CREATE POLICY "Org editors can view org settings"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.can_edit_org(id));

DROP POLICY IF EXISTS "Org editors can update org settings" ON public.organizations;
CREATE POLICY "Org editors can update org settings"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.can_edit_org(id))
WITH CHECK (public.can_edit_org(id));

-- Rebuild org-ads storage policies. The earlier policy accidentally checked the
-- organization's name instead of the uploaded object's path, which blocked admin uploads.
DROP POLICY IF EXISTS "org_ads_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "org_ads_super_admin_all" ON storage.objects;

CREATE POLICY "org_ads_authenticated_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'org-ads');

CREATE POLICY "org_ads_admin_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-ads'
  AND (
    public.has_role(auth.uid(), 'mbr_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE (storage.foldername(storage.objects.name))[1] = o.id::text
        AND (
          o.admin_user_id = auth.uid()
          OR public.can_edit_org(o.id)
        )
    )
  )
);

CREATE POLICY "org_ads_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-ads'
  AND (
    public.has_role(auth.uid(), 'mbr_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE (storage.foldername(storage.objects.name))[1] = o.id::text
        AND (
          o.admin_user_id = auth.uid()
          OR public.can_edit_org(o.id)
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'org-ads'
  AND (
    public.has_role(auth.uid(), 'mbr_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE (storage.foldername(storage.objects.name))[1] = o.id::text
        AND (
          o.admin_user_id = auth.uid()
          OR public.can_edit_org(o.id)
        )
    )
  )
);

CREATE POLICY "org_ads_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-ads'
  AND (
    public.has_role(auth.uid(), 'mbr_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE (storage.foldername(storage.objects.name))[1] = o.id::text
        AND (
          o.admin_user_id = auth.uid()
          OR public.can_edit_org(o.id)
        )
    )
  )
);