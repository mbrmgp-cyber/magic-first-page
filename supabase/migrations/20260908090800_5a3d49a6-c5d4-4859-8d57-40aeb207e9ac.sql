REVOKE ALL ON public.chit_auctions FROM anon, authenticated;
GRANT ALL ON public.chit_auctions TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_committee_role(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_disciplinary_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_committee(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_accounts(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_events(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_rules(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_committee(uuid) FROM anon, authenticated;