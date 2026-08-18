-- 1. Fix mutable search_path on remaining functions
ALTER FUNCTION public.assign_member_code() SET search_path = public;
ALTER FUNCTION public.protect_member_code() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2. Revoke public EXECUTE on SECURITY DEFINER functions; grant only where needed
REVOKE ALL ON FUNCTION public.admin_update_member_code(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_leave_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_leave_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_accounts(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_events(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_rules(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_committee(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_chit_auction(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_committee_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_loan_summary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_disciplinary_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_committee(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_admin_update_member_code(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_donor_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_chit_month(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_chit_bid(uuid, numeric, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_chit_consent(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.varadhi_award_point(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.varadhi_generate_commissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.varadhi_log_click(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.varadhi_month_points(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.varadhi_request_payout(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_member_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_member_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_letter_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_org_letter_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_receipt_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_update_member_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_leave_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_leave_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_accounts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_rules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_committee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_chit_auction(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_committee_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_loan_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_disciplinary_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_committee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_admin_update_member_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_chit_month(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chit_bid(uuid, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_chit_consent(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.varadhi_log_click(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.varadhi_month_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.varadhi_request_payout(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.int_to_letters(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.int_to_letters(integer) FROM anon;

-- 3. members: hide bank details from co-members (column-level)
REVOKE SELECT (bank_account_number, bank_ifsc) ON public.members FROM authenticated, anon;

-- 4. varadhi_profiles: hide identity documents from other users
REVOKE SELECT (aadhaar_url, license_url) ON public.varadhi_profiles FROM authenticated, anon;

-- 5. varadhi_area_admins: only own row or MBR admins may read
DROP POLICY IF EXISTS "area admins readable by authenticated" ON public.varadhi_area_admins;
CREATE POLICY "area admins read own or admin" ON public.varadhi_area_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'varadhi_admin') OR public.has_role(auth.uid(), 'mbr_admin'));

-- 6. loan-proofs storage: exact path matching instead of LIKE
DROP POLICY IF EXISTS "Loan proofs: named surety can read" ON storage.objects;
CREATE POLICY "Loan proofs: named surety can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'loan-proofs' AND EXISTS (
      SELECT 1 FROM public.member_loan_requests r
      JOIN public.members sm ON sm.id = r.surety_member_id
      WHERE sm.user_id = auth.uid()
        AND objects.name IN (r.proof_url, r.signature_data_url, r.surety_signature_url)
    )
  );

DROP POLICY IF EXISTS "Loan proofs: org reviewers can read" ON storage.objects;
CREATE POLICY "Loan proofs: org reviewers can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'loan-proofs' AND EXISTS (
      SELECT 1 FROM public.member_loan_requests r
      WHERE objects.name IN (r.proof_url, r.signature_data_url, r.surety_signature_url)
        AND (public.is_org_admin(r.org_id) OR public.get_committee_role(auth.uid(), r.org_id) IS NOT NULL)
    )
  );

-- 7. member-receipts storage: restrict uploads
DROP POLICY IF EXISTS "member-receipts insert anon (register)" ON storage.objects;
DROP POLICY IF EXISTS "member-receipts insert authenticated" ON storage.objects;
CREATE POLICY "member-receipts insert own or org admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'member-receipts' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'admin'
        AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
        AND public.can_edit_org(((storage.foldername(name))[2])::uuid)
      )
    )
  );