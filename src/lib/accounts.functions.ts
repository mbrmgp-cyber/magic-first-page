import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data: o } = await supabase
    .from("organizations").select("id").eq("admin_user_id", userId).maybeSingle();
  if (o?.id) return o.id;
  const { data: m } = await supabase
    .from("members").select("org_id").eq("user_id", userId).eq("status", "approved")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return m?.org_id ?? null;
}

async function summarizeLoans(supabase: any, loans: any[]) {
  const enriched = await Promise.all(loans.map(async (l) => {
    const { data } = await supabase.rpc("get_loan_summary", { _loan_id: l.id });
    const s = Array.isArray(data) ? data[0] : data;
    return { ...l, summary: s };
  }));
  const totalOutstanding = enriched.reduce((sum, l) => sum + Number(l.summary?.balance ?? 0), 0);
  // Monthly interest due = principal * rate% on the active balance — approximate from active loans
  const monthlyInterest = enriched.reduce((sum, l) => {
    const principal = Number(l.principal ?? 0);
    const rate = Number(l.interest_rate_monthly ?? 0);
    return sum + principal * (rate / 100);
  }, 0);
  return { enriched, totalOutstanding, monthlyInterest };
}

// Lookup by member_code (ID NO)
export const lookupMemberByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const code = data.code.trim().toUpperCase();
    const { data: member } = await supabase
      .from("members")
      .select("id, name, member_code, email, phone, photo_url")
      .eq("org_id", orgId)
      .eq("member_code", code)
      .maybeSingle();
    if (!member) return { found: false as const };

    const { data: loans } = await supabase
      .from("member_loans").select("*")
      .eq("member_id", member.id).eq("status", "active")
      .order("start_date", { ascending: true });
    const { totalOutstanding, monthlyInterest, enriched } = await summarizeLoans(supabase, loans ?? []);
    // Surety placeholder data — pulled from introducer if available
    const { data: introducer } = await supabase
      .from("members").select("name, member_code")
      .eq("org_id", orgId).limit(1).maybeSingle();
    return {
      found: true as const,
      member,
      loans: enriched,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      monthlyInterest: Math.round(monthlyInterest * 100) / 100,
      surety: introducer ?? null,
    };
  });

