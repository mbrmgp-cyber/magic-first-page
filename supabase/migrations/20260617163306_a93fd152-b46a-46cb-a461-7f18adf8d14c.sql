
-- Fix infinite recursion in members RLS by using SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE org_id = _org_id AND user_id = _user_id AND status = 'approved'
  )
$$;

DROP POLICY IF EXISTS "Approved members can view co-members" ON public.members;
CREATE POLICY "Approved members can view co-members"
  ON public.members FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid(), org_id));

-- Allow org admin to directly insert members
DROP POLICY IF EXISTS "Org admin can insert members" ON public.members;
CREATE POLICY "Org admin can insert members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id AND o.admin_user_id = auth.uid()
  ));

-- Allow org admin to delete members
DROP POLICY IF EXISTS "Org admin can delete members" ON public.members;
CREATE POLICY "Org admin can delete members"
  ON public.members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id AND o.admin_user_id = auth.uid()
  ));
