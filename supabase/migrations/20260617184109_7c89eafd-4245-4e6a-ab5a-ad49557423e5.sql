
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS president_name text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS president_signature_url text;
