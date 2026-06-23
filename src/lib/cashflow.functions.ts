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
export type IncomeType = "registration_fee" | "donation" | "other";
export type ExpenseType = "charity" | "office" | "meeting" | "misc";

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
      income_type: data.income_type,
      wallet: data.wallet,
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
    remarks?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) throw new Error("Org not found");
    if (!data.recipient_name?.trim()) throw new Error("Recipient name required");
    if (!(data.amount > 0)) throw new Error("Amount must be greater than 0");

    const { data: row, error } = await supabase.from("org_expenses").insert({
      org_id: orgId,
      entry_date: data.entry_date,
      recipient_name: data.recipient_name.trim(),
      amount: data.amount,
      expense_type: data.expense_type,
      wallet: data.wallet,
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
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const orgId = await resolveOrgId(supabase, userId);
    if (!orgId) return null;
    const [{ data: inc }, { data: exp }] = await Promise.all([
      supabase.from("org_income").select("amount, wallet, income_type, entry_date").eq("org_id", orgId),
      supabase.from("org_expenses").select("amount, wallet, expense_type, entry_date").eq("org_id", orgId),
    ]);
    const wallets: Record<WalletType, number> = { bank: 0, accountant: 0, president: 0 };
    const incomeByType: Record<string, number> = {};
    const expenseByType: Record<string, number> = {};
    let totalIncome = 0, totalExpense = 0;
    for (const r of (inc ?? [])) {
      const a = Number(r.amount || 0);
      wallets[r.wallet as WalletType] = (wallets[r.wallet as WalletType] || 0) + a;
      incomeByType[r.income_type] = (incomeByType[r.income_type] || 0) + a;
      totalIncome += a;
    }
    for (const r of (exp ?? [])) {
      const a = Number(r.amount || 0);
      wallets[r.wallet as WalletType] = (wallets[r.wallet as WalletType] || 0) - a;
      expenseByType[r.expense_type] = (expenseByType[r.expense_type] || 0) + a;
      totalExpense += a;
    }
    return {
      wallets,
      incomeByType,
      expenseByType,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      closingBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
    };
  });
