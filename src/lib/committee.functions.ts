import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CommitteeRole =
  | "president"
  | "vice_president"
  | "advisor"
  | "treasurer"
  | "executive"
  | "worker";

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
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return m?.org_id ?? null;
}

async function isOrgAdmin(supabase: any, userId: string, orgId: string) {
  const { data } = await supabase
    .from("organizations")
    .select("admin_user_id")
    .eq("id", orgId)
    .maybeSingle();
  return data?.admin_user_id === userId;
}

async function isPresident(supabase: any, userId: string, orgId: string) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (!member) return false;
  const { data: cm } = await supabase
    .from("committee_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("member_id", member.id)
    .eq("role", "president")
    .eq("is_active", true)
    .maybeSingle();
  return !!cm;
}

export const listCommittee = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { committee: [], canManage: false, orgId: null, termYears: 2, orgName: null as string | null, myRole: null as CommitteeRole | null };

    const { data: cmRows } = await supabase
      .from("committee_members")
      .select("*, members(id, name, photo_url, email, phone, signature_url)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("position_number", { ascending: true });

    const { data: org } = await supabase
      .from("organizations")
      .select("committee_term_years, name")
      .eq("id", orgId)
      .maybeSingle();

    const admin = await isOrgAdmin(supabase, userId, orgId);
    const president = !admin ? await isPresident(supabase, userId, orgId) : false;

    // Find my role
    const { data: meMember } = await supabase
      .from("members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    let myRole: CommitteeRole | null = null;
    if (meMember) {
      const mine = (cmRows ?? []).find((r: any) => r.member_id === meMember.id);
      myRole = (mine?.role as CommitteeRole) ?? null;
    }

    return {
      committee: cmRows ?? [],
      canManage: admin || president,
      orgId,
      termYears: org?.committee_term_years ?? 2,
      orgName: (org?.name as string | null) ?? null,
      myRole,
    };
  });

export const listEligibleMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { members: [] };
    const { data: members } = await supabase
      .from("members")
      .select("id, name, photo_url, email, phone")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("name", { ascending: true });
    return { members: members ?? [] };
  });

export const appointCommitteeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      member_id: string;
      role: CommitteeRole;
      term_start_date: string;
      term_end_date: string;
      qualifications?: string;
      responsibilities?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");

    // Compute next position_number
    const { data: last } = await supabase
      .from("committee_members")
      .select("position_number")
      .eq("org_id", orgId)
      .order("position_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = ((last?.position_number as number | undefined) ?? 0) + 1;

    const { error } = await supabase.from("committee_members").insert({
      org_id: orgId,
      member_id: data.member_id,
      role: data.role,
      position_number: nextPos,
      term_start_date: data.term_start_date,
      term_end_date: data.term_end_date,
      qualifications: data.qualifications?.trim() || null,
      responsibilities: data.responsibilities?.trim() || null,
      is_active: true,
    });
    if (error) throw new Error(error.message);

    // Mark members.is_committee
    await supabase.from("members").update({ is_committee: true }).eq("id", data.member_id);
    return { ok: true };
  });

export const updateCommitteeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      role: CommitteeRole;
      term_start_date: string;
      term_end_date: string;
      qualifications?: string;
      responsibilities?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("committee_members")
      .update({
        role: data.role,
        term_start_date: data.term_start_date,
        term_end_date: data.term_end_date,
        qualifications: data.qualifications?.trim() || null,
        responsibilities: data.responsibilities?.trim() || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCommitteeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("committee_members")
      .select("member_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("committee_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.member_id) {
      await supabase.from("members").update({ is_committee: false }).eq("id", row.member_id);
    }
    return { ok: true };
  });

export const updateTermYears = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { years: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.years < 1 || data.years > 10) throw new Error("1-10 సంవత్సరాలు మాత్రమే");
    const { error } = await supabase
      .from("organizations")
      .update({ committee_term_years: data.years })
      .eq("admin_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; signature_url: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m } = await supabase
      .from("members")
      .select("org_id, user_id")
      .eq("id", data.member_id)
      .maybeSingle();
    if (!m) throw new Error("Member not found");
    const orgId = m.org_id as string;
    const admin = await isOrgAdmin(supabase, userId, orgId);
    const president = !admin ? await isPresident(supabase, userId, orgId) : false;
    const isSelf = m.user_id === userId;
    if (!admin && !president && !isSelf) throw new Error("Forbidden");
    const { error } = await supabase
      .from("members")
      .update({ signature_url: data.signature_url })
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
