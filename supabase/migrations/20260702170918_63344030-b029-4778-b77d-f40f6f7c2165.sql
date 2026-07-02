
ALTER TABLE public.auction_sessions
  ADD COLUMN IF NOT EXISTS foreman_mode text NOT NULL DEFAULT 'commission',
  ADD COLUMN IF NOT EXISTS foreman_free_month int,
  ADD COLUMN IF NOT EXISTS foreman_included boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS close_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_members int;

CREATE TABLE IF NOT EXISTS public.auction_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month_no int NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  note text,
  uploaded_by uuid REFERENCES auth.users(id),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_payments TO authenticated;
GRANT ALL ON public.auction_payments TO service_role;

ALTER TABLE public.auction_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members select own payments" ON public.auction_payments;
CREATE POLICY "members select own payments" ON public.auction_payments FOR SELECT TO authenticated
USING (
  public.can_edit_org(org_id)
  OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = auction_payments.member_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "members insert own payments" ON public.auction_payments;
CREATE POLICY "members insert own payments" ON public.auction_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.members m WHERE m.id = auction_payments.member_id AND m.user_id = auth.uid() AND m.org_id = auction_payments.org_id AND m.status = 'approved')
  OR public.can_edit_org(org_id)
);

DROP POLICY IF EXISTS "admins update payments" ON public.auction_payments;
CREATE POLICY "admins update payments" ON public.auction_payments FOR UPDATE TO authenticated
USING (public.can_edit_org(org_id))
WITH CHECK (public.can_edit_org(org_id));

DROP POLICY IF EXISTS "admins delete payments" ON public.auction_payments;
CREATE POLICY "admins delete payments" ON public.auction_payments FOR DELETE TO authenticated
USING (public.can_edit_org(org_id));

DROP TRIGGER IF EXISTS trg_auction_payments_touch ON public.auction_payments;
CREATE TRIGGER trg_auction_payments_touch BEFORE UPDATE ON public.auction_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_payments;

CREATE OR REPLACE FUNCTION public.finalize_chit_auction(_org_id uuid, _auction_id uuid)
RETURNS public.auction_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.auction_sessions;
  top public.bids;
  divi numeric;
  net numeric;
  members_count int;
BEGIN
  IF NOT public.can_edit_org(_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO s FROM public.auction_sessions WHERE id = _auction_id AND org_id = _org_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  members_count := COALESCE(s.total_members, jsonb_array_length(COALESCE(s.participants, '[]'::jsonb)));
  IF members_count IS NULL OR members_count <= 0 THEN members_count := 1; END IF;

  IF s.foreman_mode = 'free_month' AND s.foreman_free_month = s.current_month THEN
    net := s.chit_value / members_count;
    UPDATE public.auction_sessions
      SET auction_closed = true, status = 'closed',
          winner_bid_id = NULL,
          winner_member_id = NULL,
          winner_member_name = 'Foreman (Company)',
          winner_member_code = 'FOREMAN',
          winner_amount = 0,
          winner_net = net,
          winner_dividend = 0,
          past_winners = COALESCE(past_winners, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'month', s.current_month, 'memberId', 'foreman', 'memberName', 'Foreman (Company)',
            'memberCode', 'FOREMAN', 'amount', 0, 'net', net, 'dividend', 0,
            'closedAt', (EXTRACT(EPOCH FROM now()) * 1000)::bigint
          )),
          turn_end = now(), updated_at = now(), updated_by = auth.uid()
      WHERE id = _auction_id RETURNING * INTO s;
    RETURN s;
  END IF;

  SELECT * INTO top FROM public.bids WHERE auction_id = _auction_id ORDER BY amount DESC, submitted_at ASC LIMIT 1;
  IF top.id IS NULL THEN RAISE EXCEPTION 'No bids submitted for this month'; END IF;

  divi := top.amount / members_count;
  net := (s.chit_value / members_count) - divi;

  UPDATE public.auction_sessions
    SET auction_closed = true, status = 'closed',
        winner_bid_id = top.id, winner_member_id = top.member_id,
        winner_member_name = top.member_name, winner_member_code = top.member_code,
        winner_amount = top.amount, winner_net = net, winner_dividend = divi,
        past_winners = COALESCE(past_winners, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'month', s.current_month, 'memberId', top.member_id, 'memberName', top.member_name,
          'memberCode', top.member_code, 'amount', top.amount, 'net', net, 'dividend', divi,
          'closedAt', (EXTRACT(EPOCH FROM now()) * 1000)::bigint
        )),
        turn_end = now(), updated_at = now(), updated_by = auth.uid()
    WHERE id = _auction_id RETURNING * INTO s;
  RETURN s;
END $$;

GRANT EXECUTE ON FUNCTION public.finalize_chit_auction(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reset_chit_month(_org_id uuid, _auction_id uuid)
RETURNS public.auction_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.auction_sessions;
BEGIN
  IF NOT public.can_edit_org(_org_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.bids WHERE auction_id = _auction_id;
  UPDATE public.auction_sessions
    SET current_month = LEAST(COALESCE(current_month,1) + 1, COALESCE(total_months, current_month + 1)),
        auction_closed = false, status = 'active',
        winner_bid_id = NULL, winner_member_id = NULL, winner_member_name = NULL,
        winner_member_code = NULL, winner_amount = NULL, winner_net = NULL, winner_dividend = NULL,
        turn_start = NULL, turn_end = NULL,
        updated_at = now(), updated_by = auth.uid()
    WHERE id = _auction_id AND org_id = _org_id
    RETURNING * INTO s;
  RETURN s;
END $$;

GRANT EXECUTE ON FUNCTION public.reset_chit_month(uuid, uuid) TO authenticated, service_role;
