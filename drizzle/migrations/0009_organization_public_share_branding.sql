CREATE OR REPLACE FUNCTION public.organization_share_branding(_code text)
RETURNS TABLE(id uuid, name text, org_code text, has_logo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT o.id, o.name, o.org_code, (o.logo_url IS NOT NULL AND o.logo_url <> '')
 FROM public.organizations o
 WHERE o.approval_status = 'approved'
 AND (o.org_code = upper(trim(_code)) OR o.letter_code = upper(trim(_code)))
 ORDER BY (o.org_code = upper(trim(_code))) DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.organization_share_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_share_branding(text) TO anon, authenticated, service_role;