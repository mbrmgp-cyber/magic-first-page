
ALTER TABLE public.varadhi_profiles
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS mandal TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS provider_sub_type TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INT,
  ADD COLUMN IF NOT EXISTS certificates_urls TEXT[] DEFAULT '{}'::TEXT[];
