CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  org_letter text;
  next_n int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    NEW.member_code := NULL;
    RETURN NEW;
  END IF;
  IF NEW.member_code IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('member_code_' || NEW.org_id::text));
    SELECT letter_code INTO org_letter FROM public.organizations WHERE id = NEW.org_id;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '^.*/', ''), '')::int), 0) + 1 INTO next_n
    FROM public.members WHERE org_id = NEW.org_id AND member_code ~ '/[0-9]+$';
    NEW.member_code := org_letter || '/' || lpad(next_n::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;