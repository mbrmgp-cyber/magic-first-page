ALTER TABLE public.varadhi_listings
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS item_condition text,
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS house_no text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS mandal text,
  ADD COLUMN IF NOT EXISTS taluk text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS contact_phone text;