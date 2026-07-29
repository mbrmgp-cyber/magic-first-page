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
      .select("id, name, member_code")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("member_code", { ascending: true });
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
    introduced_by_name?: string | null;
    introducer_id?: string | null;
    committee_fee_paid?: number | null;
    photo_url?: string | null;
    membership_receipt_url?: string | null;
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
      introduced_by_name: data.introduced_by_name ?? null,
      introducer_id: data.introducer_id ?? null,
      committee_fee_paid: data.committee_fee_paid ?? 0,
      photo_url: data.photo_url ?? null,
      membership_receipt_url: data.membership_receipt_url ?? null,
      is_active: data.is_active ?? true,
      status: data.status ?? "approved",
    } as any).select("id").single();
    if (error) throw new Error(error.message);

    // Send welcome / login link email to the new member (best-effort).
    let emailSent = false;
    let emailError: string | null = null;
    const email = (data.email || "").trim().toLowerCase();
    if (email && row?.id && (data.status ?? "approved") === "approved") {
      try {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: row.id,
          subject: "MBR APP — Member dashboard login link",
          label: "member_admin_added",
          note: `${data.name}, మీ సభ్యత్వ వివరాలు అడ్మిన్ సేవ్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.`,
        });
        emailSent = sent.sent;
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
    name?: string | null;
    father_name?: string | null;
    address?: string | null;
    phone?: string | null;
    joined_date?: string | null;
    introducer_member_id?: string | null;
    introduced_by_name?: string | null;
    introducer_id?: string | null;
    committee_fee_paid?: number | null;
    photo_url?: string | null;
    membership_receipt_url?: string | null;
    is_active?: boolean;
    blood_group?: string | null;
    send_login_link?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { member_id, send_login_link = true, ...patch } = data;
    const { error } = await supabase.from("members").update(patch as any).eq("id", member_id);
    if (error) throw new Error(error.message);
    // Best-effort: notify the member via a magic login link that their profile was updated.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { data: m } = await supabase
        .from("members")
        .select("email, name, status")
        .eq("id", member_id)
        .maybeSingle();
      const email = (m?.email || "").trim().toLowerCase();
      if (send_login_link && email && m?.status === "approved") {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: member_id,
          subject: "MBR APP — Your profile was updated",
          label: "member_profile_updated",
          note: `${(patch as any).name ?? m?.name ?? "సభ్యుడు"}, మీ ప్రొఫైల్ వివరాలు అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.`,
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
  });



export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member_id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("members")
      .update({ is_active: data.is_active }).eq("id", data.member_id);
    if (error) throw new Error(error.message);
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { data: m } = await supabase
        .from("members")
        .select("email, name, status")
        .eq("id", data.member_id)
        .maybeSingle();
      const email = (m?.email || "").trim().toLowerCase();
      if (email && m?.status === "approved") {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: data.member_id,
          subject: "MBR APP — Membership status updated",
          label: "member_status_updated",
          note: `${m?.name ?? "సభ్యుడు"}, మీ సభ్యత్వ స్థితి అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.`,
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
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
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const email = ((row as any)?.email || "").trim().toLowerCase();
      if (email && (row as any)?.status === "approved") {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: (row as any).id,
          subject: "MBR APP — Member ID updated",
          label: "member_id_updated",
          note: `${(row as any)?.name ?? "సభ్యుడు"}, మీ మెంబర్ ID అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.`,
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, member: row, emailSent, emailError };
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
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
      const sent = await sendMemberDashboardMagicLink({
        memberId: data.member_id,
        subject: "MBR APP — Loan / Interest details updated",
        label: "member_loan_updated",
        note: "మీ Loan / Interest వివరాలు అడ్మిన్ సేవ్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.",
      });
      emailSent = sent.sent;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
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
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { data: loan } = await supabase
        .from("member_loans")
        .select("member_id")
        .eq("id", data.loan_id)
        .maybeSingle();
      if ((loan as any)?.member_id) {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: (loan as any).member_id,
          subject: "MBR APP — Loan payment updated",
          label: "member_loan_payment_updated",
          note: "మీ Loan / Interest payment వివరాలు అడ్మిన్ సేవ్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.",
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
  });

export const closeLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loan } = await supabase
      .from("member_loans")
      .select("member_id")
      .eq("id", data.loan_id)
      .maybeSingle();
    const { error } = await supabase
      .from("member_loans")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", data.loan_id);
    if (error) throw new Error(error.message);
    let emailSent = false;
    let emailError: string | null = null;
    try {
      if ((loan as any)?.member_id) {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: (loan as any).member_id,
          subject: "MBR APP — Loan closed",
          label: "member_loan_closed",
          note: "మీ Loan / Interest వివరాలు అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.",
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
  });

export const deleteLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { loan_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loan } = await supabase
      .from("member_loans")
      .select("member_id")
      .eq("id", data.loan_id)
      .maybeSingle();
    const { error } = await supabase.from("member_loans").delete().eq("id", data.loan_id);
    if (error) throw new Error(error.message);
    let emailSent = false;
    let emailError: string | null = null;
    try {
      if ((loan as any)?.member_id) {
        const { sendMemberDashboardMagicLink } = await import("@/lib/member-notifications.server");
        const sent = await sendMemberDashboardMagicLink({
          memberId: (loan as any).member_id,
          subject: "MBR APP — Loan details updated",
          label: "member_loan_deleted",
          note: "మీ Loan / Interest వివరాలు అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ మెంబర్ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.",
        });
        emailSent = sent.sent;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
    return { ok: true, emailSent, emailError };
  });
