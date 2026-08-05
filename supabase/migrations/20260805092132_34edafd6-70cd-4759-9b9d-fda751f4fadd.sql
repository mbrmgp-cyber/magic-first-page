ALTER TABLE public.varadhi_area_admins ADD COLUMN IF NOT EXISTS mandal text;
ALTER TABLE public.varadhi_admin_requests ADD COLUMN IF NOT EXISTS mandal text;

ALTER TABLE public.varadhi_area_admins DROP CONSTRAINT IF EXISTS varadhi_area_admins_level_check;
ALTER TABLE public.varadhi_area_admins ADD CONSTRAINT varadhi_area_admins_level_check
  CHECK (level = ANY (ARRAY['state_admin'::text, 'district_admin'::text, 'mandal_admin'::text]));

ALTER TABLE public.varadhi_area_admins DROP CONSTRAINT IF EXISTS varadhi_area_admin_district_required;
ALTER TABLE public.varadhi_area_admins ADD CONSTRAINT varadhi_area_admin_district_required
  CHECK (level = 'state_admin' OR district IS NOT NULL);
ALTER TABLE public.varadhi_area_admins ADD CONSTRAINT varadhi_area_admin_mandal_required
  CHECK (level <> 'mandal_admin' OR mandal IS NOT NULL);

ALTER TABLE public.varadhi_admin_requests DROP CONSTRAINT IF EXISTS varadhi_admin_requests_requested_level_check;
ALTER TABLE public.varadhi_admin_requests ADD CONSTRAINT varadhi_admin_requests_requested_level_check
  CHECK (requested_level = ANY (ARRAY['state_admin'::text, 'district_admin'::text, 'mandal_admin'::text]));