// Record a monthly payment (principal + interest split, applied to oldest active loan)
export const recordMonthlyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    member_code: string;
    payment_date: string;
    principal_amount: number;
    interest_amount: number;
    new_loan_amount?: number;
    new_loan_interest_rate?: number;
    wallet?: "bank" | "accountant" | "president";
    remarks?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    const code = data.member_code.trim().toUpperCase();
    const { data: member } = await supabase
      .from("members").select("id, name, email")
      .eq("org_id", orgId).eq("member_code", code).maybeSingle();
    if (!member) throw new Error("Member not found");

    const paidTotal = Number(data.principal_amount || 0) + Number(data.interest_amount || 0);
    const newLoanAmt = Number(data.new_loan_amount || 0);
    if (paidTotal <= 0 && newLoanAmt <= 0) throw new Error("ఏదైనా మొత్తం నమోదు చేయండి");

    const wallet = data.wallet ?? "accountant";

    // 1. Record collection against oldest active loan (if any) + auto-credit org_income
    if (paidTotal > 0) {
      const { data: loans } = await supabase
        .from("member_loans").select("id")
        .eq("member_id", member.id).eq("status", "active")
        .order("start_date", { ascending: true }).limit(1);
      const loan = loans?.[0];
      if (!loan) throw new Error("No active loan to collect against");
      const notes = JSON.stringify({
        principal: data.principal_amount,
        interest: data.interest_amount,
        remarks: data.remarks ?? "",
      });
      const { error } = await supabase.from("member_loan_payments").insert({
        loan_id: loan.id, org_id: orgId, amount: paidTotal,
        payment_date: data.payment_date, notes,
      });
      if (error) throw new Error(error.message);

      // Auto-credit income: separate entries for principal & interest
      const { count } = await supabase
        .from("org_income").select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      let seq = count ?? 0;
      const incRows: any[] = [];
      const baseEmail = (member.email ?? `${code.toLowerCase()}@member.local`).toLowerCase();
      const principalAmt = Number(data.principal_amount || 0);
      const interestAmt = Number(data.interest_amount || 0);
      if (principalAmt > 0) {
        seq += 1;
        incRows.push({
          org_id: orgId, entry_date: data.payment_date,
          payer_name: member.name, payer_email: baseEmail,
          amount: principalAmt, currency: "INR", exchange_rate: 1, base_amount: principalAmt,
          income_type: "loan_principal" as any, wallet,
          receipt_no: `RCPT-${String(seq).padStart(5, "0")}`,
          remarks: `Loan principal repayment — ${member.name} (${code})${data.remarks ? " • " + data.remarks : ""}`,
          created_by: userId,
        });
      }
      if (interestAmt > 0) {
        seq += 1;
        incRows.push({
          org_id: orgId, entry_date: data.payment_date,
          payer_name: member.name, payer_email: baseEmail,
          amount: interestAmt, currency: "INR", exchange_rate: 1, base_amount: interestAmt,
          income_type: "loan_interest" as any, wallet,
          receipt_no: `RCPT-${String(seq).padStart(5, "0")}`,
          remarks: `Loan interest — ${member.name} (${code})${data.remarks ? " • " + data.remarks : ""}`,
          created_by: userId,
        });
      }
      if (incRows.length) {
        const { error: incErr } = await supabase.from("org_income").insert(incRows);
        if (incErr) console.error("[accounts] income auto-credit failed:", incErr.message);
      }
    }

    // 2. Disburse new loan (if any)
    let newLoanId: string | null = null;
    if (newLoanAmt > 0) {
      const rate = Number(data.new_loan_interest_rate || 0);
      const { data: created, error: lerr } = await supabase.from("member_loans").insert({
        org_id: orgId,
        member_id: member.id,
        principal: newLoanAmt,
        interest_rate_monthly: rate,
        start_date: data.payment_date,
        purpose: data.remarks ?? "Committee disbursement",
      }).select("id").single();
      if (lerr) throw new Error(lerr.message);
      newLoanId = created!.id;
    }

    // Recompute total outstanding across all active loans
    const { data: activeLoans } = await supabase
      .from("member_loans").select("id")
      .eq("member_id", member.id).eq("status", "active");
    let balance = 0;
    for (const al of (activeLoans ?? [])) {
      const { data: s } = await supabase.rpc("get_loan_summary", { _loan_id: al.id });
      const summary = Array.isArray(s) ? s[0] : s;
      balance += Number(summary?.balance ?? 0);
    }

    // Email receipt (best-effort log; full email infra can be wired later)
    if (member.email) {
      console.log("[accounts] payment receipt", {
        to: member.email,
        member: member.name,
        principal: data.principal_amount,
        interest: data.interest_amount,
        balance,
        date: data.payment_date,
      });
    }
    return {
      ok: true as const,
      balance: Math.round(balance * 100) / 100,
      emailed_to: member.email ?? null,
      member_name: member.name,
      new_loan_id: newLoanId,
      collected: paidTotal,
      disbursed: newLoanAmt,
    };
  });

