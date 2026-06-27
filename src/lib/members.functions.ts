import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Helper: org admin or committee president/treasurer/VP (treasurer can edit accounts)
async function getOrgForUser(supabase: any, userId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("admin_user_id", userId)
    .maybeSingle();
  if (org) return org.id as string;
  const { data: m } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  return (m?.org_id as string) ?? null;
}

export const listOrgMembersFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await getOrgForUser(supabase, userId);
    if (!orgId) return { members: [], orgId: null, org: null };
    const { data, error } = await supabase
      .from("members")
      .select("*, introducer:introducer_member_id(id,name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, logo_url, letter_code, gov_reg_number, slogan, phone, email, president_name, president_signature_url")
      .eq("id", orgId)
      .maybeSingle();
    return { members: data ?? [], orgId, org };
  });

export const listApprovedMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await getOrgForUser(supabase, userId);
    if (!orgId) return { members: [] };
    const { data } = await supabase
      .from("members")
      .select("id, name")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("name");
    return { members: data ?? [] };
  });

export const adminAddMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    email: string;
    phone?: string | null;
    father_name?: string | null;
    address?: string | null;
    joined_date?: string | null;
    introducer_member_id?: string | null;
    committee_fee_paid?: number | null;
    photo_url?: string | null;
    is_active?: boolean;
    status?: "pending" | "approved";
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await getOrgForUser(supabase, userId);
    if (!orgId) throw new Error("Organization కనపడలేదు");
    const { data: row, error } = await supabase.from("members").insert({
      org_id: orgId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      father_name: data.father_name ?? null,
      address: data.address ?? null,
      joined_date: data.joined_date ?? null,
      introducer_member_id: data.introducer_member_id ?? null,
      committee_fee_paid: data.committee_fee_paid ?? 0,
      photo_url: data.photo_url ?? null,
      is_active: data.is_active ?? true,
      status: data.status ?? "approved",
    }).select("id").single();
    if (error) throw new Error(error.message);

    // Send welcome / login link email to the new member (best-effort).
    let emailSent = false;
    let emailError: string | null = null;
    const email = (data.email || "").trim().toLowerCase();
    if (email && (data.status ?? "approved") === "approved") {
      try {
        const { sendMemberWelcomeEmail } = await import("@/lib/org.functions");
        await sendMemberWelcomeEmail({ data: { email, name: data.name, member_id: row!.id } });
        emailSent = true;
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
      }
    }
    return { ok: true, id: row?.id, orgId, emailSent, emailError };
  });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("members").delete().eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    member_id: string;
    father_name?: string | null;
    address?: string | null;
    phone?: string | null;
    joined_date?: string | null;
    introducer_member_id?: string | null;
    committee_fee_paid?: number | null;
    photo_url?: string | null;
    is_active?: boolean;
    blood_group?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { member_id, ...patch } = data;
    const { error } = await supabase.from("members").update(patch as any).eq("id", member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("members")
      .update({ is_active: data.is_active }).eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const orgUpdateMemberCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; new_code: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("org_admin_update_member_code", {
      _member_id: data.member_id,
      _new_code: data.new_code,
    });
    if (error) throw new Error(error.message);
    return { ok: true, member: row };
  });




// ===== Loans =====

export const listMemberLoans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loans, error } = await supabase
      .from("member_loans")
      .select("*")
      .eq("member_id", data.member_id)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    const withSummary = await Promise.all(
      (loans ?? []).map(async (loan: any) => {
        const { data: s } = await supabase.rpc("get_loan_summary", { _loan_id: loan.id });
        return { ...loan, summary: Array.isArray(s) ? s[0] : s };
      })
    );
    return { loans: withSummary };
  });

export const listLoanPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pays, error } = await supabase
      .from("member_loan_payments")
      .select("*")
      .eq("loan_id", data.loan_id)
      .order("payment_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { payments: pays ?? [] };
  });

export const addMemberLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    org_id: string;
    member_id: string;
    principal: number;
    interest_rate_monthly: number;
    start_date: string;
    purpose?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("member_loans").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addLoanPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    loan_id: string;
    org_id: string;
    amount: number;
    payment_date: string;
    notes?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("member_loan_payments").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const closeLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("member_loans")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", data.loan_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("member_loans").delete().eq("id", data.loan_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
