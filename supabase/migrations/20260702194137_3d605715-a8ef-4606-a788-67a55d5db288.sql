
CREATE TABLE public.auction_month_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  auction_id uuid NOT NULL,
  group_name text NOT NULL,
  month_no integer NOT NULL,
  chit_value numeric NOT NULL DEFAULT 0,
  total_months integer NOT NULL DEFAULT 0,
  commission_pct numeric NOT NULL DEFAULT 0,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  bids jsonb NOT NULL DEFAULT '[]'::jsonb,
  consents jsonb NOT NULL DEFAULT '{}'::jsonb,
  winner jsonb,
  turn_start timestamptz,
  turn_end timestamptz,
  closed_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, month_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_month_archives TO authenticated;
GRANT ALL ON public.auction_month_archives TO service_role;

ALTER TABLE public.auction_month_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members and admins can view archives"
  ON public.auction_month_archives FOR SELECT
  TO authenticated
  USING (public.is_org_admin(org_id) OR public.is_org_member(org_id) OR public.is_org_committee(org_id));

CREATE POLICY "Org editors can insert archives"
  ON public.auction_month_archives FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_org(org_id));

CREATE POLICY "Org editors can update archives"
  ON public.auction_month_archives FOR UPDATE
  TO authenticated
  USING (public.can_edit_org(org_id))
  WITH CHECK (public.can_edit_org(org_id));

CREATE POLICY "Org editors can delete archives"
  ON public.auction_month_archives FOR DELETE
  TO authenticated
  USING (public.can_edit_org(org_id));

CREATE INDEX idx_auction_month_archives_org_group ON public.auction_month_archives (org_id, group_name, month_no);
CREATE INDEX idx_auction_month_archives_auction ON public.auction_month_archives (auction_id, month_no);
