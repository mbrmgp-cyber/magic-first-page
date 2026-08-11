const BOOTSTRAP_ADMINS = ["mbrvaradhi@yahoo.com", "mbrproduct@gmail.com"];

export async function assertVaradhiAdminClient(userId: string, email?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "varadhi_admin")
    .maybeSingle();
  if (roleRow) return supabaseAdmin;
  const mail = (email ?? "").trim().toLowerCase();
  if (mail && BOOTSTRAP_ADMINS.includes(mail)) return supabaseAdmin;
  throw new Error("Forbidden: Varadhi Admin only");
}

export function buildReferralCode(level: string, area: string) {
  return `${level[0]!.toUpperCase()}${(area || "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 4)
    .toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
}
