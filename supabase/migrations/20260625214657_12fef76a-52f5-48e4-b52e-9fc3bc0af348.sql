CREATE POLICY "Approved members can view their org"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_approved_member(auth.uid(), id));