-- Add committee flag to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_committee boolean NOT NULL DEFAULT false;

-- Helper: can current user edit this org's content?
CREATE OR REPLACE FUNCTION public.can_edit_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id AND o.admin_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.org_id = _org_id
      AND m.user_id = auth.uid()
      AND m.is_committee = true
      AND m.status = 'approved'
  );
$$;

-- Rules: simple ordered list per org, optional category
CREATE TABLE public.org_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text,
  text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_rules TO authenticated;
GRANT ALL ON public.org_rules TO service_role;
ALTER TABLE public.org_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rules" ON public.org_rules FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_rules.org_id AND o.admin_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.members m WHERE m.org_id = org_rules.org_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admin/committee can insert rules" ON public.org_rules FOR INSERT TO authenticated
WITH CHECK (public.can_edit_org(org_id));
CREATE POLICY "Admin/committee can update rules" ON public.org_rules FOR UPDATE TO authenticated
USING (public.can_edit_org(org_id));
CREATE POLICY "Admin/committee can delete rules" ON public.org_rules FOR DELETE TO authenticated
USING (public.can_edit_org(org_id));

CREATE TRIGGER trg_org_rules_touch BEFORE UPDATE ON public.org_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Milestones: timeline entries per org
CREATE TABLE public.org_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  title text NOT NULL,
  description text,
  photo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_milestones TO authenticated;
GRANT ALL ON public.org_milestones TO service_role;
ALTER TABLE public.org_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view milestones" ON public.org_milestones FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_milestones.org_id AND o.admin_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.members m WHERE m.org_id = org_milestones.org_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admin/committee can insert milestones" ON public.org_milestones FOR INSERT TO authenticated
WITH CHECK (public.can_edit_org(org_id));
CREATE POLICY "Admin/committee can update milestones" ON public.org_milestones FOR UPDATE TO authenticated
USING (public.can_edit_org(org_id));
CREATE POLICY "Admin/committee can delete milestones" ON public.org_milestones FOR DELETE TO authenticated
USING (public.can_edit_org(org_id));

CREATE TRIGGER trg_org_milestones_touch BEFORE UPDATE ON public.org_milestones
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Allow org admin to toggle a member's committee flag (covered by existing "Org admin can update members" policy)
