-- 1. Donors: block self-approval / privileged column changes
CREATE OR REPLACE FUNCTION public.donors_guard_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_org_admin(OLD.org_id) OR public.can_edit_org(OLD.org_id)
     OR public.has_role(auth.uid(), 'mbr_admin') THEN
    RETURN NEW;
  END IF;
  NEW.org_id := OLD.org_id;
  NEW.user_id := OLD.user_id;
  NEW.status := OLD.status;
  NEW.momento_issued := OLD.momento_issued;
  NEW.momento_issued_at := OLD.momento_issued_at;
  NEW.linked_member_id := OLD.linked_member_id;
  NEW.total_donated := OLD.total_donated;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_donors_guard_self_update ON public.donors;
CREATE TRIGGER trg_donors_guard_self_update
BEFORE UPDATE ON public.donors
FOR EACH ROW EXECUTE FUNCTION public.donors_guard_self_update();

-- 2. Election nominations: candidate cannot approve own nomination
CREATE OR REPLACE FUNCTION public.nominations_guard_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_org_admin(OLD.org_id) OR public.can_manage_committee(OLD.org_id)
     OR public.has_role(auth.uid(), 'mbr_admin') THEN
    RETURN NEW;
  END IF;
  NEW.org_id := OLD.org_id;
  NEW.election_id := OLD.election_id;
  NEW.member_id := OLD.member_id;
  NEW.position := OLD.position;
  NEW.review_notes := OLD.review_notes;
  -- self path may only withdraw, never approve/reject
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_nominations_guard_self_update ON public.org_election_nominations;
CREATE TRIGGER trg_nominations_guard_self_update
BEFORE UPDATE ON public.org_election_nominations
FOR EACH ROW EXECUTE FUNCTION public.nominations_guard_self_update();

-- 3. Loan requests: surety may only change consent fields
CREATE OR REPLACE FUNCTION public.loan_request_guard_surety_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_surety boolean;
BEGIN
  IF public.can_edit_accounts(OLD.org_id) OR public.is_org_admin(OLD.org_id)
     OR public.has_role(auth.uid(), 'mbr_admin') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = OLD.surety_member_id AND m.user_id = auth.uid()
  ) INTO is_surety;

  IF is_surety AND NOT EXISTS (
    SELECT 1 FROM public.members m2
    WHERE m2.id = OLD.member_id AND m2.user_id = auth.uid()
  ) THEN
    NEW.org_id := OLD.org_id;
    NEW.member_id := OLD.member_id;
    NEW.requested_amount := OLD.requested_amount;
    NEW.reason := OLD.reason;
    NEW.tenure_months := OLD.tenure_months;
    NEW.interest_rate_monthly := OLD.interest_rate_monthly;
    NEW.surety_member_id := OLD.surety_member_id;
    NEW.surety_member_code := OLD.surety_member_code;
    NEW.status := OLD.status;
    NEW.approved_loan_id := OLD.approved_loan_id;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reject_reason := OLD.reject_reason;
    NEW.utr_number := OLD.utr_number;
    NEW.payment_date := OLD.payment_date;
    NEW.signature_data_url := OLD.signature_data_url;
    NEW.proof_url := OLD.proof_url;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_loan_request_guard_surety_update ON public.member_loan_requests;
CREATE TRIGGER trg_loan_request_guard_surety_update
BEFORE UPDATE ON public.member_loan_requests
FOR EACH ROW EXECUTE FUNCTION public.loan_request_guard_surety_update();

-- 4. Column-level read restrictions for sensitive columns
DO $$
DECLARE
  t text; r text; cols text; sensitive text[];
  targets text[][] := ARRAY[
    ARRAY['members', 'bank_account_number,bank_ifsc'],
    ARRAY['organizations', 'admin_aadhaar_url,pan_card_url,registration_certificate_url'],
    ARRAY['varadhi_listings', 'contact_phone,house_no,street'],
    ARRAY['varadhi_profiles', 'aadhaar_url,license_url']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(targets, 1) LOOP
    t := targets[i][1];
    sensitive := string_to_array(targets[i][2], ',');
    FOREACH r IN ARRAY ARRAY['authenticated', 'anon'] LOOP
      IF has_table_privilege(r, format('public.%I', t), 'SELECT') THEN
        SELECT string_agg(format('%I', column_name), ', ')
          INTO cols
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t
           AND NOT (column_name = ANY (sensitive));
        EXECUTE format('REVOKE SELECT ON public.%I FROM %I', t, r);
        EXECUTE format('GRANT SELECT (%s) ON public.%I TO %I', cols, t, r);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 5. Definer functions: no anonymous execution; internal-only helper locked down
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', f.sig);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.can_edit_rules(uuid) FROM authenticated;