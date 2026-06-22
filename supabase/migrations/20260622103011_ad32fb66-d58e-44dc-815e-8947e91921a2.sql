ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT '#ff8c28',
  ADD COLUMN IF NOT EXISTS theme_font  text NOT NULL DEFAULT 'Inter';