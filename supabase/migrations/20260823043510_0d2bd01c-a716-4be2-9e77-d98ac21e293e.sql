GRANT SELECT ON public.varadhi_profiles TO authenticated;
GRANT SELECT ON public.varadhi_listings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.varadhi_profiles FROM anon;