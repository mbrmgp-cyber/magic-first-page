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
$$;