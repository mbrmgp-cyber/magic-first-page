CREATE TABLE IF NOT EXISTS public.auction_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  live_group_name text,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  chit_value numeric NOT NULL DEFAULT 100000,
  total_months integer NOT NULL DEFAULT 20,
  current_month integer NOT NULL DEFAULT 1,
  commission_pct numeric NOT NULL DEFAULT 5,
  start_date date,
  turn_start timestamptz,
  turn_end timestamptz,
  auction_closed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  winner_bid_id uuid,
  winner_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  winner_member_name text,
  winner_member_code text,
  winner_amount numeric,
  winner_net numeric,
  winner_dividend numeric,
  past_winners jsonb NOT NULL DEFAULT '[]'::jsonb,
  consents jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auction_sessions_status_check CHECK (status IN ('active', 'closed', 'scheduled')),
  CONSTRAINT auction_sessions_positive_months CHECK (total_months > 0),
  CONSTRAINT auction_sessions_positive_current_month CHECK (current_month > 0),
  CONSTRAINT auction_sessions_unique_active_group UNIQUE (org_id, group_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_sessions TO authenticated;
GRANT ALL ON public.auction_sessions TO service_role;

ALTER TABLE public.auction_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction sessions read by org users" ON public.auction_sessions;
CREATE POLICY "auction sessions read by org users" ON public.auction_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    OR public.is_org_admin(org_id)
    OR public.is_org_committee(org_id)
    OR public.has_role(auth.uid(), 'mbr_admin')
  );

DROP POLICY IF EXISTS "auction sessions managed by admins" ON public.auction_sessions;
CREATE POLICY "auction sessions managed by admins" ON public.auction_sessions
  FOR ALL TO authenticated
  USING (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'));

DROP TRIGGER IF EXISTS touch_auction_sessions_updated_at ON public.auction_sessions;
CREATE TRIGGER touch_auction_sessions_updated_at
  BEFORE UPDATE ON public.auction_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_code text,
  amount numeric NOT NULL CHECK (amount > 0),
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids read by org users" ON public.bids;
CREATE POLICY "bids read by org users" ON public.bids
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    OR public.is_org_admin(org_id)
    OR public.is_org_committee(org_id)
    OR public.has_role(auth.uid(), 'mbr_admin')
  );

DROP POLICY IF EXISTS "members can create own bids" ON public.bids;
CREATE POLICY "members can create own bids" ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = bids.member_id
        AND m.org_id = bids.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "admins can manage bids" ON public.bids;
CREATE POLICY "admins can manage bids" ON public.bids
  FOR ALL TO authenticated
  USING (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'));

CREATE INDEX IF NOT EXISTS idx_auction_sessions_org_updated ON public.auction_sessions (org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_sessions_org_group ON public.auction_sessions (org_id, group_name);
CREATE INDEX IF NOT EXISTS idx_bids_auction_time ON public.bids (auction_id, submitted_at ASC);
CREATE INDEX IF NOT EXISTS idx_bids_org_time ON public.bids (org_id, submitted_at DESC);

ALTER TABLE public.auction_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;

DO $mig$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='auction_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_sessions';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $mig$;

DO $mig$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bids'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bids';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $mig$;

DROP FUNCTION IF EXISTS public.submit_chit_bid(uuid, numeric);
DROP FUNCTION IF EXISTS public.submit_chit_bid(uuid, numeric, uuid);
CREATE OR REPLACE FUNCTION public.submit_chit_bid(_org_id uuid, _amount numeric, _auction_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _session public.auction_sessions;
  _bid public.bids;
BEGIN
  SELECT id, COALESCE(name, trim(concat(first_name,' ',last_name))) AS name, member_code
    INTO _member
  FROM public.members
  WHERE user_id = auth.uid() AND org_id = _org_id AND status = 'approved'
  LIMIT 1;

  IF _member.id IS NULL THEN
    RAISE EXCEPTION 'Not an approved member of this organization';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Bid amount must be greater than zero';
  END IF;

  SELECT * INTO _session
  FROM public.auction_sessions
  WHERE org_id = _org_id
    AND (_auction_id IS NULL OR id = _auction_id)
    AND status <> 'closed'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _session.id IS NULL THEN
    RAISE EXCEPTION 'No active auction session found';
  END IF;

  IF _session.auction_closed OR _session.status = 'closed' THEN
    RAISE EXCEPTION 'Auction is closed';
  END IF;

  INSERT INTO public.bids (auction_id, org_id, member_id, member_name, member_code, amount, submitted_by)
  VALUES (_session.id, _org_id, _member.id, COALESCE(_member.name, 'Member'), _member.member_code, _amount, auth.uid())
  RETURNING * INTO _bid;

  UPDATE public.auction_sessions
    SET turn_start = COALESCE(turn_start, now()), updated_by = auth.uid(), updated_at = now()
    WHERE id = _session.id;

  RETURN jsonb_build_object(
    'sessionId', _session.id,
    'bid', jsonb_build_object(
      'id', _bid.id,
      'memberId', _bid.member_id,
      'memberName', _bid.member_name,
      'memberCode', _bid.member_code,
      'amount', _bid.amount,
      'submittedAt', (EXTRACT(EPOCH FROM _bid.submitted_at) * 1000)::bigint
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_chit_bid(uuid, numeric, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.submit_chit_consent(uuid, text);
CREATE OR REPLACE FUNCTION public.submit_chit_consent(_org_id uuid, _signature_tag text)
RETURNS public.auction_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  row public.auction_sessions;
  me_id uuid;
  me_name text;
  me_code text;
BEGIN
  IF NOT public.is_org_member(_org_id) THEN
    RAISE EXCEPTION 'Not an approved member of this organization';
  END IF;
  SELECT id, COALESCE(name, trim(concat(first_name,' ',last_name))), member_code INTO me_id, me_name, me_code
    FROM public.members
    WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'approved'
    LIMIT 1;
  IF me_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;

  SELECT * INTO row
  FROM public.auction_sessions
  WHERE org_id = _org_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF row.id IS NULL THEN RAISE EXCEPTION 'No auction session found'; END IF;

  UPDATE public.auction_sessions
    SET consents = jsonb_set(
          COALESCE(consents, '{}'::jsonb),
          ARRAY[me_id::text],
          jsonb_build_object(
            'memberId',     me_id::text,
            'memberName',   COALESCE(me_name, ''),
            'memberCode',   COALESCE(me_code, ''),
            'signatureTag', _signature_tag,
            'signedAt',     (EXTRACT(EPOCH FROM now()) * 1000)::bigint
          ),
          true
        ),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = row.id
    RETURNING * INTO row;
  RETURN row;
END $fn$;

GRANT EXECUTE ON FUNCTION public.submit_chit_consent(uuid, text) TO authenticated;