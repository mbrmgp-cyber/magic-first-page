
-- =========================================================
-- VARADHI marketplace schema
-- =========================================================

-- 1. Profiles
CREATE TABLE public.varadhi_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  primary_role text NOT NULL CHECK (primary_role IN ('seller','buyer','provider')),
  business_name text,
  address text,
  city text,
  lat double precision,
  lng double precision,
  aadhaar_url text,
  license_url text,
  store_photo_url text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.varadhi_profiles TO authenticated;
GRANT ALL ON public.varadhi_profiles TO service_role;
ALTER TABLE public.varadhi_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_own" ON public.varadhi_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "vp_read_approved" ON public.varadhi_profiles FOR SELECT TO authenticated
  USING (verification_status = 'approved');
CREATE POLICY "vp_admin_all" ON public.varadhi_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.varadhi_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Listings
CREATE TABLE public.varadhi_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('fresh','new','used','realestate')),
  sub_category text,
  title text NOT NULL,
  description text,
  price numeric(14,2),
  unit text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  lat double precision,
  lng double precision,
  city text,
  stock_status text NOT NULL DEFAULT 'running' CHECK (stock_status IN ('running','closed')),
  click_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.varadhi_listings TO authenticated;
GRANT SELECT ON public.varadhi_listings TO anon;
GRANT ALL ON public.varadhi_listings TO service_role;
ALTER TABLE public.varadhi_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vl_owner" ON public.varadhi_listings FOR ALL TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "vl_browse_running" ON public.varadhi_listings FOR SELECT TO authenticated, anon
  USING (stock_status = 'running');
CREATE POLICY "vl_admin_all" ON public.varadhi_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));
CREATE INDEX vl_cat_idx ON public.varadhi_listings (category, stock_status);
CREATE TRIGGER trg_vl_updated BEFORE UPDATE ON public.varadhi_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Providers (transport & services)
CREATE TABLE public.varadhi_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('transport','service')),
  sub_type text NOT NULL,
  title text NOT NULL,
  description text,
  vehicle_details text,
  service_areas text,
  lat double precision,
  lng double precision,
  city text,
  availability_status text NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('online','offline')),
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,
  subscription_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.varadhi_providers TO authenticated;
GRANT SELECT ON public.varadhi_providers TO anon;
GRANT ALL ON public.varadhi_providers TO service_role;
ALTER TABLE public.varadhi_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vpr_owner" ON public.varadhi_providers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "vpr_browse_online" ON public.varadhi_providers FOR SELECT TO authenticated, anon
  USING (availability_status = 'online');
CREATE POLICY "vpr_admin_all" ON public.varadhi_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));
CREATE INDEX vpr_type_idx ON public.varadhi_providers (provider_type, sub_type, availability_status);
CREATE TRIGGER trg_vpr_updated BEFORE UPDATE ON public.varadhi_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Subscriptions
CREATE TABLE public.varadhi_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('1m','3m','6m','1y')),
  amount numeric(12,2) NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payment_ref text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.varadhi_subscriptions TO authenticated;
GRANT ALL ON public.varadhi_subscriptions TO service_role;
ALTER TABLE public.varadhi_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vs_own_read" ON public.varadhi_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'mbr_admin'));
CREATE POLICY "vs_own_insert" ON public.varadhi_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "vs_admin_update" ON public.varadhi_subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'mbr_admin'));

-- 5. Rewards
CREATE TABLE public.varadhi_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points int NOT NULL,
  source text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.varadhi_rewards TO authenticated;
GRANT ALL ON public.varadhi_rewards TO service_role;
ALTER TABLE public.varadhi_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr_own_read" ON public.varadhi_rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'mbr_admin'));

-- 6. Click / inquiry analytics
CREATE TABLE public.varadhi_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('listing','provider')),
  target_id uuid NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ts timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.varadhi_clicks TO authenticated;
GRANT INSERT ON public.varadhi_clicks TO anon;
GRANT ALL ON public.varadhi_clicks TO service_role;
ALTER TABLE public.varadhi_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vc_insert_any" ON public.varadhi_clicks FOR INSERT TO authenticated, anon
  WITH CHECK (true);
CREATE POLICY "vc_admin_read" ON public.varadhi_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mbr_admin'));
CREATE INDEX vc_target_idx ON public.varadhi_clicks (target_type, target_id);

-- 7. Click increment RPC (bumps counter atomically)
CREATE OR REPLACE FUNCTION public.varadhi_log_click(_target_type text, _target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.varadhi_clicks (target_type, target_id, buyer_id)
    VALUES (_target_type, _target_id, auth.uid());
  IF _target_type = 'listing' THEN
    UPDATE public.varadhi_listings SET click_count = click_count + 1 WHERE id = _target_id;
  ELSIF _target_type = 'provider' THEN
    UPDATE public.varadhi_providers SET click_count = click_count + 1 WHERE id = _target_id;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.varadhi_log_click(text, uuid) TO authenticated, anon;
