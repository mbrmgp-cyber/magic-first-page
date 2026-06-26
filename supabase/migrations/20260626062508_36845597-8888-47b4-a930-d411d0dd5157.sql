
CREATE TABLE public.org_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agenda TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'offline' CHECK (meeting_type IN ('online','offline')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  attended_member_ids UUID[] NOT NULL DEFAULT '{}',
  absent_member_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.org_meetings(id) ON DELETE SET NULL,
  resolution_no TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_member_ids UUID[] NOT NULL DEFAULT '{}',
  opposed_member_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'passed' CHECK (status IN ('passed','rejected','pending')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  allocated_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_expense NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ongoing','completed','cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_resolutions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_activities TO authenticated;
GRANT ALL ON public.org_meetings TO service_role;
GRANT ALL ON public.org_resolutions TO service_role;
GRANT ALL ON public.org_activities TO service_role;

ALTER TABLE public.org_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_activities ENABLE ROW LEVEL SECURITY;

-- meetings
CREATE POLICY "Members view meetings" ON public.org_meetings FOR SELECT TO authenticated
USING (public.is_approved_member(auth.uid(), org_id) OR public.can_edit_events(org_id));
CREATE POLICY "Committee insert meetings" ON public.org_meetings FOR INSERT TO authenticated
WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee update meetings" ON public.org_meetings FOR UPDATE TO authenticated
USING (public.can_edit_events(org_id)) WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee delete meetings" ON public.org_meetings FOR DELETE TO authenticated
USING (public.can_edit_events(org_id));

-- resolutions
CREATE POLICY "Members view resolutions" ON public.org_resolutions FOR SELECT TO authenticated
USING (public.is_approved_member(auth.uid(), org_id) OR public.can_edit_events(org_id));
CREATE POLICY "Committee insert resolutions" ON public.org_resolutions FOR INSERT TO authenticated
WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee update resolutions" ON public.org_resolutions FOR UPDATE TO authenticated
USING (public.can_edit_events(org_id)) WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee delete resolutions" ON public.org_resolutions FOR DELETE TO authenticated
USING (public.can_edit_events(org_id));

-- activities
CREATE POLICY "Members view activities" ON public.org_activities FOR SELECT TO authenticated
USING (public.is_approved_member(auth.uid(), org_id) OR public.can_edit_events(org_id));
CREATE POLICY "Committee insert activities" ON public.org_activities FOR INSERT TO authenticated
WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee update activities" ON public.org_activities FOR UPDATE TO authenticated
USING (public.can_edit_events(org_id)) WITH CHECK (public.can_edit_events(org_id));
CREATE POLICY "Committee delete activities" ON public.org_activities FOR DELETE TO authenticated
USING (public.can_edit_events(org_id));

CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON public.org_meetings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_resolutions_updated BEFORE UPDATE ON public.org_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_activities_updated BEFORE UPDATE ON public.org_activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
