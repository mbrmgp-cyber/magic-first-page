CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid,
  kind text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_org_managers(_org_id uuid, _kind text, _title text, _body text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications(user_id, org_id, kind, title, body, link)
  SELECT DISTINCT u, _org_id, _kind, _title, _body, _link FROM (
    SELECT admin_user_id AS u FROM public.organizations WHERE id = _org_id
    UNION
    SELECT m.user_id FROM public.committee_members cm JOIN public.members m ON m.id = cm.member_id
     WHERE cm.org_id = _org_id AND cm.is_active AND m.user_id IS NOT NULL
  ) s WHERE u IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_org_managers(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_member_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_org_managers(NEW.org_id, 'member_registration', 'New member registration', NEW.name, '/org/members');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, org_id, kind, title, body, link)
    VALUES (NEW.user_id, NEW.org_id, 'member_status', 'Membership ' || NEW.status::text, NEW.name, '/member/dashboard');
  ELSIF NEW.photo_url IS DISTINCT FROM OLD.photo_url AND NEW.photo_url IS NOT NULL THEN
    PERFORM public.notify_org_managers(NEW.org_id, 'photo_upload', 'Member photo updated', NEW.name, '/org/members');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_members AFTER INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.notify_member_events();

CREATE OR REPLACE FUNCTION public.notify_request_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _label text; _link text;
BEGIN
  _label := CASE WHEN TG_TABLE_NAME = 'member_loan_requests' THEN 'Loan request' ELSE 'Leave request' END;
  _link := CASE WHEN TG_TABLE_NAME = 'member_loan_requests' THEN '/org/loan-requests' ELSE '/org/members' END;
  SELECT user_id INTO _uid FROM public.members WHERE id = NEW.member_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_org_managers(NEW.org_id, 'request_new', 'New ' || lower(_label), (SELECT name FROM public.members WHERE id = NEW.member_id), _link);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND _uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, org_id, kind, title, body, link)
    VALUES (_uid, NEW.org_id, 'request_update', _label || ' ' || NEW.status::text, NULL, '/member/dashboard');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_loan_req AFTER INSERT OR UPDATE ON public.member_loan_requests FOR EACH ROW EXECUTE FUNCTION public.notify_request_events();
CREATE TRIGGER trg_notify_leave_req AFTER INSERT OR UPDATE ON public.member_leave_requests FOR EACH ROW EXECUTE FUNCTION public.notify_request_events();