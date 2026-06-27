CREATE OR REPLACE FUNCTION public.protect_member_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.allow_member_code_change', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF OLD.member_code IS NOT NULL
     AND NEW.member_code IS DISTINCT FROM OLD.member_code
     AND NOT (NEW.status <> 'approved' AND NEW.member_code IS NULL) THEN
    RAISE EXCEPTION 'member_code cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_member_code(_member_id uuid, _new_code text)
RETURNS public.members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.members;
  norm text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'mbr_admin') THEN
    RAISE EXCEPTION 'Forbidden: only MBR Admin can change member ID';
  END IF;
  norm := nullif(btrim(_new_code), '');
  IF norm IS NULL THEN
    RAISE EXCEPTION 'Member ID cannot be empty';
  END IF;
  IF EXISTS (SELECT 1 FROM public.members WHERE member_code = norm AND id <> _member_id) THEN
    RAISE EXCEPTION 'Member ID % already in use', norm;
  END IF;
  PERFORM set_config('app.allow_member_code_change', 'on', true);
  UPDATE public.members SET member_code = norm WHERE id = _member_id
  RETURNING * INTO m;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  RETURN m;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_update_member_code(uuid, text) TO authenticated;