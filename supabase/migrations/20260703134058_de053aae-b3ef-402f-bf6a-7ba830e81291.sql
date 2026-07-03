ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS introduced_by_name text,
  ADD COLUMN IF NOT EXISTS introducer_id text;