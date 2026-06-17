
-- Extend members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS joined_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS introducer_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS committee_fee_paid numeric(12,2) DEFAULT 0;

-- Allow approved members to view other approved members in same org (for introducer + management view)
DROP POLICY IF EXISTS "Approved members can view co-members" ON public.members;
CREATE POLICY "Approved members can view co-members"
ON public.members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members me
    WHERE me.org_id = members.org_id
      AND me.user_id = auth.uid()
      AND me.status = 'approved'
  )
);

-- Member loans (interest-bearing principal)
CREATE TABLE IF NOT EXISTS public.member_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  principal numeric(12,2) NOT NULL CHECK (principal > 0),
  interest_rate_monthly numeric(6,3) NOT NULL DEFAULT 0,  -- % per month
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  purpose text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_loans TO authenticated;
GRANT ALL ON public.member_loans TO service_role;

ALTER TABLE public.member_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org viewers can view loans"
ON public.member_loans FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = member_loans.org_id AND o.admin_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_loans.member_id AND m.user_id = auth.uid())
  OR public.get_committee_role(auth.uid(), member_loans.org_id) IS NOT NULL
);

CREATE POLICY "Accounts editors can insert loans"
ON public.member_loans FOR INSERT TO authenticated
WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "Accounts editors can update loans"
ON public.member_loans FOR UPDATE TO authenticated
USING (public.can_edit_accounts(org_id)) WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "Accounts editors can delete loans"
ON public.member_loans FOR DELETE TO authenticated
USING (public.can_edit_accounts(org_id));

CREATE TRIGGER trg_member_loans_updated
BEFORE UPDATE ON public.member_loans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Loan payments
CREATE TABLE IF NOT EXISTS public.member_loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.member_loans(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_loan_payments TO authenticated;
GRANT ALL ON public.member_loan_payments TO service_role;

ALTER TABLE public.member_loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org viewers can view loan payments"
ON public.member_loan_payments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = member_loan_payments.org_id AND o.admin_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.member_loans l
    JOIN public.members m ON m.id = l.member_id
    WHERE l.id = member_loan_payments.loan_id AND m.user_id = auth.uid()
  )
  OR public.get_committee_role(auth.uid(), member_loan_payments.org_id) IS NOT NULL
);

CREATE POLICY "Accounts editors manage payments"
ON public.member_loan_payments FOR ALL TO authenticated
USING (public.can_edit_accounts(org_id)) WITH CHECK (public.can_edit_accounts(org_id));

-- Loan summary function (simple interest, monthly accrual)
CREATE OR REPLACE FUNCTION public.get_loan_summary(_loan_id uuid)
RETURNS TABLE (
  loan_id uuid,
  principal numeric,
  interest_rate_monthly numeric,
  months_elapsed numeric,
  accrued_interest numeric,
  total_due numeric,
  total_paid numeric,
  balance numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH l AS (
    SELECT id, principal, interest_rate_monthly, start_date
    FROM public.member_loans WHERE id = _loan_id
  ),
  p AS (
    SELECT COALESCE(SUM(amount),0)::numeric AS paid
    FROM public.member_loan_payments WHERE loan_id = _loan_id
  )
  SELECT
    l.id,
    l.principal,
    l.interest_rate_monthly,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - l.start_date::timestamp)) / (60*60*24*30))::numeric AS months_elapsed,
    ROUND(l.principal * (l.interest_rate_monthly/100.0) *
      GREATEST(0, EXTRACT(EPOCH FROM (now() - l.start_date::timestamp)) / (60*60*24*30))::numeric, 2) AS accrued_interest,
    ROUND(l.principal + l.principal * (l.interest_rate_monthly/100.0) *
      GREATEST(0, EXTRACT(EPOCH FROM (now() - l.start_date::timestamp)) / (60*60*24*30))::numeric, 2) AS total_due,
    p.paid,
    ROUND(l.principal + l.principal * (l.interest_rate_monthly/100.0) *
      GREATEST(0, EXTRACT(EPOCH FROM (now() - l.start_date::timestamp)) / (60*60*24*30))::numeric - p.paid, 2) AS balance
  FROM l, p;
$$;

GRANT EXECUTE ON FUNCTION public.get_loan_summary(uuid) TO authenticated;
