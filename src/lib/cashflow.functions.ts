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

export type WalletType = "bank" | "accountant" | "president";
export type IncomeType = "registration_fee" | "donation" | "loan_principal" | "loan_interest" | "other";
export type ExpenseType = "charity" | "office" | "meeting" | "misc";
export type TimeRange = "this_month" | "3m" | "6m" | "yearly" | "all";

function rangeStart(range: TimeRange): string | null {
  const now = new Date();
  let d: Date;
  switch (range) {
    case "this_month":
      d = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "3m":
      d = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
    case "6m":
      d = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
    case "yearly":
      d = new Date(now.getFullYear(), 0, 1); break;
    default:
      return null;
  }
  return d.toISOString().slice(0, 10);
}

// ===== WALLET ACCOUNTS =====
export const listWalletAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { rows: [] };
    const { data } = await supabase.from("wallet_accounts").select("*")
      .eq("org_id", orgId).eq("is_active", true).order("name");
    return { rows: data ?? [] };
  });

export const createWalletAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; currency: string; wallet_type: WalletType }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!data.name?.trim()) throw new Error("Account name required");
    const { data: row, error } = await supabase.from("wallet_accounts").insert({
      org_id: orgId,
      name: data.name.trim(),
      currency: (data.currency || "INR").toUpperCase(),
      wallet_type: data.wallet_type,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, account: row };
  });

// ===== INCOME =====
export const recordIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    entry_date: string;
    payer_name: string;
    payer_phone?: string;
    payer_email: string;
    amount: number;
    income_type: IncomeType;
    wallet: WalletType;
    wallet_account_id?: string | null;
    currency?: string;
    exchange_rate?: number;
    remarks?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!data.payer_name?.trim()) throw new Error("Payer name required");
    if (!data.payer_email?.trim() || !/^\S+@\S+\.\S+$/.test(data.payer_email))
      throw new Error("Valid email address required");
    if (!(data.amount > 0)) throw new Error("Amount must be greater than 0");

    const currency = (data.currency || "INR").toUpperCase();
    const rate = currency === "INR" ? 1 : Number(data.exchange_rate || 0);
    if (currency !== "INR" && !(rate > 0))
      throw new Error("Exchange rate required for non-INR currency");
    const base_amount = Math.round(data.amount * rate * 100) / 100;

    const { count } = await supabase
      .from("org_income").select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    const receipt_no = `RCPT-${String((count ?? 0) + 1).padStart(5, "0")}`;

    const { data: row, error } = await supabase.from("org_income").insert({
      org_id: orgId,
      entry_date: data.entry_date,
      payer_name: data.payer_name.trim(),
      payer_phone: data.payer_phone?.trim() || null,
      payer_email: data.payer_email.trim().toLowerCase(),
      amount: data.amount,
      currency,
      exchange_rate: rate,
      base_amount,
      income_type: data.income_type as any,
      wallet: data.wallet,
      wallet_account_id: data.wallet_account_id || null,
      receipt_no,
      remarks: data.remarks?.trim() || null,
      created_by: userId,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, entry: row };
  });


export const listIncome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { rows: [] };
    const { data } = await supabase.from("org_income").select("*")
      .eq("org_id", orgId).order("entry_date", { ascending: false }).limit(200);
    return { rows: data ?? [] };
  });

