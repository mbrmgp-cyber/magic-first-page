import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseDisciplinaryRole, type DisciplinaryRole } from "@/lib/disciplinary-roles";
import { resolveMemberPhoto } from "@/lib/member-photo";

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

async function canManage(supabase: any, userId: string, orgId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("admin_user_id")
    .eq("id", orgId)
    .maybeSingle();
  if (org?.admin_user_id === userId) return true;
  const { data: me } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (!me) return false;
  const { data: dcm } = await supabase
    .from("disciplinary_committee_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("member_id", me.id)
    .eq("is_active", true)
    .maybeSingle();
  return !!dcm;
}

export const getDisciplinaryOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { orgId: null, canManage: false, committee: [], suspensions: [], nominations: [], electionMode: false, members: [] };

    const [committeeRes, suspRes, nomRes, orgRes, membersRes] = await Promise.all([
      supabase
        .from("disciplinary_committee_members")
        .select("*, members(id, name, photo_url, member_code, email, phone)")
        .eq("org_id", orgId)
        .order("appointed_at", { ascending: true }),
      supabase
        .from("disciplinary_suspensions")
        .select("*, members(id, name, member_code, photo_url)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("disciplinary_president_nominations")
        .select("*, members(id, name, member_code, photo_url)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("organizations")
        .select("election_mode_enabled")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("members")
        .select("id, name, member_code, photo_url")
        .eq("org_id", orgId)
        .eq("status", "approved")
        .order("name", { ascending: true }),
    ]);

    // Storage paths are not browser URLs. Sign only photos read through this
    // caller's organization-scoped RLS queries, using their storage access.
    const photoCache = new Map<string, Promise<string | null>>();
    const withPhoto = async (member: any) => {
      if (!member?.photo_url) return member;
      const path = member.photo_url as string;
      let pending = photoCache.get(path);
      if (!pending) {
        pending = resolveMemberPhoto(supabase, path);
        photoCache.set(path, pending);
      }
      return { ...member, photo_url: await pending };
    };
    const withMemberPhotos = (rows: any[]) => Promise.all(rows.map(async (row) => ({
      ...row, members: await withPhoto(row.members),
    })));
    const [committee, suspensions, nominations, members] = await Promise.all([
      withMemberPhotos(committeeRes.data ?? []),
      withMemberPhotos(suspRes.data ?? []),
      withMemberPhotos(nomRes.data ?? []),
      Promise.all((membersRes.data ?? []).map(withPhoto)),
    ]);

    return {
      orgId,
      canManage: await canManage(supabase, userId, orgId),
      committee,
      suspensions,
      nominations,
      electionMode: !!(orgRes.data as any)?.election_mode_enabled,
      members,
    };
  });

export const appointDisciplinaryMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; role: DisciplinaryRole; notes?: string }) => ({
    ...d, role: parseDisciplinaryRole(d.role),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase.from("disciplinary_committee_members").insert({
      org_id: orgId,
      member_id: data.member_id,
      role: data.role,
      notes: data.notes ?? null,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeDisciplinaryMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase.from("disciplinary_committee_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const issueSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      target_member_id: string;
      reason: string;
      category?: "rule_violation" | "misuse" | "reputation_damage" | "financial_loss" | "other" | "minor" | "warning" | "major" | "severe" | "expulsion";
      effective_until?: string | null;
      notes?: string;
    }) => d,
  )

  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    if (!data.reason?.trim()) throw new Error("Reason is required");
    const { error } = await supabase.from("disciplinary_suspensions").insert({
      org_id: orgId,
      target_member_id: data.target_member_id,
      reason: data.reason.trim(),
      category: data.category ?? "rule_violation",
      effective_until: data.effective_until || null,
      notes: data.notes?.trim() || null,
      issued_by: userId,
      status: "active",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase
      .from("disciplinary_suspensions")
      .update({ status: "revoked", revoked_by: userId, revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberBehaviorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      target_member_id: string;
      color: "green" | "yellow" | "red";
      reason?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");

    // Revoke all currently-active suspensions for this member in this org.
    await supabase
      .from("disciplinary_suspensions")
      .update({ status: "revoked", revoked_by: userId, revoked_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("target_member_id", data.target_member_id)
      .eq("status", "active");

    let emailSent = false;
    let emailError: string | null = null;
    async function notifyMember() {
      try {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: data.target_member_id,
          subject: "MBR APP — Member status updated",
          label: "member_behavior_status_updated",
          note: "మీ సభ్యత్వ / Loan-Interest స్థితి అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.",
        });
        emailSent = sent.sent;
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
      }
    }

    if (data.color === "green") {
      await notifyMember();
      return { ok: true, emailSent, emailError };
    }

    const category = data.color === "yellow" ? "minor" : "major";
    const reason = (data.reason || "").trim() || (data.color === "yellow" ? "Minor behavior issue" : "Major behavior issue");
    const { error } = await supabase.from("disciplinary_suspensions").insert({
      org_id: orgId,
      target_member_id: data.target_member_id,
      reason,
      category,
      issued_by: userId,
      status: "active",
    });
    if (error) throw new Error(error.message);
    await notifyMember();
    return { ok: true, emailSent, emailError };
  });


export const nominatePresident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { candidate_member_id: string; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase.from("disciplinary_president_nominations").insert({
      org_id: orgId,
      candidate_member_id: data.candidate_member_id,
      nominated_by: userId,
      notes: data.notes?.trim() || null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const voteNomination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; direction: "for" | "against" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const col = data.direction === "for" ? "votes_for" : "votes_against";
    const { data: row } = await supabase
      .from("disciplinary_president_nominations")
      .select(col)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Nomination not found");
    const next = ((row as any)[col] ?? 0) + 1;
    const patch: any = { [col]: next };
    const { error } = await supabase
      .from("disciplinary_president_nominations")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideNomination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "approved" | "rejected" | "deadlocked" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase
      .from("disciplinary_president_nominations")
      .update({ status: data.status, decided_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setElectionMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!(await canManage(supabase, userId, orgId))) throw new Error("Forbidden");
    const { error } = await supabase
      .from("organizations")
      .update({ election_mode_enabled: data.enabled })
      .eq("id", orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
