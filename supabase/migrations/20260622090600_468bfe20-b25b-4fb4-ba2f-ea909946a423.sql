ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS preferred_lang text DEFAULT 'te';