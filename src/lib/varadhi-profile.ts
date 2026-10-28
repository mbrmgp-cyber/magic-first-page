import { z } from "zod";

const text = z.string().trim().max(1000).nullable().optional();
export const profileEditSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  phone: z.string().trim().min(10).max(20).nullable().optional(),
  primary_role: z.enum(["seller", "buyer", "provider"]).optional(),
  business_name: text, address: text, city: text,
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  store_photo_url: text, photo_url: text, aadhaar_url: text, license_url: text,
  mandal: text, district: text, state: text, provider_sub_type: text,
  vehicle_photo_url: text, experience_years: z.number().int().min(0).max(100).nullable().optional(),
  certificates_urls: z.array(z.string().max(1000)).max(30).optional(),
  provider_specialty: text, address_type: text, house_number: text, shop_name: text,
  occupation: text, referral_code_used: text, referred_partner_id: z.string().uuid().nullable().optional(),
});
export const adminProfileEditSchema = z.object({ user_id: z.string().uuid(), changes: profileEditSchema });
export function isProfileLocked(status: string | null | undefined) { return status === "approved"; }
export function registrationComplete(form: { full_name: string; phone: string; aadhaar_url: string; house_number: string; city: string; mandal: string; district: string; state: string; occupation: string }, other: string) {
  return !!form.full_name.trim() && !!form.aadhaar_url && form.phone.trim().length >= 10 &&
    [form.house_number, form.city, form.mandal, form.district, form.state, form.occupation].every(v => !!v.trim()) &&
    (form.occupation !== "ఇతర" || !!other.trim());
}