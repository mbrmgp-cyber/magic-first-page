
-- 1. auction_payments: member inserts must be pending & unverified
DROP POLICY IF EXISTS "members insert own payments" ON public.auction_payments;
CREATE POLICY "members insert own payments"
ON public.auction_payments FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_org(org_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auction_payments.member_id
        AND m.user_id = auth.uid()
        AND m.org_id = auction_payments.org_id
        AND m.status = 'approved'::member_status
    )
    AND status = 'pending'
    AND verified_by IS NULL
    AND verified_at IS NULL
  )
);

-- 2. member_loan_requests: member inserts must be pending, no review metadata
DROP POLICY IF EXISTS "Members can create their own requests" ON public.member_loan_requests;
CREATE POLICY "Members can create their own requests"
ON public.member_loan_requests FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_loan_requests.member_id
      AND m.user_id = auth.uid()
      AND m.org_id = member_loan_requests.org_id
  )
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND approved_loan_id IS NULL
);

-- surety may only change surety fields, never approval state
DROP POLICY IF EXISTS "Surety can respond to their requests" ON public.member_loan_requests;
CREATE POLICY "Surety can respond to their requests"
ON public.member_loan_requests FOR UPDATE TO authenticated
USING (
  surety_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid() AND status = 'approved'::member_status)
  AND surety_status = 'awaiting'
)
WITH CHECK (
  surety_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid() AND status = 'approved'::member_status)
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND approved_loan_id IS NULL
);

-- 3. platform_super_admin_seed: not readable by clients
DROP POLICY IF EXISTS "seed_admins_readable_by_authenticated" ON public.platform_super_admin_seed;
REVOKE ALL ON public.platform_super_admin_seed FROM anon, authenticated;
GRANT ALL ON public.platform_super_admin_seed TO service_role;

-- 4. varadhi_subscriptions: self insert must be pending
DROP POLICY IF EXISTS "vs_own_insert" ON public.varadhi_subscriptions;
CREATE POLICY "vs_own_insert"
ON public.varadhi_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- 5. harden remaining definer helper callable by authenticated
CREATE OR REPLACE FUNCTION public.varadhi_log_click(_target_type text, _target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _target_type NOT IN ('listing', 'provider') THEN
    RAISE EXCEPTION 'Invalid target type';
  END IF;
  IF _target_type = 'listing' THEN
    IF NOT EXISTS (SELECT 1 FROM public.varadhi_listings WHERE id = _target_id) THEN
      RAISE EXCEPTION 'Not found';
    END IF;
    INSERT INTO public.varadhi_clicks (target_type, target_id, buyer_id)
      VALUES (_target_type, _target_id, auth.uid());
    UPDATE public.varadhi_listings SET click_count = click_count + 1 WHERE id = _target_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.varadhi_providers WHERE id = _target_id) THEN
      RAISE EXCEPTION 'Not found';
    END IF;
    INSERT INTO public.varadhi_clicks (target_type, target_id, buyer_id)
      VALUES (_target_type, _target_id, auth.uid());
    UPDATE public.varadhi_providers SET click_count = click_count + 1 WHERE id = _target_id;
  END IF;
END $function$;

REVOKE EXECUTE ON FUNCTION public.varadhi_log_click(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_loan_summary(uuid) FROM PUBLIC, anon;
