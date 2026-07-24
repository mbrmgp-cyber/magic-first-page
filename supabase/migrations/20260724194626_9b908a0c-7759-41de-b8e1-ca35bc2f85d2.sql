
CREATE TABLE public.admin_module_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  preset text NOT NULL DEFAULT 'custom',
  modules text[] NOT NULL DEFAULT '{}',
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_module_access TO authenticated;
GRANT ALL ON public.admin_module_access TO service_role;

ALTER TABLE public.admin_module_access ENABLE ROW LEVEL SECURITY;

-- Super admin (society admin) manages everything for their society
CREATE POLICY "Org admin manages module access"
  ON public.admin_module_access
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

-- The grantee can read their own row so their menu can render
CREATE POLICY "Grantee reads own module access"
  ON public.admin_module_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER admin_module_access_touch_updated_at
  BEFORE UPDATE ON public.admin_module_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
