-- 1) Partners
CREATE TABLE public.varadhi_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('mandal','district','state')),
  state text NOT NULL,
  district text,
  mandal text,
  full_name text,
  phone text,
  referral_code text NOT NULL UNIQUE,
  commission_pct numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_varadhi_partners_user ON public.varadhi_partners(user_id);
CREATE INDEX idx_varadhi_partners_area ON public.varadhi_partners(level, state, district, mandal);

GRANT SELECT ON public.varadhi_partners TO authenticated;
GRANT ALL ON public.varadhi_partners TO service_role;
ALTER TABLE public.varadhi_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own row" ON public.varadhi_partners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'varadhi_admin'));

CREATE TRIGGER trg_varadhi_partners_updated BEFORE UPDATE ON public.varadhi_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Referral tagging on profiles
ALTER TABLE public.varadhi_profiles
  ADD COLUMN IF NOT EXISTS referral_code_used text,
  ADD COLUMN IF NOT EXISTS referred_partner_id uuid REFERENCES public.varadhi_partners(id) ON DELETE SET NULL;

-- 3) Commissions
CREATE TABLE public.varadhi_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.varadhi_partners(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.varadhi_subscriptions(id) ON DELETE CASCADE,
  referred_user_id uuid,
  level text NOT NULL,
  pct numeric NOT NULL,
  base_amount numeric NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','requested','paid','cancelled')),
  payout_id uuid,
  unlock_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, partner_id)
);
CREATE INDEX idx_varadhi_commissions_partner ON public.varadhi_commissions(partner_id, status);

GRANT SELECT ON public.varadhi_commissions TO authenticated;
GRANT ALL ON public.varadhi_commissions TO service_role;
ALTER TABLE public.varadhi_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own commissions" ON public.varadhi_commissions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'varadhi_admin')
    OR EXISTS (SELECT 1 FROM public.varadhi_partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  );

-- 4) Payout requests
CREATE TABLE public.varadhi_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.varadhi_partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  note text,
  admin_note text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_varadhi_payouts_partner ON public.varadhi_payout_requests(partner_id, created_at DESC);

GRANT SELECT ON public.varadhi_payout_requests TO authenticated;
GRANT ALL ON public.varadhi_payout_requests TO service_role;
ALTER TABLE public.varadhi_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own payouts" ON public.varadhi_payout_requests
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'varadhi_admin')
    OR EXISTS (SELECT 1 FROM public.varadhi_partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER trg_varadhi_payouts_updated BEFORE UPDATE ON public.varadhi_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.varadhi_commissions
  ADD CONSTRAINT varadhi_commissions_payout_fk
  FOREIGN KEY (payout_id) REFERENCES public.varadhi_payout_requests(id) ON DELETE SET NULL;

-- 5) Auto-generate commissions when a subscription becomes active
CREATE OR REPLACE FUNCTION public.varadhi_generate_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof RECORD;
  p RECORD;
  lvl text;
  default_pct numeric;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;

  SELECT state, district, mandal, referred_partner_id
    INTO prof FROM public.varadhi_profiles WHERE user_id = NEW.user_id;

  FOREACH lvl IN ARRAY ARRAY['mandal','district','state'] LOOP
    default_pct := CASE lvl WHEN 'mandal' THEN 25 WHEN 'district' THEN 15 ELSE 10 END;

    SELECT * INTO p FROM public.varadhi_partners
     WHERE id = prof.referred_partner_id AND level = lvl AND is_active;

    IF p.id IS NULL THEN
      SELECT * INTO p FROM public.varadhi_partners
       WHERE level = lvl AND is_active
         AND state = prof.state
         AND (lvl = 'state' OR district = prof.district)
         AND (lvl <> 'mandal' OR mandal = prof.mandal)
       ORDER BY created_at LIMIT 1;
    END IF;

    IF p.id IS NOT NULL THEN
      INSERT INTO public.varadhi_commissions
        (partner_id, subscription_id, referred_user_id, level, pct, base_amount, amount)
      VALUES (p.id, NEW.id, NEW.user_id, lvl,
              COALESCE(NULLIF(p.commission_pct, 0), default_pct),
              NEW.amount,
              ROUND(NEW.amount * COALESCE(NULLIF(p.commission_pct, 0), default_pct) / 100.0, 2))
      ON CONFLICT (subscription_id, partner_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_varadhi_sub_commissions
AFTER INSERT OR UPDATE OF status ON public.varadhi_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.varadhi_generate_commissions();

-- 6) Weekly payout request RPC
CREATE OR REPLACE FUNCTION public.varadhi_request_payout(_note text DEFAULT NULL)
RETURNS public.varadhi_payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.varadhi_partners;
  total numeric;
  req public.varadhi_payout_requests;
BEGIN
  SELECT * INTO p FROM public.varadhi_partners WHERE user_id = auth.uid() AND is_active LIMIT 1;
  IF p.id IS NULL THEN RAISE EXCEPTION 'You are not an active partner'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.varadhi_payout_requests
     WHERE partner_id = p.id AND created_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'You can request a payout only once a week';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total FROM public.varadhi_commissions
   WHERE partner_id = p.id AND status = 'pending' AND unlock_at <= now();

  IF total <= 0 THEN RAISE EXCEPTION 'No unlocked earnings available'; END IF;

  INSERT INTO public.varadhi_payout_requests (partner_id, amount, note)
  VALUES (p.id, total, _note) RETURNING * INTO req;

  UPDATE public.varadhi_commissions
     SET status = 'requested', payout_id = req.id
   WHERE partner_id = p.id AND status = 'pending' AND unlock_at <= now();

  RETURN req;
END $$;