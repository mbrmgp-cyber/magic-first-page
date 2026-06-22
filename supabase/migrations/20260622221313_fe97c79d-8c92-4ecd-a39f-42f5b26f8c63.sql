
CREATE TABLE public.member_loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  requested_amount numeric(12,2) NOT NULL CHECK (requested_amount > 0),
  reason text NOT NULL,
  surety_member_code text,
  surety_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  utr_number text,
  payment_date date,
  interest_rate_monthly numeric(6,3) NOT NULL DEFAULT 2.0,
  approved_loan_id uuid REFERENCES public.member_loans(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_loan_requests TO authenticated;
GRANT ALL ON public.member_loan_requests TO service_role;

ALTER TABLE public.member_loan_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can create their own requests" ON public.member_loan_requests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid() AND m.org_id = org_id));

CREATE POLICY "Members & org viewers can view requests" ON public.member_loan_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  );

CREATE POLICY "Accounts editors can update requests" ON public.member_loan_requests
  FOR UPDATE TO authenticated
  USING (public.can_edit_accounts(org_id))
  WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "Accounts editors can delete requests" ON public.member_loan_requests
  FOR DELETE TO authenticated
  USING (public.can_edit_accounts(org_id));

CREATE TRIGGER trg_member_loan_requests_updated
  BEFORE UPDATE ON public.member_loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_loan_requests_org_status ON public.member_loan_requests(org_id, status);
CREATE INDEX idx_loan_requests_member ON public.member_loan_requests(member_id);
