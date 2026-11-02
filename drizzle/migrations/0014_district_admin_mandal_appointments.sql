CREATE OR REPLACE FUNCTION public.varadhi_appoint_mandal_admin(_user_id uuid, _state text, _district text, _mandal text, _parent_admin_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent public.varadhi_area_admins%ROWTYPE; candidate public.varadhi_profiles%ROWTYPE; new_id uuid; actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO parent FROM public.varadhi_area_admins WHERE id = _parent_admin_id FOR UPDATE;
 IF NOT FOUND OR NOT parent.is_active OR parent.level <> 'district_admin' OR parent.state IS DISTINCT FROM _state OR parent.district IS DISTINCT FROM _district THEN RAISE EXCEPTION 'Invalid active district admin'; END IF;
 IF NOT public.has_role(actor, 'varadhi_admin') AND parent.user_id <> actor THEN RAISE EXCEPTION 'Forbidden: your district only'; END IF;
 IF _user_id = actor THEN RAISE EXCEPTION 'Cannot appoint yourself'; END IF;
 IF length(trim(coalesce(_mandal, ''))) = 0 OR length(trim(_mandal)) > 100 THEN RAISE EXCEPTION 'Mandal required'; END IF;
 SELECT * INTO candidate FROM public.varadhi_profiles WHERE user_id = _user_id FOR UPDATE;
 IF NOT FOUND OR candidate.verification_status <> 'approved' OR candidate.state IS DISTINCT FROM _state OR candidate.district IS DISTINCT FROM _district THEN RAISE EXCEPTION 'Approved registration in this district required'; END IF;
 IF EXISTS (SELECT 1 FROM public.varadhi_area_admins WHERE user_id = _user_id AND is_active) OR public.has_role(_user_id, 'varadhi_admin') THEN RAISE EXCEPTION 'Already an active admin'; END IF;
 INSERT INTO public.varadhi_area_admins(user_id,level,state,district,mandal,parent_admin_id,assigned_by) VALUES(_user_id,'mandal_admin',parent.state,parent.district,trim(_mandal),parent.id,actor) RETURNING id INTO new_id;
 INSERT INTO public.varadhi_admin_audit(action,actor_user_id,target_user_id,seat_id,state,district,mandal,after_data) VALUES('mandal_admin_assigned',actor,_user_id,new_id,parent.state,parent.district,trim(_mandal),jsonb_build_object('level','mandal_admin','parent_admin_id',parent.id));
 RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.varadhi_appoint_mandal_admin(uuid,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.varadhi_appoint_mandal_admin(uuid,text,text,text,uuid) TO authenticated;
-- Regional appointments use the validated RPC; direct writes remain super-admin-only.
CREATE POLICY "Regional appointments cannot directly write seats" ON public.varadhi_area_admins AS RESTRICTIVE FOR ALL TO authenticated USING (true) WITH CHECK (public.has_role(auth.uid(), 'varadhi_admin'));