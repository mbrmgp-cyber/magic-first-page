
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gov_reg_number text,
  ADD COLUMN IF NOT EXISTS founders jsonb NOT NULL DEFAULT '[]'::jsonb;
