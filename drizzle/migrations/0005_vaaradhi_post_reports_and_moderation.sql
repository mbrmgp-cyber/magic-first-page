CREATE TABLE public.varadhi_post_removals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_type text NOT NULL CHECK (target_type IN ('listing','provider')), target_id uuid NOT NULL, owner_id uuid NOT NULL, title text NOT NULL, reason text NOT NULL, actor_id uuid NOT NULL, actor_name text NOT NULL, state text, district text, mandal text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(target_type,target_id)
);
GRANT SELECT ON public.varadhi_post_removals TO authenticated;
GRANT ALL ON public.varadhi_post_removals TO service_role;
ALTER TABLE public.varadhi_post_removals ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.varadhi_post_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_type text NOT NULL CHECK (target_type IN ('listing','provider')), target_id uuid NOT NULL, owner_id uuid NOT NULL, title text NOT NULL, reporter_id uuid NOT NULL, reason text NOT NULL, state text, district text, mandal text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','removed','dismissed')), review_reason text, reviewer_id uuid, reviewer_name text, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(target_type,target_id,reporter_id)
);
GRANT SELECT ON public.varadhi_post_reports TO authenticated;
GRANT ALL ON public.varadhi_post_reports TO service_role;
ALTER TABLE public.varadhi_post_reports ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.varadhi_can_moderate_area(_state text, _district text, _mandal text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'varadhi_admin') OR EXISTS (
 SELECT 1 FROM public.varadhi_area_admins a WHERE a.user_id=auth.uid() AND a.is_active AND a.state=_state AND (a.level='state_admin' OR (a.district=_district AND (a.level='district_admin' OR (a.level='mandal_admin' AND a.mandal=_mandal))))));
