
CREATE TABLE public.member_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mlr_org_status ON public.member_leave_requests(org_id, status);
CREATE INDEX idx_mlr_member ON public.member_leave_requests(member_id);
CREATE UNIQUE INDEX uniq_mlr_member_pending
  ON public.member_leave_requests(member_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_leave_requests TO authenticated;
GRANT ALL ON public.member_leave_requests TO service_role;

ALTER TABLE public.member_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own leave requests"
  ON public.member_leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can create their own leave request"
  ON public.member_leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can cancel their own pending request"
  ON public.member_leave_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Org admin and disciplinary can view requests"
  ON public.member_leave_requests FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id));

CREATE POLICY "Org admin and disciplinary can review requests"
  ON public.member_leave_requests FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id))
  WITH CHECK (public.is_org_admin(org_id) OR public.is_disciplinary_member(org_id));

CREATE TRIGGER trg_mlr_touch
  BEFORE UPDATE ON public.member_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Approve: mark approved and delete the member row atomically.
CREATE OR REPLACE FUNCTION public.approve_leave_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.member_leave_requests;
BEGIN
  SELECT * INTO r FROM public.member_leave_requests WHERE id = _request_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_org_admin(r.org_id) OR public.is_disciplinary_member(r.org_id)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request already decided'; END IF;

  UPDATE public.member_leave_requests
    SET status = 'approved', review_notes = _notes,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _request_id;

  DELETE FROM public.members WHERE id = r.member_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_leave_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.member_leave_requests;
BEGIN
  SELECT * INTO r FROM public.member_leave_requests WHERE id = _request_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_org_admin(r.org_id) OR public.is_disciplinary_member(r.org_id)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request already decided'; END IF;

  UPDATE public.member_leave_requests
    SET status = 'rejected', review_notes = _notes,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _request_id;
END $$;
