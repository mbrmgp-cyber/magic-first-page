import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeOrgCode } from "@/lib/org-code";
import { hasShareAccess, shareDestination } from "@/lib/organization-share";
import type { Database } from "@/integrations/supabase/types";

export const getOrganizationShareBranding = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => ({ code: sanitizeOrgCode(data.code) }))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const client = createClient<Database>(process.env['SUPABASE_URL']!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: rows, error } = await client.rpc("organization_share_branding", { _code: data.code });
    if (error) throw new Error("Could not load society information");
    return rows?.[0] ?? null;
  });

export const resolveOrganizationShareAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId: string; destination: string }) => ({ orgId: data.orgId, destination: shareDestination(data.destination) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org, error } = await supabase.from("organizations")
      .select("id, admin_user_id, approval_status").eq("id", data.orgId).maybeSingle();
    if (error) throw new Error("Could not check society access");
    if (!org || org.approval_status !== "approved") return { allowed: false };
    if (org.admin_user_id === userId) return { allowed: data.destination !== "register" };
    const { data: member, error: memberError } = await supabase.from("members")
      .select("id").eq("org_id", data.orgId).eq("user_id", userId)
      .eq("status", "approved").eq("is_active", true).maybeSingle();
    if (memberError) throw new Error("Could not check membership");
    if (!member) return { allowed: false };
    const [{ data: seats, error: seatError }, { data: permission, error: permissionError }] = await Promise.all([
      supabase.from("committee_members").select("id").eq("org_id", data.orgId).eq("member_id", member.id).eq("is_active", true).limit(1),
      supabase.from("admin_module_access").select("modules").eq("org_id", data.orgId).eq("user_id", userId).maybeSingle(),
    ]);
    if (seatError || permissionError) throw new Error("Could not check page permissions");
    return { allowed: hasShareAccess({ owner: false, activeMember: true, committee: !!seats?.length, modules: permission?.modules ?? [] }, data.destination) };
  });