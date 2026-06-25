import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getMyApprovedMember(supabase: any, userId: string) {
  const { data } = await supabase
    .from("members")
    .select("id, org_id, name, member_code, email")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function getAdminOrgId(supabase: any, userId: string) {
  const { data: o } = await supabase
    .from("organizations").select("id").eq("admin_user_id", userId).maybeSingle();
  if (o?.id) return o.id as string;
  const { data: m } = await supabase
    .from("members").select("org_id").eq("user_id", userId).eq("status", "approved")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (m?.org_id as string) ?? null;
}

export const submitLoanRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    requested_amount: number;
    reason: string;
    tenure_months?: number;
    surety_member_code?: string;
    signature_data_url?: string;
    proof_url?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const me = await getMyApprovedMember(supabase, userId);
    if (!me) throw new Error("Approved membership not found");
    if (!(data.requested_amount > 0)) throw new Error("Amount must be greater than zero");
    if (!data.reason?.trim()) throw new Error("Reason is required");
    if (!data.signature_data_url) throw new Error("Signature is required");

    let surety_member_id: string | null = null;
    if (data.surety_member_code?.trim()) {
      const code = data.surety_member_code.trim().toUpperCase();
      const { data: s } = await supabase
        .from("members").select("id")
        .eq("org_id", me.org_id).eq("member_code", code).maybeSingle();
      if (!s?.id) throw new Error("Surety member ID not found in this society");
      if (s.id === me.id) throw new Error("You cannot be your own surety");
      surety_member_id = s.id;
    }

    const { error } = await supabase.from("member_loan_requests").insert({
      org_id: me.org_id,
      member_id: me.id,
      requested_amount: data.requested_amount,
      reason: data.reason,
      tenure_months: data.tenure_months ?? null,
      surety_member_code: data.surety_member_code ?? null,
      surety_member_id,
      signature_data_url: data.signature_data_url,
      proof_url: data.proof_url ?? null,
      surety_status: surety_member_id ? "awaiting" : "not_required",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// --- Surety consent flow ---
export const listSuretyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const me = await getMyApprovedMember(supabase, userId);
    if (!me) return { requests: [] };
    const { data } = await supabase
      .from("member_loan_requests")
      .select("*, member:members!member_loan_requests_member_id_fkey(id, name, member_code, photo_url, phone)")
      .eq("surety_member_id", me.id)
      .order("created_at", { ascending: false });
    return { requests: data ?? [] };
  });

export const respondAsSurety = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    request_id: string;
    decision: "accepted" | "declined";
    signature_data_url?: string;
    decline_reason?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const me = await getMyApprovedMember(supabase, userId);
    if (!me) throw new Error("Approved membership not found");
    if (data.decision === "accepted" && !data.signature_data_url) {
      throw new Error("Signature required to accept surety");
    }
    const update: any = {
      surety_status: data.decision,
      surety_responded_at: new Date().toISOString(),
    };
    if (data.decision === "accepted") update.surety_signature_url = data.signature_data_url;
    if (data.decision === "declined") update.surety_decline_reason = data.decline_reason ?? null;

    const { error } = await supabase
      .from("member_loan_requests")
      .update(update)
      .eq("id", data.request_id)
      .eq("surety_member_id", me.id)
      .eq("surety_status", "awaiting");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyLoanRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const me = await getMyApprovedMember(supabase, userId);
    if (!me) return { requests: [] };
    const { data } = await supabase
      .from("member_loan_requests").select("*")
      .eq("member_id", me.id)
      .order("created_at", { ascending: false });
    return { requests: data ?? [] };
  });

export const listOrgLoanRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await getAdminOrgId(supabase, userId);
    if (!orgId) return { requests: [] };
    const { data } = await supabase
      .from("member_loan_requests")
      .select("*, member:members!member_loan_requests_member_id_fkey(id, name, member_code, photo_url, phone), surety:members!member_loan_requests_surety_member_id_fkey(id, name, member_code)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    return { requests: data ?? [] };
  });

export const approveLoanRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    request_id: string;
    utr_number: string;
    payment_date: string;
    interest_rate_monthly?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req, error: rerr } = await supabase
      .from("member_loan_requests").select("*").eq("id", data.request_id).maybeSingle();
    if (rerr || !req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already processed");
    if (req.surety_member_id && req.surety_status !== "accepted") {
      throw new Error("Cannot approve until the surety member consents");
    }
    if (!data.utr_number?.trim()) throw new Error("UTR number required");

    const rate = data.interest_rate_monthly ?? req.interest_rate_monthly ?? 2.0;

    const { data: loan, error: lerr } = await supabase.from("member_loans").insert({
      org_id: req.org_id,
      member_id: req.member_id,
      principal: req.requested_amount,
      interest_rate_monthly: rate,
      start_date: data.payment_date,
      purpose: `${req.reason}${data.utr_number ? ` (UTR: ${data.utr_number})` : ""}`,
    }).select("id").single();
    if (lerr) throw new Error(lerr.message);

    const { error: uerr } = await supabase
      .from("member_loan_requests")
      .update({
        status: "approved",
        utr_number: data.utr_number,
        payment_date: data.payment_date,
        interest_rate_monthly: rate,
        approved_loan_id: loan!.id,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.request_id);
    if (uerr) throw new Error(uerr.message);

    return { ok: true as const, loan_id: loan!.id };
  });

export const rejectLoanRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { request_id: string; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("member_loan_requests")
      .update({
        status: "rejected",
        reject_reason: data.reason ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.request_id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
