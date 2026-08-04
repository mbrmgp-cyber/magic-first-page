CREATE TABLE public.varadhi_admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  requested_level text NOT NULL DEFAULT 'state_admin' CHECK (requested_level IN ('state_admin','district_admin')),
  state text NOT NULL,
  district text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.varadhi_admin_requests TO authenticated;
GRANT ALL ON public.varadhi_admin_requests TO service_role;

ALTER TABLE public.varadhi_admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own admin requests readable" ON public.varadhi_admin_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own admin requests insertable" ON public.varadhi_admin_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_varadhi_admin_requests_updated
  BEFORE UPDATE ON public.varadhi_admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.varadhi_area_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('state_admin','district_admin')),
  state text NOT NULL,
  district text,
  parent_admin_id uuid REFERENCES public.varadhi_area_admins(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT varadhi_area_admin_district_required CHECK (level = 'state_admin' OR district IS NOT NULL)
);

CREATE UNIQUE INDEX varadhi_area_admins_unique_seat
  ON public.varadhi_area_admins (user_id, level, state, COALESCE(district, ''));

GRANT SELECT ON public.varadhi_area_admins TO authenticated;
GRANT ALL ON public.varadhi_area_admins TO service_role;

ALTER TABLE public.varadhi_area_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "area admins readable by authenticated" ON public.varadhi_area_admins
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_varadhi_area_admins_updated
  BEFORE UPDATE ON public.varadhi_area_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();