// Member-facing personal ledger
export const getMyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("members").select("id, name, member_code, org_id")
      .eq("user_id", userId).eq("status", "approved")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!me) return { entries: [], member: null, totals: { received: 0, repaid: 0, balance: 0 } };

    const { data: loans } = await supabase
      .from("member_loans").select("*")
      .eq("member_id", me.id)
      .order("start_date", { ascending: true });
    const { enriched, totalOutstanding } = await summarizeLoans(supabase, loans ?? []);

    const loanIds = (loans ?? []).map((l: any) => l.id);
    const { data: payments } = loanIds.length
      ? await supabase.from("member_loan_payments")
          .select("*").in("loan_id", loanIds)
          .order("payment_date", { ascending: true })
      : { data: [] as any[] };

    type Entry = {
      date: string; type: "received" | "repaid";
      principal: number; interest: number; amount: number; note?: string;
    };
    const entries: Entry[] = [];
    for (const l of (loans ?? [])) {
      entries.push({
        date: l.start_date, type: "received",
        principal: Number(l.principal), interest: 0,
        amount: Number(l.principal),
        note: l.purpose ?? undefined,
      });
    }
    for (const p of (payments ?? [])) {
      let split = { principal: 0, interest: 0, remarks: "" };
      try { split = { ...split, ...JSON.parse(p.notes ?? "{}") }; } catch { /* legacy */ }
      const principal = Number(split.principal) || Number(p.amount);
      const interest = Number(split.interest) || 0;
      entries.push({
        date: p.payment_date, type: "repaid",
        principal, interest,
        amount: principal + interest,
        note: split.remarks,
      });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const received = entries.filter(e => e.type === "received").reduce((s, e) => s + e.amount, 0);
    const repaid = entries.filter(e => e.type === "repaid").reduce((s, e) => s + e.amount, 0);
    return {
      member: me,
      loans: enriched,
      entries,
      totals: {
        received: Math.round(received * 100) / 100,
        repaid: Math.round(repaid * 100) / 100,
        balance: Math.round(totalOutstanding * 100) / 100,
      },
    };
  });

// Admin Master Ledger — aggregated view across all members
export const getMasterLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { rows: [], totals: { outstanding: 0, principal: 0, interest: 0, newLoan: 0, net: 0 } };

    const { data: members } = await supabase
      .from("members")
      .select("id, name, member_code")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("member_code", { ascending: true });

    const today = new Date().toISOString().slice(0, 10);
    const rows = await Promise.all((members ?? []).map(async (m: any) => {
      const { data: loans } = await supabase
        .from("member_loans").select("id, principal, start_date")
        .eq("member_id", m.id).eq("status", "active");
      let outstanding = 0;
      let newLoanToday = 0;
      const loanIds: string[] = [];
      for (const l of (loans ?? [])) {
        loanIds.push(l.id);
        const { data: s } = await supabase.rpc("get_loan_summary", { _loan_id: l.id });
        const summary = Array.isArray(s) ? s[0] : s;
        outstanding += Number(summary?.balance ?? 0);
        if (String(l.start_date).slice(0, 10) === today) newLoanToday += Number(l.principal ?? 0);
      }
      let principalToday = 0, interestToday = 0;
      if (loanIds.length) {
        const { data: pays } = await supabase
          .from("member_loan_payments")
          .select("amount, notes, payment_date")
          .in("loan_id", loanIds)
          .eq("payment_date", today);
        for (const p of (pays ?? [])) {
          try {
            const n = JSON.parse(p.notes ?? "{}");
            principalToday += Number(n.principal ?? 0);
            interestToday += Number(n.interest ?? 0);
          } catch {
            principalToday += Number(p.amount ?? 0);
          }
        }
      }
      const oldBalance = outstanding + principalToday - newLoanToday; // approximate pre-today balance
      return {
        member_id: m.member_code,
        member_name: m.name,
        old_balance: Math.round(oldBalance * 100) / 100,
        principal_collected: Math.round(principalToday * 100) / 100,
        interest_collected: Math.round(interestToday * 100) / 100,
        new_loan: Math.round(newLoanToday * 100) / 100,
        net_balance: Math.round(outstanding * 100) / 100,
      };
    }));

    const totals = rows.reduce((acc, r) => ({
      outstanding: acc.outstanding + r.old_balance,
      principal: acc.principal + r.principal_collected,
      interest: acc.interest + r.interest_collected,
      newLoan: acc.newLoan + r.new_loan,
      net: acc.net + r.net_balance,
    }), { outstanding: 0, principal: 0, interest: 0, newLoan: 0, net: 0 });
    return { rows, totals };
  });
