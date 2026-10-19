import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Call only after validating the platform-admin role in the server handler.
export async function readAdminOrgMembers(client: Pick<SupabaseClient<Database>, "from">, orgId: string) {
  const members = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from("members")
      .select("id, name, member_code, status, email, phone, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    members.push(...page);
    if (page.length < pageSize) break;
  }
  return {
    members,
    counts: {
      total: members.length,
      approved: members.filter((m) => m.status === "approved").length,
      pending: members.filter((m) => m.status === "pending").length,
      rejected: members.filter((m) => m.status === "rejected").length,
    },
  };
}