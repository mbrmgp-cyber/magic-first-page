DROP FUNCTION IF EXISTS public.get_loan_summary(uuid);

CREATE FUNCTION public.get_loan_summary(_loan_id uuid)
RETURNS TABLE(loan_id uuid, principal numeric, interest_rate_monthly numeric, months numeric, interest numeric, total_due numeric, paid numeric, balance numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _member uuid;
BEGIN
  SELECT ml.org_id, ml.member_id INTO _org, _member
  FROM public.member_loans ml WHERE ml.id = _loan_id;

  IF _org IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'mbr_admin')
    OR public.is_org_admin(_org)
    OR public.is_org_committee(_org)
    OR EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = _member AND m.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH l AS (
    SELECT ml.id, ml.principal, ml.interest_rate_monthly, ml.start_date
    FROM public.member_loans ml WHERE ml.id = _loan_id
  ),
  p AS (
    SELECT COALESCE(SUM(amount),0)::numeric AS paid
    FROM public.member_loan_payments WHERE loan_id = _loan_id
  ),
  m AS (
    SELECT GREATEST(1, CEIL(GREATEST(0, EXTRACT(EPOCH FROM (now() - l.start_date::timestamp)) / (60*60*24*30))))::numeric AS months
    FROM l
  )
  SELECT
    l.id,
    l.principal,
    l.interest_rate_monthly,
    m.months,
    ROUND(l.principal * (l.interest_rate_monthly/100.0) * m.months, 2),
    ROUND(l.principal + l.principal * (l.interest_rate_monthly/100.0) * m.months, 2),
    p.paid,
    ROUND(l.principal + l.principal * (l.interest_rate_monthly/100.0) * m.months - p.paid, 2)
  FROM l, p, m;
END $function$;

REVOKE EXECUTE ON FUNCTION public.get_loan_summary(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_loan_summary(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_loan_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_loan_summary(uuid) TO service_role;