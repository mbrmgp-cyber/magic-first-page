-- Global platform-wide advertisement banners, editable only by MBR super admins.
CREATE TABLE IF NOT EXISTS public.mbr_global_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mbr_global_ads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mbr_global_ads TO authenticated;
GRANT ALL ON public.mbr_global_ads TO service_role;

ALTER TABLE public.mbr_global_ads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active banners; super admin can read everything
CREATE POLICY mbr_global_ads_read_authenticated
  ON public.mbr_global_ads FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'mbr_admin'));

-- Only MBR super admins can insert/update/delete
CREATE POLICY mbr_global_ads_admin_insert
  ON public.mbr_global_ads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));

CREATE POLICY mbr_global_ads_admin_update
  ON public.mbr_global_ads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));

CREATE POLICY mbr_global_ads_admin_delete
  ON public.mbr_global_ads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'));

CREATE TRIGGER mbr_global_ads_touch_updated_at
  BEFORE UPDATE ON public.mbr_global_ads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for the mbr-global-ads bucket (created via storage tool)
CREATE POLICY mbr_global_ads_obj_read
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mbr-global-ads');

CREATE POLICY mbr_global_ads_obj_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mbr-global-ads' AND public.has_role(auth.uid(), 'mbr_admin'));

CREATE POLICY mbr_global_ads_obj_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mbr-global-ads' AND public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (bucket_id = 'mbr-global-ads' AND public.has_role(auth.uid(), 'mbr_admin'));

CREATE POLICY mbr_global_ads_obj_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mbr-global-ads' AND public.has_role(auth.uid(), 'mbr_admin'));