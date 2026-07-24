import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
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

export const submitLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reason = (data.reason || "").trim();
    if (reason.length < 5) throw new Error("Please provide a reason (min 5 characters)");

    const { data: me, error: meErr } = await supabase
      .from("members")
      .select("id, org_id")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Membership not found");

    const { data: existing } = await supabase
      .from("member_leave_requests")
      .select("id")
      .eq("member_id", me.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("You already have a pending leave request");

    const { error } = await supabase.from("member_leave_requests").insert({
      org_id: me.org_id,
      member_id: me.id,
      user_id: userId,
      reason,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyLeaveRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("member_leave_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: data ?? null };
  });

export const cancelMyLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("member_leave_requests")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOrgLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { requests: [] };
    const { data, error } = await supabase
      .from("member_leave_requests")
      .select("*, members(id, name, member_code, photo_url, phone, email)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

export const approveLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("approve_leave_request", {
      _request_id: data.id,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("reject_leave_request", {
      _request_id: data.id,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
