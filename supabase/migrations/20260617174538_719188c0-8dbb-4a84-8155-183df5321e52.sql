
-- Helper: int -> letter code (1=A, 26=Z, 27=AA, ...)
CREATE OR REPLACE FUNCTION public.int_to_letters(n int)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s text := ''; r int;
BEGIN
  IF n IS NULL OR n < 1 THEN RETURN NULL; END IF;
  WHILE n > 0 LOOP
    n := n - 1;
    r := n % 26;
    s := chr(65 + r) || s;
    n := n / 26;
  END LOOP;
  RETURN s;
END $$;

-- organizations.letter_code
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS letter_code text;

-- Backfill existing organizations by created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.organizations WHERE letter_code IS NULL
)
UPDATE public.organizations o
SET letter_code = public.int_to_letters(ranked.rn::int)
FROM ranked WHERE ranked.id = o.id;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_letter_code_key ON public.organizations(letter_code);

-- Trigger to auto-assign on insert
CREATE OR REPLACE FUNCTION public.assign_org_letter_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_n int;
BEGIN
  IF NEW.letter_code IS NULL THEN
    SELECT COALESCE(MAX(
      CASE WHEN letter_code ~ '^[A-Z]+$' THEN
        (SELECT SUM((ascii(substring(letter_code from i for 1)) - 64) *
                    POWER(26, length(letter_code) - i)::int)
         FROM generate_series(1, length(letter_code)) i)
      ELSE 0 END
    ), 0) + 1 INTO next_n FROM public.organizations;
    NEW.letter_code := public.int_to_letters(next_n);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_org_letter ON public.organizations;
CREATE TRIGGER trg_org_letter BEFORE INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.assign_org_letter_code();

-- members.member_code
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_code text;

-- Backfill: per-org sequence by created_at
WITH ranked AS (
  SELECT m.id, o.letter_code, ROW_NUMBER() OVER (PARTITION BY m.org_id ORDER BY m.created_at, m.id) AS rn
  FROM public.members m JOIN public.organizations o ON o.id = m.org_id
  WHERE m.member_code IS NULL
)
UPDATE public.members m
SET member_code = ranked.letter_code || '/' || lpad(ranked.rn::text, 4, '0')
FROM ranked WHERE ranked.id = m.id;

CREATE UNIQUE INDEX IF NOT EXISTS members_member_code_key ON public.members(member_code);

-- Trigger to auto-assign on insert
CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE org_letter text; next_n int;
BEGIN
  IF NEW.member_code IS NULL THEN
    SELECT letter_code INTO org_letter FROM public.organizations WHERE id = NEW.org_id;
    IF org_letter IS NULL THEN RAISE EXCEPTION 'Organization letter_code missing'; END IF;
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(member_code, '^.*/', ''), '')::int
    ), 0) + 1 INTO next_n
    FROM public.members WHERE org_id = NEW.org_id AND member_code ~ '/[0-9]+$';
    NEW.member_code := org_letter || '/' || lpad(next_n::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_member_code ON public.members;
CREATE TRIGGER trg_member_code BEFORE INSERT ON public.members
FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();

-- Prevent updates to member_code / letter_code
CREATE OR REPLACE FUNCTION public.protect_member_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.member_code IS DISTINCT FROM OLD.member_code THEN
    RAISE EXCEPTION 'member_code cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_member_code ON public.members;
CREATE TRIGGER trg_protect_member_code BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.protect_member_code();

CREATE OR REPLACE FUNCTION public.protect_letter_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.letter_code IS DISTINCT FROM OLD.letter_code THEN
    RAISE EXCEPTION 'letter_code cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_letter_code ON public.organizations;
CREATE TRIGGER trg_protect_letter_code BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.protect_letter_code();
