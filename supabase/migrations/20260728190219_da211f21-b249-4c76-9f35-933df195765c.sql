ALTER TABLE public.varadhi_profiles
  ADD COLUMN IF NOT EXISTS occupation text;

ALTER TABLE public.varadhi_profiles
  ALTER COLUMN primary_role SET DEFAULT 'buyer';