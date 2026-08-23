CREATE TABLE IF NOT EXISTS public.platform_super_admin_seed (
  email text PRIMARY KEY,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_super_admin_seed TO authenticated;
GRANT ALL ON public.platform_super_admin_seed TO service_role;

ALTER TABLE public.platform_super_admin_seed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seed_admins_readable_by_authenticated" ON public.platform_super_admin_seed;
CREATE POLICY "seed_admins_readable_by_authenticated"
  ON public.platform_super_admin_seed FOR SELECT TO authenticated USING (true);

INSERT INTO public.platform_super_admin_seed (email, role) VALUES
  ('mbrvaradhi@yahoo.com', 'varadhi_admin'),
  ('mbrproduct@gmail.com', 'varadhi_admin')
ON CONFLICT (email) DO NOTHING;

-- Protect the seed rows from resets / accidental wipes
CREATE OR REPLACE FUNCTION public.protect_super_admin_seed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'platform_super_admin_seed is protected and cannot be truncated';
  END IF;
  RAISE EXCEPTION 'platform_super_admin_seed rows are protected and cannot be removed';
END $$;

DROP TRIGGER IF EXISTS trg_protect_super_admin_seed_del ON public.platform_super_admin_seed;
CREATE TRIGGER trg_protect_super_admin_seed_del
  BEFORE DELETE ON public.platform_super_admin_seed
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_seed();

DROP TRIGGER IF EXISTS trg_protect_super_admin_seed_trunc ON public.platform_super_admin_seed;
CREATE TRIGGER trg_protect_super_admin_seed_trunc
  BEFORE TRUNCATE ON public.platform_super_admin_seed
  EXECUTE FUNCTION public.protect_super_admin_seed();

-- has_role now also honours the permanent seed list (matched by verified email)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.platform_super_admin_seed s
      ON lower(u.email) = lower(s.email)
    WHERE u.id = _user_id AND s.role = _role
  )
$$;