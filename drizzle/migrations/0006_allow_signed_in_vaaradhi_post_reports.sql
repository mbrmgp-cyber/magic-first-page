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
 IF _type='listing' AND NOT EXISTS(SELECT 1 FROM public.varadhi_listings WHERE id=_id AND (stock_status='running' OR seller_id=auth.uid() OR _can)) THEN RAISE EXCEPTION 'Post unavailable'; END IF;
 IF _type='provider' AND NOT EXISTS(SELECT 1 FROM public.varadhi_providers WHERE id=_id AND (availability_status='online' OR user_id=auth.uid() OR _can)) THEN RAISE EXCEPTION 'Post unavailable'; END IF;
 INSERT INTO public.varadhi_post_reports(target_type,target_id,owner_id,title,reporter_id,reason,state,district,mandal) VALUES(_type,_id,_owner,_title,auth.uid(),trim(_reason),_state,_district,_mandal) ON CONFLICT(target_type,target_id,reporter_id) DO NOTHING;
 RETURN jsonb_build_object('ok',true);
 END IF;
 IF NOT _can THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT coalesce(nullif(p.full_name,''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),split_part(u.email,'@',1),'Vaaradhi Admin') INTO _name FROM auth.users u LEFT JOIN public.varadhi_profiles p ON p.user_id=u.id WHERE u.id=auth.uid();
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