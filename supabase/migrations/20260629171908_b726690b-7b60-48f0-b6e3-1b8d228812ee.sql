DROP POLICY IF EXISTS "approved members send interactions" ON public.chat_interactions;

CREATE POLICY "members and committee send interactions"
ON public.chat_interactions
FOR INSERT
TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND status IN ('pending','approved')
  AND (
    public.is_approved_member(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  )
);