// Profile villages are stored in city; village exists only on listings.
export const POINT_PROFILE_COLUMNS = "user_id, full_name, phone, primary_role, city, mandal, district, state, verification_status";

export async function readPointProfiles(sb: any, filters: { state?: string; district?: string; mandal?: string; q?: string }) {
  let query = sb.from("varadhi_profiles").select(POINT_PROFILE_COLUMNS).limit(2000);
  if (filters.state) query = query.eq("state", filters.state);
  if (filters.district) query = query.eq("district", filters.district);
  if (filters.mandal) query = query.eq("mandal", filters.mandal);
  const term = (filters.q ?? "").replace(/[(),."\\%]/g, "").trim().slice(0, 80);
  if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}