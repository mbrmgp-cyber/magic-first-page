
-- Election status enum
DO $$ BEGIN
  CREATE TYPE public.election_status AS ENUM ('scheduled','nominations_open','voting_open','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nomination_status AS ENUM ('pending','approved','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper to check if current user is admin of org
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = _org_id AND admin_user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.members WHERE org_id = _org_id AND user_id = auth.uid() AND status='approved');
$$;

CREATE OR REPLACE FUNCTION public.is_org_committee(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.committee_members cm
    JOIN public.members m ON m.id = cm.member_id
    WHERE cm.org_id = _org_id AND cm.is_active AND m.user_id = auth.uid()
  );
$$;

-- ELECTIONS
CREATE TABLE public.org_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  positions text[] NOT NULL DEFAULT ARRAY['President','Secretary','Treasurer']::text[],
  nomination_deadline timestamptz NOT NULL,
  election_date timestamptz NOT NULL,
  status public.election_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_elections TO authenticated;
GRANT ALL ON public.org_elections TO service_role;
ALTER TABLE public.org_elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view elections" ON public.org_elections FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));
CREATE POLICY "Admin manages elections insert" ON public.org_elections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "Admin manages elections update" ON public.org_elections FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "Admin manages elections delete" ON public.org_elections FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

-- NOMINATIONS
CREATE TABLE public.org_election_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.org_elections(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  position text NOT NULL,
  statement text,
  status public.nomination_status NOT NULL DEFAULT 'pending',
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, member_id, position)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_election_nominations TO authenticated;
GRANT ALL ON public.org_election_nominations TO service_role;
ALTER TABLE public.org_election_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view nominations" ON public.org_election_nominations FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));
CREATE POLICY "Members file own nomination" ON public.org_election_nominations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND EXISTS(SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid())
  );
CREATE POLICY "Admin or self updates nomination" ON public.org_election_nominations FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id) OR EXISTS(SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid()))
  WITH CHECK (public.is_org_admin(org_id) OR EXISTS(SELECT 1 FROM public.members WHERE id = member_id AND user_id = auth.uid()));
CREATE POLICY "Admin deletes nomination" ON public.org_election_nominations FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

-- VOTES
CREATE TABLE public.org_election_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.org_elections(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  position text NOT NULL,
  voter_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  nominee_id uuid NOT NULL REFERENCES public.org_election_nominations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, position, voter_member_id)
);

GRANT SELECT, INSERT ON public.org_election_votes TO authenticated;
GRANT ALL ON public.org_election_votes TO service_role;
ALTER TABLE public.org_election_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view votes for tally" ON public.org_election_votes FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_admin(org_id));
CREATE POLICY "Committee casts votes" ON public.org_election_votes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_committee(org_id)
    AND EXISTS(SELECT 1 FROM public.members WHERE id = voter_member_id AND user_id = auth.uid())
  );

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_org_elections_uat BEFORE UPDATE ON public.org_elections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_org_election_nominations_uat BEFORE UPDATE ON public.org_election_nominations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
