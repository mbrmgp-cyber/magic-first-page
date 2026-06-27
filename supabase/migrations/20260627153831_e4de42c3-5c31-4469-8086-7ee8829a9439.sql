
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_code_locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.org_admin_update_member_code(_member_id uuid, _new_code text)
RETURNS public.members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.members;
  norm text;
  org uuid;
  locked boolean;
BEGIN
  SELECT org_id, member_code_locked INTO org, locked FROM public.members WHERE id = _member_id;
  IF org IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.can_edit_org(org) AND NOT public.has_role(auth.uid(), 'mbr_admin') THEN
    RAISE EXCEPTION 'Forbidden: only society admin can edit member ID';
  END IF;
  IF locked AND NOT public.has_role(auth.uid(), 'mbr_admin') THEN
    RAISE EXCEPTION 'ఈ ఐడి ఇప్పటికే లాక్ అయింది. మార్చడానికి Super Admin సంప్రదించండి.';
  END IF;
  norm := nullif(btrim(_new_code), '');
  IF norm IS NULL THEN RAISE EXCEPTION 'ఐడి ఖాళీగా ఉండకూడదు'; END IF;
  IF EXISTS (SELECT 1 FROM public.members WHERE member_code = norm AND id <> _member_id) THEN
    RAISE EXCEPTION 'ఈ ఐడి % వేరే సభ్యునికి ఉంది', norm;
  END IF;
  PERFORM set_config('app.allow_member_code_change', 'on', true);
  UPDATE public.members
    SET member_code = norm, member_code_locked = true
    WHERE id = _member_id
    RETURNING * INTO m;
  RETURN m;
END $$;

GRANT EXECUTE ON FUNCTION public.org_admin_update_member_code(uuid, text) TO authenticated;