$$;
REVOKE ALL ON FUNCTION public.varadhi_can_moderate_area(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.varadhi_can_moderate_area(text,text,text) TO authenticated, service_role;
CREATE POLICY removal_read ON public.varadhi_post_removals FOR SELECT TO authenticated USING (owner_id=auth.uid() OR public.varadhi_can_moderate_area(state,district,mandal));
CREATE POLICY report_read ON public.varadhi_post_reports FOR SELECT TO authenticated USING (reporter_id=auth.uid() OR public.varadhi_can_moderate_area(state,district,mandal));
CREATE OR REPLACE FUNCTION public.varadhi_post_is_removed(_type text,_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.varadhi_post_removals WHERE target_type=_type AND target_id=_id); $$;
REVOKE ALL ON FUNCTION public.varadhi_post_is_removed(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varadhi_post_is_removed(text,uuid) TO authenticated,service_role;
CREATE POLICY vl_removed_read_guard ON public.varadhi_listings AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.varadhi_post_is_removed('listing',id));
CREATE POLICY vl_removed_update_guard ON public.varadhi_listings AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.varadhi_post_is_removed('listing',id)) WITH CHECK (NOT public.varadhi_post_is_removed('listing',id));
CREATE POLICY vl_removed_insert_guard ON public.varadhi_listings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.varadhi_post_is_removed('listing',id));
CREATE POLICY vpr_removed_read_guard ON public.varadhi_providers AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.varadhi_post_is_removed('provider',id));
CREATE POLICY vpr_removed_update_guard ON public.varadhi_providers AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.varadhi_post_is_removed('provider',id)) WITH CHECK (NOT public.varadhi_post_is_removed('provider',id));
CREATE POLICY vpr_removed_insert_guard ON public.varadhi_providers AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.varadhi_post_is_removed('provider',id));
CREATE OR REPLACE FUNCTION public.varadhi_moderate_post(_type text,_id uuid,_action text,_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _owner uuid; _title text; _state text; _district text; _mandal text; _name text; _can boolean; _removed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF _type NOT IN ('listing','provider') OR _action NOT IN ('check','report','remove','dismiss') THEN RAISE EXCEPTION 'Invalid action'; END IF;
 IF _type='listing' THEN
 SELECT l.seller_id,l.title,coalesce(nullif(l.state,''),p.state),coalesce(nullif(l.district,''),p.district),coalesce(nullif(l.mandal,''),p.mandal) INTO _owner,_title,_state,_district,_mandal FROM public.varadhi_listings l LEFT JOIN public.varadhi_profiles p ON p.user_id=l.seller_id WHERE l.id=_id FOR UPDATE OF l;
 ELSE
 SELECT l.user_id,l.title,p.state,p.district,p.mandal INTO _owner,_title,_state,_district,_mandal FROM public.varadhi_providers l LEFT JOIN public.varadhi_profiles p ON p.user_id=l.user_id WHERE l.id=_id FOR UPDATE OF l;
 END IF;
 IF _owner IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;
 _can:=public.varadhi_can_moderate_area(_state,_district,_mandal);
 _removed:=public.varadhi_post_is_removed(_type,_id);
 IF _action='check' THEN RETURN jsonb_build_object('canRemove',_can,'removed',_removed,'reported',EXISTS(SELECT 1 FROM public.varadhi_post_reports WHERE target_type=_type AND target_id=_id AND reporter_id=auth.uid())); END IF;
 IF length(trim(coalesce(_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'కారణం ఇవ్వండి'; END IF;
 IF _action='report' THEN
 IF _removed THEN RAISE EXCEPTION 'Post already removed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.varadhi_profiles WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Complete your Vaaradhi registration'; END IF;
 IF _type='listing' AND NOT EXISTS(SELECT 1 FROM public.varadhi_listings WHERE id=_id AND (stock_status='running' OR seller_id=auth.uid() OR _can)) THEN RAISE EXCEPTION 'Post unavailable'; END IF;
 IF _type='provider' AND NOT EXISTS(SELECT 1 FROM public.varadhi_providers WHERE id=_id AND (availability_status='online' OR user_id=auth.uid() OR _can)) THEN RAISE EXCEPTION 'Post unavailable'; END IF;
 INSERT INTO public.varadhi_post_reports(target_type,target_id,owner_id,title,reporter_id,reason,state,district,mandal) VALUES(_type,_id,_owner,_title,auth.uid(),trim(_reason),_state,_district,_mandal) ON CONFLICT(target_type,target_id,reporter_id) DO NOTHING;
 RETURN jsonb_build_object('ok',true);
 END IF;
 IF NOT _can THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT coalesce(nullif(p.full_name,''),u.email,'Vaaradhi Admin') INTO _name FROM auth.users u LEFT JOIN public.varadhi_profiles p ON p.user_id=u.id WHERE u.id=auth.uid();
 IF _action='remove' THEN
 IF _removed THEN RAISE EXCEPTION 'Post already removed'; END IF;
 INSERT INTO public.varadhi_post_removals(target_type,target_id,owner_id,title,reason,actor_id,actor_name,state,district,mandal) VALUES(_type,_id,_owner,_title,trim(_reason),auth.uid(),_name,_state,_district,_mandal);
 IF _type='listing' THEN UPDATE public.varadhi_listings SET stock_status='closed' WHERE id=_id; ELSE UPDATE public.varadhi_providers SET availability_status='offline' WHERE id=_id; END IF;
 END IF;
 UPDATE public.varadhi_post_reports SET status=CASE WHEN _action='remove' THEN 'removed' ELSE 'dismissed' END, review_reason=trim(_reason),reviewer_id=auth.uid(),reviewer_name=_name,reviewed_at=now() WHERE target_type=_type AND target_id=_id AND status='pending';
 RETURN jsonb_build_object('ok',true,'actor_name',_name);
END;
$$;
REVOKE ALL ON FUNCTION public.varadhi_moderate_post(text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varadhi_moderate_post(text,uuid,text,text) TO authenticated;
CREATE INDEX varadhi_reports_status_date ON public.varadhi_post_reports(status,created_at DESC);
CREATE INDEX varadhi_removals_owner ON public.varadhi_post_removals(owner_id);