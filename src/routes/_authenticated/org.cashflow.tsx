import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Building2, User, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCashFlowSummary } from "@/lib/cashflow.functions";

export const Route = createFileRoute("/_authenticated/org/cashflow")({
  head: () => ({ meta: [{ title: "Society Cash Flow Statement" }] }),
  component: CashFlowPage,
});

const fmt = (n: number) =>
  "₹ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INCOME_LABEL: Record<string, string> = {
  registration_fee: "Registration Fees",
  donation: "Donations",
  other: "Other Income",
};
const EXPENSE_LABEL: Record<string, string> = {
  charity: "Financial Help / Charity",
  office: "Office Expenses",
  meeting: "Meeting Expenses",
  misc: "Miscellaneous",
};

function CashFlowPage() {
  const fetchFn = useServerFn(getCashFlowSummary);
  const q = useQuery({ queryKey: ["cashflow"], queryFn: () => fetchFn() });
  const d = q.data;

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/org/dashboard" className="p-2 rounded-lg hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">సొసైటీ నగదు ప్రవాహం</h1>
              <p className="text-xs text-white/60">Society Cash Flow Statement</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/org/income">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">+ Income</Button>
            </Link>
            <Link to="/org/expenses">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">+ Expense</Button>
            </Link>
          </div>
        </header>

        {q.isLoading || !d ? (
          <p className="text-sm text-white/60">Loading…</p>
        ) : (
          <>
            {/* Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <WalletCard icon={<Building2 className="h-5 w-5" />} label="Bank" value={d.wallets.bank} accent="from-blue-500/30" />
              <WalletCard icon={<Briefcase className="h-5 w-5" />} label="Accountant / NPR" value={d.wallets.accountant} accent="from-amber-500/30" />
              <WalletCard icon={<User className="h-5 w-5" />} label="President / PSR" value={d.wallets.president} accent="from-purple-500/30" />
            </div>

            {/* Totals */}
            <Card className="bg-zinc-950 border-white/10 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] uppercase text-green-400 flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" />Total Income</p>
                  <p className="text-lg font-bold text-green-400">{fmt(d.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-red-400 flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3" />Total Expense</p>
                  <p className="text-lg font-bold text-red-400">{fmt(d.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[#ff8c28] flex items-center justify-center gap-1"><Wallet className="h-3 w-3" />Closing Balance</p>
                  <p className="text-lg font-bold text-[#ff8c28]">{fmt(d.closingBalance)}</p>
                </div>
              </div>
            </Card>

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Income Breakdown</h3>
                {Object.keys(d.incomeByType).length === 0 ? (
                  <p className="text-xs text-white/40">No income yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.incomeByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white/70">{INCOME_LABEL[k] ?? k}</span>
                        <span className="font-medium">{fmt(v as number)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2">Expense Breakdown</h3>
                {Object.keys(d.expenseByType).length === 0 ? (
                  <p className="text-xs text-white/40">No expenses yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.expenseByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white/70">{EXPENSE_LABEL[k] ?? k}</span>
                        <span className="font-medium">{fmt(v as number)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WalletCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <Card className={`bg-gradient-to-br ${accent} to-zinc-950 border-white/10 p-4`}>
      <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold">{fmt(value)}</p>
    </Card>
  );
}
