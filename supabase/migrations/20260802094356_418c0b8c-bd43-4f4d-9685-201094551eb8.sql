ALTER TABLE public.varadhi_providers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS contact_phone text;