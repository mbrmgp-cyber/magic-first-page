-- 1. Listing images bucket: signed-in users only
DROP POLICY IF EXISTS "vl_listings_read" ON storage.objects;
CREATE POLICY "vl_listings_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'varadhi-listings');

-- 2. varadhi_profiles: hide identity documents & review notes from ordinary users
REVOKE SELECT ON public.varadhi_profiles FROM authenticated, anon;
GRANT SELECT (
  user_id, full_name, phone, primary_role, business_name, address, city, lat, lng,
  store_photo_url, verification_status, created_at, updated_at, photo_url,
  mandal, district, state, provider_sub_type, vehicle_photo_url, experience_years,
  provider_specialty, address_type, house_number, shop_name, occupation,
  referral_code_used, referred_partner_id
) ON public.varadhi_profiles TO authenticated;
GRANT ALL ON public.varadhi_profiles TO service_role;

-- 3. varadhi_listings: hide precise street address & raw contact number from browsing
REVOKE SELECT ON public.varadhi_listings FROM authenticated, anon;
GRANT SELECT (
  id, seller_id, category, sub_category, title, description, price, unit, images,
  lat, lng, city, stock_status, click_count, created_at, updated_at, post_type,
  item_condition, pickup_location, village, mandal, taluk, district, state, pincode,
  experience, service_mode, service_timing, service_area, blood_group, stock_qty
) ON public.varadhi_listings TO authenticated;
GRANT ALL ON public.varadhi_listings TO service_role;