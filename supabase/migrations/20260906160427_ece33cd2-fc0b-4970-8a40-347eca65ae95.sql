REVOKE ALL ON FUNCTION public.donors_guard_self_update() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.nominations_guard_self_update() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.loan_request_guard_surety_update() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_donor_total() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.varadhi_generate_commissions() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.varadhi_award_point(uuid, text, text, uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.varadhi_month_points(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_member_code(uuid, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.org_admin_update_member_code(uuid, text) FROM anon, PUBLIC;

-- Re-assert that sensitive columns stay unreadable for ordinary users
REVOKE SELECT (bank_account_number, bank_ifsc) ON public.members FROM authenticated, anon;
REVOKE SELECT (admin_aadhaar_url, pan_card_url, registration_certificate_url) ON public.organizations FROM authenticated, anon;
REVOKE SELECT (contact_phone, house_no, street) ON public.varadhi_listings FROM authenticated, anon;
REVOKE SELECT (aadhaar_url, license_url) ON public.varadhi_profiles FROM authenticated, anon;