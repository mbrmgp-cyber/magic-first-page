-- 1. chat_interactions: committee/admin may no longer read or moderate personal member-to-member messages
DROP POLICY IF EXISTS "interactions read" ON public.chat_interactions;
CREATE POLICY "interactions read" ON public.chat_interactions
FOR SELECT TO authenticated
USING (
  sender_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = chat_interactions.recipient_member_id AND m.user_id = auth.uid())
  OR (
    coalesce(template_type, '') <> 'personal'
    AND (
      EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = chat_interactions.org_id AND o.admin_user_id = auth.uid())
      OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "committee reviews interactions" ON public.chat_interactions;
CREATE POLICY "committee reviews interactions" ON public.chat_interactions
FOR UPDATE TO authenticated
USING (
  coalesce(template_type, '') <> 'personal'
  AND (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = chat_interactions.org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  )
);

-- 2. varadhi_admin_audit: area admins limited to their own assigned region
DROP POLICY IF EXISTS "Vaaradhi admins can view audit log" ON public.varadhi_admin_audit;
CREATE POLICY "Vaaradhi admins can view audit log" ON public.varadhi_admin_audit
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'varadhi_admin'::app_role)
  OR actor_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.varadhi_area_admins a
    WHERE a.user_id = auth.uid()
      AND a.is_active = true
      AND (a.state IS NULL OR a.state IS NOT DISTINCT FROM varadhi_admin_audit.state)
      AND (a.district IS NULL OR a.district IS NOT DISTINCT FROM varadhi_admin_audit.district)
      AND (a.mandal IS NULL OR a.mandal IS NOT DISTINCT FROM varadhi_admin_audit.mandal)
  )
);

-- 3. translation_memory: no longer readable by anonymous visitors
DROP POLICY IF EXISTS "tm_public_read" ON public.translation_memory;
CREATE POLICY "tm_authenticated_read" ON public.translation_memory
FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.translation_memory FROM anon;