// ===== EXPENSES =====
export const recordExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    entry_date: string;
    recipient_name: string;
    amount: number;
    expense_type: ExpenseType;
    wallet: WalletType;
    wallet_account_id?: string | null;
    currency?: string;
    exchange_rate?: number;
    remarks?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!data.recipient_name?.trim()) throw new Error("Recipient name required");
    if (!(data.amount > 0)) throw new Error("Amount must be greater than 0");

    const currency = (data.currency || "INR").toUpperCase();
    const rate = currency === "INR" ? 1 : Number(data.exchange_rate || 0);
    if (currency !== "INR" && !(rate > 0))
      throw new Error("Exchange rate required for non-INR currency");
    const base_amount = Math.round(data.amount * rate * 100) / 100;

    const { data: row, error } = await supabase.from("org_expenses").insert({
      org_id: orgId,
      entry_date: data.entry_date,
      recipient_name: data.recipient_name.trim(),
      amount: data.amount,
      currency,
      exchange_rate: rate,
      base_amount,
      expense_type: data.expense_type,
      wallet: data.wallet,
      wallet_account_id: data.wallet_account_id || null,
      remarks: data.remarks?.trim() || null,
      created_by: userId,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, entry: row };
  });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return { rows: [] };
    const { data } = await supabase.from("org_expenses").select("*")
      .eq("org_id", orgId).order("entry_date", { ascending: false }).limit(200);
    return { rows: data ?? [] };
  });

// ===== CASH FLOW SUMMARY =====
export const getCashFlowSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: TimeRange } | undefined) => d ?? { range: "all" as TimeRange })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return null;
    const range: TimeRange = data?.range ?? "all";
    const since = rangeStart(range);

    let incQ = supabase.from("org_income")
      .select("amount, base_amount, currency, wallet, income_type, entry_date").eq("org_id", orgId);
    let expQ = supabase.from("org_expenses")
      .select("amount, base_amount, currency, wallet, expense_type, entry_date").eq("org_id", orgId);
    if (since) { incQ = incQ.gte("entry_date", since); expQ = expQ.gte("entry_date", since); }

    const [{ data: inc }, { data: exp }] = await Promise.all([incQ, expQ]);
    const wallets: Record<WalletType, number> = { bank: 0, accountant: 0, president: 0 };
    const incomeByType: Record<string, number> = {};
    const expenseByType: Record<string, number> = {};
    let totalIncome = 0, totalExpense = 0;
    let interestCollectedInRange = 0;
    for (const r of (inc ?? [])) {
      const a = Number(r.base_amount ?? r.amount ?? 0);
      wallets[r.wallet as WalletType] = (wallets[r.wallet as WalletType] || 0) + a;
      incomeByType[r.income_type] = (incomeByType[r.income_type] || 0) + a;
      totalIncome += a;
      if (r.income_type === "loan_interest") interestCollectedInRange += a;
    }
    for (const r of (exp ?? [])) {
      const a = Number(r.base_amount ?? r.amount ?? 0);
      wallets[r.wallet as WalletType] = (wallets[r.wallet as WalletType] || 0) - a;
      expenseByType[r.expense_type] = (expenseByType[r.expense_type] || 0) + a;
      totalExpense += a;
    }

    // Total outstanding with members (all active loans) + accrued interest pending in range
    const { data: activeLoans } = await supabase
      .from("member_loans")
      .select("id, principal, interest_rate_monthly, start_date")
      .eq("org_id", orgId).eq("status", "active");
    let membersOutstanding = 0;
    let accruedInterestInRange = 0;
    const rangeStartDate = since ? new Date(since) : null;
    const now = new Date();
    for (const l of (activeLoans ?? [])) {
      const { data: s } = await supabase.rpc("get_loan_summary", { _loan_id: l.id });
      const summary = Array.isArray(s) ? s[0] : s;
      membersOutstanding += Number(summary?.balance ?? 0);

      // Accrued interest within the selected period
      const principal = Number(l.principal ?? 0);
      const rate = Number(l.interest_rate_monthly ?? 0) / 100;
      const loanStart = new Date(l.start_date);
      const periodStart = rangeStartDate && rangeStartDate > loanStart ? rangeStartDate : loanStart;
      const months = Math.max(0, (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
      accruedInterestInRange += principal * rate * months;
    }
    const pendingInterest = Math.max(0, accruedInterestInRange - interestCollectedInRange);

    return {
      range,
      since,
      wallets,
      incomeByType,
      expenseByType,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      closingBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
      membersOutstanding: Math.round(membersOutstanding * 100) / 100,
      pendingInterest: Math.round(pendingInterest * 100) / 100,
      interestCollectedInRange: Math.round(interestCollectedInRange * 100) / 100,
    };
  });
