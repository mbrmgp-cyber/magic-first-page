
-- Committee role enum
CREATE TYPE public.committee_role AS ENUM ('president', 'vice_president', 'advisor', 'treasurer', 'executive', 'worker');

-- Add term years to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS committee_term_years integer NOT NULL DEFAULT 2;

-- Committee members table
CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role public.committee_role NOT NULL,
  position_number integer NOT NULL DEFAULT 1,
  term_start_date date NOT NULL DEFAULT CURRENT_DATE,
  term_end_date date NOT NULL,
  qualifications text,
  responsibilities text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, member_id, is_active),
  UNIQUE (org_id, position_number)
);

-- Only one active president per org
CREATE UNIQUE INDEX committee_one_president_per_org
  ON public.committee_members (org_id)
  WHERE role = 'president' AND is_active = true;

CREATE INDEX committee_members_org_idx ON public.committee_members (org_id, is_active);
CREATE INDEX committee_members_member_idx ON public.committee_members (member_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_members TO authenticated;
GRANT ALL ON public.committee_members TO service_role;

-- RLS
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER touch_committee_members_updated_at
  BEFORE UPDATE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper: get current user's committee role in an org
CREATE OR REPLACE FUNCTION public.get_committee_role(_user_id uuid, _org_id uuid)
RETURNS public.committee_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cm.role
  FROM public.committee_members cm
  JOIN public.members m ON m.id = cm.member_id
  WHERE cm.org_id = _org_id
    AND m.user_id = _user_id
    AND cm.is_active = true
    AND cm.term_end_date >= CURRENT_DATE
  ORDER BY CASE cm.role
    WHEN 'president' THEN 1
    WHEN 'vice_president' THEN 2
    WHEN 'treasurer' THEN 3
    WHEN 'advisor' THEN 4
    WHEN 'executive' THEN 5
    WHEN 'worker' THEN 6
  END
  LIMIT 1;
$$;

-- Helper: can manage committee (admin or president)
CREATE OR REPLACE FUNCTION public.can_manage_committee(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR public.get_committee_role(auth.uid(), _org_id) = 'president';
$$;

-- Helper: can edit accounts
CREATE OR REPLACE FUNCTION public.can_edit_accounts(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR public.get_committee_role(auth.uid(), _org_id)
       IN ('president', 'vice_president', 'treasurer');
$$;

-- Helper: can edit events / rules
CREATE OR REPLACE FUNCTION public.can_edit_events(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR public.get_committee_role(auth.uid(), _org_id)
       IN ('president', 'vice_president', 'executive');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_rules(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR public.get_committee_role(auth.uid(), _org_id)
       IN ('president', 'vice_president', 'executive');
$$;

-- Update can_edit_org to use committee roles
CREATE OR REPLACE FUNCTION public.can_edit_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR public.get_committee_role(auth.uid(), _org_id)
       IN ('president', 'vice_president', 'executive', 'treasurer');
$$;

-- RLS policies for committee_members
-- All approved members of the org can view their committee
CREATE POLICY "Members can view committee"
  ON public.committee_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.admin_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.org_id = committee_members.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

CREATE POLICY "Managers can insert committee"
  ON public.committee_members FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_committee(org_id));

CREATE POLICY "Managers can update committee"
  ON public.committee_members FOR UPDATE
  TO authenticated
  USING (public.can_manage_committee(org_id))
  WITH CHECK (public.can_manage_committee(org_id));

CREATE POLICY "Managers can delete committee"
  ON public.committee_members FOR DELETE
  TO authenticated
  USING (public.can_manage_committee(org_id));
