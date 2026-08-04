ALTER TABLE public.varadhi_admin_requests
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS aadhaar_url text;