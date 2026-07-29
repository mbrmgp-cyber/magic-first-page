ALTER TABLE public.varadhi_listings
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS service_mode text,
  ADD COLUMN IF NOT EXISTS service_timing text,
  ADD COLUMN IF NOT EXISTS service_area text;