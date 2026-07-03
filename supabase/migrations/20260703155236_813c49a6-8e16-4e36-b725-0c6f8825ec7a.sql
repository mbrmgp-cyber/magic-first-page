
-- Election mode flag
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS election_mode_enabled boolean NOT NULL DEFAULT false;

-- ================= disciplinary_committee_members =================
CREATE TABLE IF NOT EXISTS public.disciplinary_committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('founder','former_president')),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  appointed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplinary_committee_members TO authenticated;
GRANT ALL ON public.disciplinary_committee_members TO service_role;
ALTER TABLE public.disciplinary_committee_members ENABLE ROW LEVEL SECURITY;

-- Helper: is caller on this org's disciplinary committee?
CREATE OR REPLACE FUNCTION public.is_disciplinary_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disciplinary_committee_members dcm
    JOIN public.members m ON m.id = dcm.member_id
    WHERE dcm.org_id = _org_id AND dcm.is_active = true AND m.user_id = auth.uid()
  );
$$;

CREATE POLICY "dcm_select_org_members" ON public.disciplinary_committee_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));

CREATE POLICY "dcm_admin_manage" ON public.disciplinary_committee_members
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id))
  WITH CHECK (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id));

CREATE TRIGGER trg_dcm_updated BEFORE UPDATE ON public.disciplinary_committee_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= disciplinary_suspensions =================
CREATE TABLE IF NOT EXISTS public.disciplinary_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reason text NOT NULL,
  category text CHECK (category IN ('rule_violation','misuse','reputation_damage','financial_loss','other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  issued_by uuid REFERENCES auth.users(id),
  revoked_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplinary_suspensions TO authenticated;
GRANT ALL ON public.disciplinary_suspensions TO service_role;
ALTER TABLE public.disciplinary_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ds_select_org" ON public.disciplinary_suspensions
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));

CREATE POLICY "ds_manage" ON public.disciplinary_suspensions
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id))
  WITH CHECK (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id));

CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON public.disciplinary_suspensions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= disciplinary_president_nominations =================
CREATE TABLE IF NOT EXISTS public.disciplinary_president_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  nominated_by uuid REFERENCES auth.users(id),
  votes_for int NOT NULL DEFAULT 0,
  votes_against int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','deadlocked')),
  notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplinary_president_nominations TO authenticated;
GRANT ALL ON public.disciplinary_president_nominations TO service_role;
ALTER TABLE public.disciplinary_president_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpn_select_org" ON public.disciplinary_president_nominations
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));

CREATE POLICY "dpn_manage" ON public.disciplinary_president_nominations
  FOR ALL TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id))
  WITH CHECK (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id));

CREATE TRIGGER trg_dpn_updated BEFORE UPDATE ON public.disciplinary_president_nominations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
