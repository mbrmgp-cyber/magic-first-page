CREATE TABLE IF NOT EXISTS public.varadhi_site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  ticker_te TEXT NOT NULL DEFAULT 'వారధి కేవలం సమాచార వేదిక. వినియోగదారుల మధ్య జరిగే డబ్బు లావాదేవీలు, వస్తువుల నాణ్యత లేదా ఒప్పందాలకు వారధి బాధ్యత వహించదు',
  ticker_en TEXT NOT NULL DEFAULT 'Vaaradhi is only an information platform. Vaaradhi is not responsible for money transactions, product quality or agreements between users.',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT varadhi_site_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.varadhi_site_settings TO anon;
GRANT SELECT ON public.varadhi_site_settings TO authenticated;
GRANT ALL ON public.varadhi_site_settings TO service_role;

ALTER TABLE public.varadhi_site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read varadhi site settings" ON public.varadhi_site_settings;
CREATE POLICY "Anyone can read varadhi site settings"
ON public.varadhi_site_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.varadhi_site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;