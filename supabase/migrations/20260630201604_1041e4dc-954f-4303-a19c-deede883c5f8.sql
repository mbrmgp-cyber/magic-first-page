CREATE TABLE IF NOT EXISTS public.chit_auctions (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chit_auctions TO authenticated;
GRANT ALL ON public.chit_auctions TO service_role;

ALTER TABLE public.chit_auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction read by org members" ON public.chit_auctions;
CREATE POLICY "auction read by org members" ON public.chit_auctions
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    OR public.is_org_admin(org_id)
    OR public.is_org_committee(org_id)
    OR public.has_role(auth.uid(), 'mbr_admin')
  );

DROP POLICY IF EXISTS "auction write by admins" ON public.chit_auctions;
CREATE POLICY "auction write by admins" ON public.chit_auctions
  FOR ALL TO authenticated
  USING (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.can_edit_org(org_id) OR public.has_role(auth.uid(), 'mbr_admin'));

ALTER TABLE public.chit_auctions REPLICA IDENTITY FULL;
DO $mig$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chit_auctions';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $mig$;

CREATE OR REPLACE FUNCTION public.submit_chit_consent(_org_id uuid, _signature_tag text)
RETURNS public.chit_auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  row public.chit_auctions;
  me_id uuid;
  me_name text;
  me_code text;
BEGIN
  IF NOT public.is_org_member(_org_id) THEN
    RAISE EXCEPTION 'Not an approved member of this organization';
  END IF;
  SELECT id, name, member_code INTO me_id, me_name, me_code
    FROM public.members
    WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'approved'
    LIMIT 1;
  IF me_id IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;

  INSERT INTO public.chit_auctions (org_id, state)
    VALUES (_org_id, '{}'::jsonb)
    ON CONFLICT (org_id) DO NOTHING;

  UPDATE public.chit_auctions
    SET state = jsonb_set(
          COALESCE(state, '{}'::jsonb),
          ARRAY['consents', me_id::text],
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
    WHERE org_id = _org_id
    RETURNING * INTO row;
  RETURN row;
END $fn$;

GRANT EXECUTE ON FUNCTION public.submit_chit_consent(uuid, text) TO authenticated;