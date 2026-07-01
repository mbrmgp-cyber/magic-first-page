
CREATE OR REPLACE FUNCTION public.submit_chit_bid(_org_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _state jsonb;
  _bid jsonb;
  _now_ms bigint;
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

  SELECT state INTO _state FROM public.chit_auctions WHERE org_id = _org_id;
  IF _state IS NULL THEN _state := '{}'::jsonb; END IF;

  IF COALESCE((_state->>'auctionClosed')::boolean, false) THEN
    RAISE EXCEPTION 'Auction is closed';
  END IF;

  _now_ms := (extract(epoch from now()) * 1000)::bigint;

  _bid := jsonb_build_object(
    'id', _now_ms::text || '-' || substr(md5(random()::text), 1, 5),
    'memberId', _member.id,
    'memberName', _member.name,
    'memberCode', _member.member_code,
    'amount', _amount,
    'submittedAt', _now_ms
  );

  _state := jsonb_set(_state, '{bids}', COALESCE(_state->'bids', '[]'::jsonb) || _bid, true);
  IF _state ? 'turnStart' = false OR _state->>'turnStart' IS NULL THEN
    _state := jsonb_set(_state, '{turnStart}', to_jsonb(_now_ms), true);
  END IF;

  INSERT INTO public.chit_auctions (org_id, state, updated_by, updated_at)
  VALUES (_org_id, _state, auth.uid(), now())
  ON CONFLICT (org_id) DO UPDATE
    SET state = EXCLUDED.state, updated_by = auth.uid(), updated_at = now();

  RETURN _state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_chit_bid(uuid, numeric) TO authenticated;
