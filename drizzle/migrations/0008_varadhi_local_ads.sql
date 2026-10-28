CREATE TABLE public.varadhi_page_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL CHECK (page IN ('home','search','dashboard','profile')),
  image_url text NOT NULL,
  link_url text,
  phone text,
  title text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.varadhi_page_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.varadhi_page_ads TO authenticated;
GRANT ALL ON public.varadhi_page_ads TO service_role;
ALTER TABLE public.varadhi_page_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone sees active ads" ON public.varadhi_page_ads FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'varadhi_admin'));
CREATE POLICY "Admins manage ads" ON public.varadhi_page_ads FOR ALL TO authenticated USING (public.has_role(auth.uid(),'varadhi_admin')) WITH CHECK (public.has_role(auth.uid(),'varadhi_admin'));
CREATE POLICY "Public read ad images" ON storage.objects FOR SELECT USING (bucket_id = 'varadhi-ads');
CREATE POLICY "Admins upload ad images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'varadhi-ads' AND public.has_role(auth.uid(),'varadhi_admin'));
CREATE POLICY "Admins delete ad images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'varadhi-ads' AND public.has_role(auth.uid(),'varadhi_admin'));