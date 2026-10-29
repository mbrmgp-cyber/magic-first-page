import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { ACTIVE_ORG_HEADER } from "@/lib/active-org";

// Canonical list of modules the Super Admin can toggle per admin.
// Keys are stable strings stored in admin_module_access.modules.
export const ADMIN_MODULES = [
  { key: "rules",        route: "/org/rules",         en: "Rules & History",        te: "నియమావళి & చరిత్ర" },
  { key: "members",      route: "/org/members",       en: "Members & Registration", te: "సభ్యులు & నమోదు" },
  { key: "committee",    route: "/org/committee",     en: "Executive Committee",    te: "కార్యనిర్వాహక కమిటీ" },
  { key: "events",       route: "/org/events",        en: "Events & Meetings",      te: "సమావేశాలు & నిర్ణయాలు" },
  { key: "designs",      route: "/org/designs",       en: "ID Cards & Designs",     te: "ID కార్డులు, డిజైన్" },
  { key: "accounts",     route: "/org/accounts-hub",  en: "Accounts Hub",           te: "అకౌంట్స్ బాక్స్" },
  { key: "chat",         route: "/org/chat",          en: "Member Chat",            te: "సభ్యులతో చాటింగ్" },
  { key: "elections",    route: "/org/elections",     en: "Board Elections",        te: "బోర్డు ఎన్నికలు" },
  { key: "auction",      route: "/org/auction",       en: "Live Chit Auction",      te: "లైవ్ చిట్ ఆక్షన్" },
  { key: "disciplinary", route: "/org/disciplinary",  en: "Disciplinary Committee", te: "క్రమశిక్షణా కమిటీ" },
  { key: "bank_details", route: "/org/bank-details",  en: "Society Bank Details",   te: "సొసైటీ బ్యాంక్ వివరాలు" },
  { key: "theme",        route: "/org/theme",         en: "Theme & Branding",       te: "థీమ్ & బ్రాండింగ్" },
] as const;

export type AdminModuleKey = (typeof ADMIN_MODULES)[number]["key"];
export type AdminPreset = "president" | "treasurer" | "custom";

export const PRESET_MODULES: Record<Exclude<AdminPreset, "custom">, AdminModuleKey[]> = {
  // President: everything EXCEPT the Disciplinary module.
  president: ADMIN_MODULES.map((m) => m.key).filter((k) => k !== "disciplinary") as AdminModuleKey[],
  // Treasurer: only Accounts Hub + Live Chits.
  treasurer: ["accounts", "auction"],
};

async function resolveOrg(supabase: any, userId: string): Promise<string | null> {
  const picked = getRequest().headers.get(ACTIVE_ORG_HEADER);
  if (picked) {
    const { data: org, error: orgError } = await supabase.from("organizations")
      .select("id, admin_user_id").eq("id", picked).maybeSingle();
    if (orgError) throw new Error(orgError.message);
    if (org?.admin_user_id === userId) return picked;
    const { data: member, error: memberError } = await supabase.from("members")
      .select("id").eq("org_id", picked).eq("user_id", userId).eq("status", "approved").eq("is_active", true).maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member) return null;
    const { data: seat, error: seatError } = await supabase.from("committee_members")
      .select("id").eq("org_id", picked).eq("member_id", member.id).eq("is_active", true).limit(1);
    if (seatError) throw new Error(seatError.message);
    return seat?.length ? picked : null;
  }
  const { data: own } = await supabase
    .from("organizations")
    .select("id")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (own?.id) return own.id;
  const { data: m } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return m?.org_id ?? null;
}

// Returns the effective module list for the signed-in user.
// - Society admin (founder) => isSuperAdmin true, all modules.
// - Committee member with an admin_module_access row => that row's modules.
// - Anyone else => empty list (no admin tiles).
export const getMyModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrg(supabase, userId);
    if (!orgId) return { orgId: null, isSuperAdmin: false, modules: [] as AdminModuleKey[], preset: null as AdminPreset | null };
    const { data: org } = await supabase
      .from("organizations")
      .select("admin_user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (org?.admin_user_id === userId) {
      return {
        orgId,
        isSuperAdmin: true,
        modules: ADMIN_MODULES.map((m) => m.key) as AdminModuleKey[],
        preset: null as AdminPreset | null,
      };
    }
    const { data: row } = await supabase
      .from("admin_module_access")
      .select("modules, preset")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    return {
      orgId,
      isSuperAdmin: false,
      modules: ((row?.modules as AdminModuleKey[]) ?? []),
      preset: ((row?.preset as AdminPreset) ?? null),
    };
  });

// Super-admin only: list committee members and their current permission rows,
// so the management screen can render checkboxes per person.
export const listOrgAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrg(supabase, userId);
    if (!orgId) return { orgId: null, rows: [] as any[] };
    const { data: org } = await supabase
      .from("organizations")
      .select("admin_user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (org?.admin_user_id !== userId) throw new Error("Only the founder / Super Admin can manage admin access");

    // All active committee seats in this org, with the member profile.
    const { data: cmRows } = await supabase
      .from("committee_members")
      .select("id, role, member_id, members(id, name, email, photo_url, user_id)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("position_number", { ascending: true });

    const users = (cmRows ?? [])
      .map((r: any) => r.members?.user_id)
      .filter(Boolean) as string[];

    let accessByUser = new Map<string, { modules: AdminModuleKey[]; preset: AdminPreset }>();
    if (users.length) {
      const { data: perms } = await supabase
        .from("admin_module_access")
        .select("user_id, modules, preset")
        .eq("org_id", orgId)
        .in("user_id", users);
      for (const p of perms ?? []) {
        accessByUser.set(p.user_id as string, {
          modules: (p.modules as AdminModuleKey[]) ?? [],
          preset: (p.preset as AdminPreset) ?? "custom",
        });
      }
    }

    const rows = (cmRows ?? []).map((r: any) => {
      const uid = r.members?.user_id as string | undefined;
      const access = uid ? accessByUser.get(uid) : undefined;
      return {
        committee_id: r.id,
        committee_role: r.role,
        member_id: r.member_id,
        user_id: uid ?? null,
        name: r.members?.name ?? "",
        email: r.members?.email ?? "",
        photo_url: r.members?.photo_url ?? null,
        modules: access?.modules ?? [],
        preset: access?.preset ?? null,
        has_login: !!uid,
      };
    });

    return { orgId, rows };
  });

export const setAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; modules: string[]; preset: AdminPreset }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrg(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const { data: org } = await supabase
      .from("organizations")
      .select("admin_user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (org?.admin_user_id !== userId) throw new Error("Only Super Admin can grant access");

    const validKeys = new Set(ADMIN_MODULES.map((m) => m.key));
    const clean = Array.from(new Set(data.modules.filter((k) => validKeys.has(k as AdminModuleKey))));

    const { error } = await supabase
      .from("admin_module_access")
      .upsert(
        {
          org_id: orgId,
          user_id: data.user_id,
          preset: data.preset,
          modules: clean,
          granted_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrg(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const { data: org } = await supabase
      .from("organizations")
      .select("admin_user_id")
      .eq("id", orgId)
      .maybeSingle();
    if (org?.admin_user_id !== userId) throw new Error("Only Super Admin can revoke access");
    const { error } = await supabase
      .from("admin_module_access")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
