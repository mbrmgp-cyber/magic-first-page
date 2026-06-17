
-- Approval workflow on organizations
CREATE TYPE public.org_approval_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.organizations
  ADD COLUMN approval_status public.org_approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN approval_notes text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid;

-- Existing orgs default to approved so current admin doesn't get locked out
UPDATE public.organizations SET approval_status = 'approved', approved_at = now();

-- MBR admin role (separate table — never store roles on profile)
CREATE TYPE public.app_role AS ENUM ('mbr_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- MBR admin can view & update ALL organizations (for approval)
CREATE POLICY "MBR admin can view all orgs" ON public.organizations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'mbr_admin'));

CREATE POLICY "MBR admin can update all orgs" ON public.organizations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'mbr_admin'));
