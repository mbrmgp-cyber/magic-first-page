import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Resolve the org the current user belongs to (as admin OR member).
async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data: ownOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (ownOrg?.id) return ownOrg.id;
  const { data: m } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return m?.org_id ?? null;
}

async function canEdit(supabase: any, userId: string, orgId: string): Promise<boolean> {
  const { data: org } = await supabase
    .from("organizations")
    .select("admin_user_id")
    .eq("id", orgId)
    .maybeSingle();
  if (org?.admin_user_id === userId) return true;
  const { data: m } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("is_committee", true)
    .eq("status", "approved")
    .maybeSingle();
  return !!m;
}

// ===== Rules =====

export const listRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { rules: [], canEdit: false, orgId: null, orgName: null as string | null };
    const { data } = await supabase
      .from("org_rules")
      .select("*")
      .eq("org_id", orgId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    const editable = await canEdit(supabase, userId, orgId);
    const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
    return { rules: data ?? [], canEdit: editable, orgId, orgName: (org?.name as string | null) ?? null };
  });

export const addRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; category?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const { data: last } = await supabase
      .from("org_rules")
      .select("position")
      .eq("org_id", orgId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = ((last?.position as number | undefined) ?? 0) + 1;
    const { error } = await supabase.from("org_rules").insert({
      org_id: orgId,
      text: data.text.trim(),
      category: data.category?.trim() || null,
      position: nextPos,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; text: string; category?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("org_rules")
      .update({ text: data.text.trim(), category: data.category?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("org_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Milestones (History timeline) =====

export const listMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { milestones: [], canEdit: false, orgId: null, orgName: null as string | null };
    const { data } = await supabase
      .from("org_milestones")
      .select("*")
      .eq("org_id", orgId)
      .order("event_date", { ascending: true });
    const editable = await canEdit(supabase, userId, orgId);
    const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
    return { milestones: data ?? [], canEdit: editable, orgId, orgName: (org?.name as string | null) ?? null };
  });

export const addMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { event_date: string; title: string; description?: string; photo_url?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const { error } = await supabase.from("org_milestones").insert({
      org_id: orgId,
      event_date: data.event_date,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      photo_url: data.photo_url || null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; event_date: string; title: string; description?: string; photo_url?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("org_milestones")
      .update({
        event_date: data.event_date,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        photo_url: data.photo_url || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("org_milestones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
