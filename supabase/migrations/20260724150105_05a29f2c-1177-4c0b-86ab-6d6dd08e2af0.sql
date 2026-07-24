
CREATE OR REPLACE FUNCTION public.assign_org_letter_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  next_n int;
  candidate text;
  exists_already boolean;
BEGIN
  IF NEW.letter_code IS NULL THEN
    -- Serialize concurrent org inserts so two rows can't grab the same letter.
    PERFORM pg_advisory_xact_lock(hashtext('organizations_letter_code'));

    SELECT COALESCE(MAX(
      CASE WHEN letter_code ~ '^[A-Z]+$' THEN
        (SELECT SUM((ascii(substring(letter_code from i for 1)) - 64) *
                    POWER(26, length(letter_code) - i)::int)
         FROM generate_series(1, length(letter_code)) i)
      ELSE 0 END
    ), 0) + 1 INTO next_n FROM public.organizations;

    LOOP
      candidate := public.int_to_letters(next_n);
      SELECT EXISTS (SELECT 1 FROM public.organizations WHERE letter_code = candidate)
        INTO exists_already;
      EXIT WHEN NOT exists_already;
      next_n := next_n + 1;
    END LOOP;

    NEW.letter_code := candidate;
  END IF;
  RETURN NEW;
END $function$;
