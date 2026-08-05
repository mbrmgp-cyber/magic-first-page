CREATE TABLE public.varadhi_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  request_id uuid,
  target_user_id uuid,
  seat_id uuid,
  state text,
  district text,
  mandal text,
  before_data jsonb,
  after_data jsonb,
  notes text,
  actor_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_varadhi_admin_audit_created ON public.varadhi_admin_audit (created_at DESC);
CREATE INDEX idx_varadhi_admin_audit_request ON public.varadhi_admin_audit (request_id);
CREATE INDEX idx_varadhi_admin_audit_target ON public.varadhi_admin_audit (target_user_id);

GRANT SELECT ON public.varadhi_admin_audit TO authenticated;
GRANT ALL ON public.varadhi_admin_audit TO service_role;

ALTER TABLE public.varadhi_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vaaradhi admins can view audit log"
ON public.varadhi_admin_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'varadhi_admin')
  OR EXISTS (
    SELECT 1 FROM public.varadhi_area_admins a
    WHERE a.user_id = auth.uid() AND a.is_active = true
  )
);