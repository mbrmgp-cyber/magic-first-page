
-- 1. Org-level threshold config
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS donor_recognition_threshold numeric NOT NULL DEFAULT 5000;

-- 2. donors table
CREATE TABLE public.donors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  phone text,
  email text,
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','inactive')),
  total_donated numeric NOT NULL DEFAULT 0,
  momento_issued boolean NOT NULL DEFAULT false,
  momento_issued_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donors_org ON public.donors(org_id);
CREATE INDEX idx_donors_user ON public.donors(user_id);
CREATE INDEX idx_donors_status ON public.donors(org_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins/committee manage donors"
  ON public.donors FOR ALL TO authenticated
  USING (public.can_edit_org(org_id))
  WITH CHECK (public.can_edit_org(org_id));

CREATE POLICY "Donors can view own record"
  ON public.donors FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Donors can update own record"
  ON public.donors FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone signed-in can self-register as donor"
  ON public.donors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER trg_donors_touch
  BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. donations table
CREATE TABLE public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  mode text NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','bank','cheque','other')),
  receipt_no text,
  proof_url text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_org ON public.donations(org_id);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_date ON public.donations(org_id, donation_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org accounts manage donations"
  ON public.donations FOR ALL TO authenticated
  USING (public.can_edit_accounts(org_id))
  WITH CHECK (public.can_edit_accounts(org_id));

CREATE POLICY "Donors view their own donations"
  ON public.donations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.donors d
    WHERE d.id = donations.donor_id AND d.user_id = auth.uid()
  ));

CREATE TRIGGER trg_donations_touch
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Recompute donor totals on donation changes
CREATE OR REPLACE FUNCTION public.recompute_donor_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_donor uuid;
  new_total numeric;
  threshold numeric;
BEGIN
  target_donor := COALESCE(NEW.donor_id, OLD.donor_id);
  IF target_donor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount),0) INTO new_total
    FROM public.donations WHERE donor_id = target_donor;

  UPDATE public.donors SET total_donated = new_total, updated_at = now()
    WHERE id = target_donor;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_donations_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.recompute_donor_total();
