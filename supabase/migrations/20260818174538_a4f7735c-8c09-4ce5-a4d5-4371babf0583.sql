-- 1. Fix tautological org check on member_loan_requests INSERT policy
DROP POLICY IF EXISTS "Members can create their own requests" ON public.member_loan_requests;
CREATE POLICY "Members can create their own requests"
ON public.member_loan_requests
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = member_loan_requests.member_id
    AND m.user_id = auth.uid()
    AND m.org_id = member_loan_requests.org_id
));

-- 2. Remove anonymous access to seller/provider contact details & addresses
DROP POLICY IF EXISTS "vl_browse_running" ON public.varadhi_listings;
CREATE POLICY "vl_browse_running"
ON public.varadhi_listings
FOR SELECT TO authenticated
USING (stock_status = 'running');

DROP POLICY IF EXISTS "vpr_browse_online" ON public.varadhi_providers;
CREATE POLICY "vpr_browse_online"
ON public.varadhi_providers
FOR SELECT TO authenticated
USING (availability_status = 'online');

REVOKE ALL ON public.varadhi_listings FROM anon;
REVOKE ALL ON public.varadhi_providers FROM anon;

-- 3. Revoke EXECUTE from signed-in users on SECURITY DEFINER functions they must not call directly
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.varadhi_award_point(uuid, text, text, uuid) FROM authenticated, anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.varadhi_award_point(uuid, text, text, uuid) TO service_role;