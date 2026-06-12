
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  slogan TEXT,
  logo_url TEXT,
  org_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_admin ON public.organizations(admin_user_id);
CREATE INDEX idx_organizations_code ON public.organizations(org_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own org" ON public.organizations
  FOR SELECT TO authenticated USING (auth.uid() = admin_user_id);
CREATE POLICY "Admin can insert own org" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_user_id);
CREATE POLICY "Admin can update own org" ON public.organizations
  FOR UPDATE TO authenticated USING (auth.uid() = admin_user_id);

CREATE TYPE public.member_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  status public.member_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_org ON public.members(org_id);
CREATE INDEX idx_members_user ON public.members(user_id);
CREATE INDEX idx_members_status ON public.members(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Member can view own row" ON public.members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Org admin can view members" ON public.members
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = members.org_id AND o.admin_user_id = auth.uid())
  );
CREATE POLICY "Member can insert own row" ON public.members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Org admin can update members" ON public.members
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = members.org_id AND o.admin_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_member_updated BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
