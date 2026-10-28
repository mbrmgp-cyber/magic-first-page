CREATE OR REPLACE FUNCTION public.varadhi_guard_profile_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    IF current_setting('role', true) = 'service_role' OR session_user IN ('postgres','supabase_admin') THEN
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sign in required';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status <> 'pending' OR NEW.verification_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can approve profiles';
    END IF;
    RETURN NEW;
  END IF;
  allowed := public.varadhi_can_moderate_area(OLD.state, OLD.district, OLD.mandal);
  IF TG_OP = 'DELETE' THEN
    IF OLD.verification_status = 'approved' AND NOT allowed THEN RAISE EXCEPTION 'Approved profiles are locked'; END IF;
    RETURN OLD;
  END IF;
  IF NOT allowed THEN
    IF OLD.verification_status = 'approved' THEN RAISE EXCEPTION 'Approved profiles can only be edited by admins'; END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR NEW.verification_notes IS DISTINCT FROM OLD.verification_notes THEN RAISE EXCEPTION 'Only admins can approve profiles'; END IF;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Profile ownership cannot change'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER varadhi_profile_approval_guard BEFORE INSERT OR UPDATE OR DELETE ON public.varadhi_profiles FOR EACH ROW EXECUTE FUNCTION public.varadhi_guard_profile_changes();

CREATE OR REPLACE FUNCTION public.varadhi_admin_edit_profile(_user_id uuid, _changes jsonb)
RETURNS public.varadhi_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.varadhi_profiles; proposed public.varadhi_profiles; result public.varadhi_profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO old_row FROM public.varadhi_profiles WHERE user_id = _user_id FOR UPDATE;
  IF old_row.user_id IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF NOT public.varadhi_can_moderate_area(old_row.state,old_row.district,old_row.mandal) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _changes IS NULL OR jsonb_typeof(_changes) <> 'object' THEN RAISE EXCEPTION 'Invalid profile details'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_changes) k WHERE k NOT IN ('full_name','phone','primary_role','business_name','address','city','lat','lng','store_photo_url','photo_url','aadhaar_url','license_url','mandal','district','state','provider_sub_type','vehicle_photo_url','experience_years','certificates_urls','provider_specialty','address_type','house_number','shop_name','occupation','referral_code_used','referred_partner_id')) THEN RAISE EXCEPTION 'Field cannot be edited'; END IF;
  SELECT * INTO proposed FROM jsonb_populate_record(old_row, _changes);
  IF NOT public.varadhi_can_moderate_area(proposed.state,proposed.district,proposed.mandal) THEN RAISE EXCEPTION 'Profile must remain in your area'; END IF;
  IF length(trim(proposed.full_name)) NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF proposed.phone IS NOT NULL AND length(trim(proposed.phone)) NOT BETWEEN 10 AND 20 THEN RAISE EXCEPTION 'Invalid phone number'; END IF;
  UPDATE public.varadhi_profiles SET
    full_name=proposed.full_name, phone=proposed.phone, primary_role=proposed.primary_role,
    business_name=proposed.business_name, address=proposed.address, city=proposed.city, lat=proposed.lat, lng=proposed.lng,
    store_photo_url=proposed.store_photo_url, photo_url=proposed.photo_url, aadhaar_url=proposed.aadhaar_url, license_url=proposed.license_url,
    mandal=proposed.mandal,district=proposed.district,state=proposed.state,provider_sub_type=proposed.provider_sub_type,
    vehicle_photo_url=proposed.vehicle_photo_url,experience_years=proposed.experience_years,certificates_urls=proposed.certificates_urls,
    provider_specialty=proposed.provider_specialty,address_type=proposed.address_type,house_number=proposed.house_number,
    shop_name=proposed.shop_name,occupation=proposed.occupation,referral_code_used=proposed.referral_code_used,referred_partner_id=proposed.referred_partner_id,updated_at=now()
  WHERE user_id=_user_id RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.varadhi_admin_edit_profile(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varadhi_admin_edit_profile(uuid,jsonb) TO authenticated,service_role;