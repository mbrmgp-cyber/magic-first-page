ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 year');

UPDATE public.organizations
  SET subscription_expires_at = now() + interval '1 year'
  WHERE subscription_expires_at IS NULL;