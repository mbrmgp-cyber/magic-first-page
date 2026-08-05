CREATE TABLE public.varadhi_admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  phone text,
  state text,
  district text,
  mandal text,
  status text NOT NULL DEFAULT 'new',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.varadhi_admin_messages TO authenticated;
GRANT ALL ON public.varadhi_admin_messages TO service_role;

ALTER TABLE public.varadhi_admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own messages"
  ON public.varadhi_admin_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own messages"
  ON public.varadhi_admin_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_varadhi_admin_messages_updated_at
  BEFORE UPDATE ON public.varadhi_admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();