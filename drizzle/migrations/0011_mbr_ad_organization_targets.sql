ALTER TABLE public.mbr_global_ads ADD COLUMN IF NOT EXISTS organization_ids uuid[] DEFAULT NULL;
COMMENT ON COLUMN public.mbr_global_ads.organization_ids IS 'NULL displays in all organizations; an empty array displays nowhere; otherwise only selected organization IDs. Management retains existing mbr_admin RLS.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mbr_global_ads TO authenticated;
GRANT ALL ON public.mbr_global_ads TO service_role;