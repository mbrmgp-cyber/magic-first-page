DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS t
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
       AND c.relname <> 'platform_super_admin_seed'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.t);
  END LOOP;
END;
$$;

GRANT SELECT ON public.varadhi_site_settings TO anon;
