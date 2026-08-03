CREATE TABLE public.varadhi_point_settings (
  id integer PRIMARY KEY DEFAULT 1,
  free_monthly_points integer NOT NULL DEFAULT 10,
  enforce_limit boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT varadhi_point_settings_single CHECK (id = 1)
);
GRANT SELECT ON public.varadhi_point_settings TO authenticated;
GRANT ALL ON public.varadhi_point_settings TO service_role;
ALTER TABLE public.varadhi_point_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read point settings"
  ON public.varadhi_point_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.varadhi_point_settings (id, free_monthly_points) VALUES (1, 10);

CREATE TABLE public.varadhi_point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 1,
  event_type text NOT NULL CHECK (event_type IN ('upload','contact')),
  ref_type text,
  ref_id uuid,
  actor_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX varadhi_point_events_user_month_idx ON public.varadhi_point_events (user_id, created_at DESC);
GRANT SELECT ON public.varadhi_point_events TO authenticated;
GRANT ALL ON public.varadhi_point_events TO service_role;
ALTER TABLE public.varadhi_point_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own point events"
  ON public.varadhi_point_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.varadhi_award_point(
  _user_id uuid, _event_type text, _ref_type text DEFAULT NULL, _ref_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.varadhi_point_events (user_id, event_type, ref_type, ref_id, actor_user_id)
  VALUES (_user_id, _event_type, _ref_type, _ref_id, auth.uid());
END; $$;
GRANT EXECUTE ON FUNCTION public.varadhi_award_point(uuid, text, text, uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.varadhi_month_points(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(points), 0)::int FROM public.varadhi_point_events
  WHERE user_id = _user_id AND created_at >= date_trunc('month', now());
$$;
GRANT EXECUTE ON FUNCTION public.varadhi_month_points(uuid) TO authenticated, service_role;