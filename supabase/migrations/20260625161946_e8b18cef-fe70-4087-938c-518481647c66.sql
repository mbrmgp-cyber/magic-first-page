
-- Announcements (broadcast)
CREATE TABLE public.chat_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_announcements TO authenticated;
GRANT ALL ON public.chat_announcements TO service_role;
ALTER TABLE public.chat_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read announcements"
  ON public.chat_announcements FOR SELECT TO authenticated
  USING (
    public.is_approved_member(auth.uid(), org_id)
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
  );

CREATE POLICY "committee posts announcements"
  ON public.chat_announcements FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
      OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
    )
  );

CREATE POLICY "committee updates announcements"
  ON public.chat_announcements FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  );

CREATE POLICY "committee deletes announcements"
  ON public.chat_announcements FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  );

CREATE TRIGGER trg_chat_announcements_updated
  BEFORE UPDATE ON public.chat_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Member interactions (templated, approval-gated)
CREATE TABLE public.chat_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('appreciation','condolence','help')),
  message_te text NOT NULL,
  message_en text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_interactions TO authenticated;
GRANT ALL ON public.chat_interactions TO service_role;
ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;

-- Sender can read own; recipient can read approved; committee/admin can read all
CREATE POLICY "interactions read"
  ON public.chat_interactions FOR SELECT TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR (status = 'approved' AND EXISTS (
      SELECT 1 FROM public.members m WHERE m.id = recipient_member_id AND m.user_id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  );

CREATE POLICY "approved members send interactions"
  ON public.chat_interactions FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND status = 'pending'
    AND public.is_approved_member(auth.uid(), org_id)
  );

CREATE POLICY "committee reviews interactions"
  ON public.chat_interactions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.admin_user_id = auth.uid())
    OR public.get_committee_role(auth.uid(), org_id) IS NOT NULL
  );

CREATE TRIGGER trg_chat_interactions_updated
  BEFORE UPDATE ON public.chat_interactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
