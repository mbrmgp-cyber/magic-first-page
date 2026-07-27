ALTER TABLE public.varadhi_profiles
  ADD COLUMN IF NOT EXISTS address_type TEXT,
  ADD COLUMN IF NOT EXISTS house_number TEXT,
  ADD COLUMN IF NOT EXISTS shop_name TEXT;