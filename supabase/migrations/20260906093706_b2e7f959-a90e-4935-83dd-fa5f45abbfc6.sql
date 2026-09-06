CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  IF auth.uid() IS NULL AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  ) OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.platform_super_admin_seed s
      ON lower(u.email) = lower(s.email)
    WHERE u.id = _user_id AND s.role = _role
  );
END $$;

CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  IF auth.uid() IS NULL AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.user_id = _user_id AND m.org_id = _org_id AND m.status = 'approved'
  );
END $$;

CREATE OR REPLACE FUNCTION public.get_committee_role(_user_id uuid, _org_id uuid)
RETURNS committee_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.committee_role;
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;
  IF auth.uid() IS NULL AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NULL;
  END IF;

  SELECT cm.role INTO r
  FROM public.committee_members cm
  JOIN public.members m ON m.id = cm.member_id
  WHERE cm.org_id = _org_id
    AND m.user_id = _user_id
    AND cm.is_active = true
    AND cm.term_end_date >= CURRENT_DATE
  ORDER BY CASE cm.role
    WHEN 'president' THEN 1
    WHEN 'vice_president' THEN 2
    WHEN 'treasurer' THEN 3
    WHEN 'advisor' THEN 4
    WHEN 'executive' THEN 5
    WHEN 'worker' THEN 6
  END
  LIMIT 1;

  RETURN r;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_committee_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_committee_role(uuid, uuid) TO authenticated, service_role;