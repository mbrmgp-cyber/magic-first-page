
-- Only assign member_code to approved members; clear it from rejected ones.
CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  org_letter text;
  next_n int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    NEW.member_code := NULL;
    RETURN NEW;
  END IF;
  IF NEW.member_code IS NULL THEN
    SELECT letter_code INTO org_letter FROM public.organizations WHERE id = NEW.org_id;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '^.*/', ''), '')::int), 0) + 1 INTO next_n
    FROM public.members WHERE org_id = NEW.org_id AND member_code ~ '/[0-9]+$';
    NEW.member_code := org_letter || '/' || lpad(next_n::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

-- Allow assignment on status change; protect only against rewriting existing codes.
CREATE OR REPLACE FUNCTION public.protect_member_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.member_code IS NOT NULL
     AND NEW.member_code IS DISTINCT FROM OLD.member_code
     AND NOT (NEW.status <> 'approved' AND NEW.member_code IS NULL) THEN
    RAISE EXCEPTION 'member_code cannot be changed';
  END IF;
  RETURN NEW;
END $$;

-- Also run assignment on UPDATE so approving a pending/rejected member assigns a code.
DROP TRIGGER IF EXISTS trg_member_code_upd ON public.members;
CREATE TRIGGER trg_member_code_upd BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();

-- Clear codes on existing rejected members.
UPDATE public.members SET member_code = NULL WHERE status = 'rejected';
