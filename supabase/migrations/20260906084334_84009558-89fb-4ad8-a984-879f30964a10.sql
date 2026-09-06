
-- 1) members: hide bank account number + IFSC from row-level readers
REVOKE SELECT ON public.members FROM authenticated, anon;
GRANT SELECT (id, org_id, user_id, name, email, phone, photo_url, status, reviewed_at, created_at, updated_at, is_committee, father_name, address, joined_date, introducer_member_id, committee_fee_paid, is_active, member_code, blood_group, first_name, last_name, village, pin_code, bank_name, preferred_lang, member_code_locked, signature_url, introduced_by_name, introducer_id, membership_receipt_url) ON public.members TO authenticated;

-- 2) organizations: hide identity documents from members
REVOKE SELECT ON public.organizations FROM authenticated, anon;
GRANT SELECT (id, admin_user_id, name, email, phone, slogan, logo_url, org_code, created_at, updated_at, gov_reg_number, founders, approval_status, approval_notes, approved_at, approved_by, committee_term_years, letter_code, president_name, president_signature_url, is_gov_registered, bank_account_number, bank_ifsc, admin_name, admin_designation, theme_color, theme_font, theme_settings, id_card_design, subscription_expires_at, address, election_mode_enabled, ad_banners, name_en, donor_recognition_threshold, bank_name, bank_branch, bank_account_holder) ON public.organizations TO authenticated;

-- 3) varadhi_listings: hide exact address + contact phone from browsers
REVOKE SELECT ON public.varadhi_listings FROM authenticated, anon;
GRANT SELECT (id, seller_id, category, sub_category, title, description, price, unit, images, lat, lng, city, stock_status, click_count, created_at, updated_at, post_type, item_condition, pickup_location, village, mandal, taluk, district, state, pincode, experience, service_mode, service_timing, service_area, blood_group, stock_qty) ON public.varadhi_listings TO authenticated, anon;

-- 4) varadhi_profiles: hide identity documents from other users
REVOKE SELECT ON public.varadhi_profiles FROM authenticated, anon;
GRANT SELECT (user_id, full_name, phone, primary_role, business_name, address, city, lat, lng, store_photo_url, verification_status, verification_notes, created_at, updated_at, photo_url, mandal, district, state, provider_sub_type, vehicle_photo_url, experience_years, certificates_urls, provider_specialty, address_type, house_number, shop_name, occupation, referral_code_used, referred_partner_id) ON public.varadhi_profiles TO authenticated, anon;

-- 5) internal email-queue SECURITY DEFINER functions are not client-callable
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

NOTIFY pgrst, 'reload schema';
