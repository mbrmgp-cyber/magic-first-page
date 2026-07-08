import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Building2, User, Briefcase, Users, AlarmClock, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCashFlowSummary, type TimeRange } from "@/lib/cashflow.functions";
import { useCurrency, BASE_CURRENCY } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/org/cashflow")({
  head: () => ({ meta: [{ title: "Society Cash Flow Statement" }] }),
  component: CashFlowPage,
});

const INCOME_LABEL: Record<string, string> = {
  registration_fee: "నమోదు రుసుములు",
  donation: "విరాళాలు",
  loan_principal: "అసలు వసూలు",
  loan_interest: "వడ్డీ వసూలు",
  other: "ఇతర ఆదాయం",
};
const EXPENSE_LABEL: Record<string, string> = {
  charity: "ఆర్థిక సహాయం / ధర్మం",
  office: "ఆఫీసు ఖర్చులు",
  meeting: "మీటింగ్ ఖర్చులు",
  misc: "ఇతరములు",
};

const RANGES: { v: TimeRange; te: string }[] = [
  { v: "this_month", te: "నెల పట్టిక" },
  { v: "3m", te: "3 నెలల పట్టిక" },
  { v: "6m", te: "6 నెలల పట్టిక" },
  { v: "yearly", te: "సంవత్సర పట్టిక" },
];

function CashFlowPage() {
  const fetchFn = useServerFn(getCashFlowSummary);
  const [range, setRange] = useState<TimeRange>("this_month");
  const q = useQuery({
    queryKey: ["cashflow", range],
    queryFn: () => fetchFn({ data: { range } }),
  });
  const d = q.data;
  const { currency, fmt: fmtRaw, symbol } = useCurrency();
  // Stored totals are in INR (base). Show note when viewing in a non-base currency.
  const fmt = (n: number) => fmtRaw(n);

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/org/accounts-hub" className="p-2 rounded-lg hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">సొసైటీ నగదు ప్రవాహం</h1>
              <p className="text-xs text-white/70">నగదు ప్రవాహ నివేదిక</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center print:hidden">
            <Link to="/org/income">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">+ ఆదాయం</Button>
            </Link>
            <Link to="/org/expenses">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">+ ఖర్చు</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
              <Printer className="h-4 w-4" /> ప్రింట్
            </Button>
          </div>
        </header>

        {/* Time filter */}
        <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <TabsList className="bg-zinc-900 border border-white/10 grid grid-cols-4 w-full h-auto p-1">
            {RANGES.map((r) => (
              <TabsTrigger key={r.v} value={r.v}
                className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-white text-white flex-col py-1.5 px-1 h-auto">
                <span className="text-[11px] font-medium">{r.te}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {currency !== BASE_CURRENCY && (
          <p className="text-[11px] text-amber-400/80 bg-amber-900/20 border border-amber-500/30 rounded px-3 py-1.5">
            {symbol} {currency}లో ప్రదర్శిస్తోంది. మొత్తాలు బేస్ కరెన్సీ (INR)కి మార్చబడతాయి.
          </p>
        )}

        {q.isLoading || !d ? (
          <p className="text-sm text-white">లోడ్ అవుతోంది…</p>
        ) : (
          <>
            {/* Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <WalletCard fmt={fmt} icon={<Building2 className="h-5 w-5" />} label="బ్యాంకులో" value={d.wallets.bank} accent="from-blue-500/30" />
              <WalletCard fmt={fmt} icon={<Briefcase className="h-5 w-5" />} label="అకౌంటెంట్ / చిల్లర" value={d.wallets.accountant} accent="from-amber-500/30" />
              <WalletCard fmt={fmt} icon={<User className="h-5 w-5" />} label="అధ్యక్షుడు" value={d.wallets.president} accent="from-purple-500/30" />
            </div>

            {/* Members holdings + pending interest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WalletCard fmt={fmt} icon={<Users className="h-5 w-5" />}
                label="సభ్యుల వద్ద ఉన్న మొత్తం"
                value={d.membersOutstanding ?? 0} accent="from-orange-500/30" />
              <WalletCard fmt={fmt} icon={<AlarmClock className="h-5 w-5" />}
                label="పెండింగ్ వడ్డీ"
                value={d.pendingInterest ?? 0} accent="from-rose-500/30" />
            </div>

            {/* Totals */}
            <Card className="bg-zinc-950 border-white/10 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] text-green-400 flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" />వచ్చినది</p>
                  <p className="text-lg font-bold text-green-400">{fmt(d.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-red-400 flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3" />పోయినది</p>
                  <p className="text-lg font-bold text-red-400">{fmt(d.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#ff8c28] flex items-center justify-center gap-1"><Wallet className="h-3 w-3" />మిగులు</p>
                  <p className="text-lg font-bold text-[#ff8c28]">{fmt(d.closingBalance)}</p>
                </div>
              </div>
            </Card>

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">ఆదాయ వివరాలు</h3>
                {Object.keys(d.incomeByType).length === 0 ? (
                  <p className="text-xs text-white/60">ఈ కాలంలో ఆదాయం లేదు.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.incomeByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white">{INCOME_LABEL[k] ?? k}</span>
                        <span className="font-medium text-white">{fmt(v as number)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2">ఖర్చు వివరాలు</h3>
                {Object.keys(d.expenseByType).length === 0 ? (
                  <p className="text-xs text-white/60">ఈ కాలంలో ఖర్చులు లేవు.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.expenseByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white">{EXPENSE_LABEL[k] ?? k}</span>
                        <span className="font-medium text-white">{fmt(v as number)}</span>
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

function WalletCard({ icon, label, value, accent, fmt }: { icon: React.ReactNode; label: string; value: number; accent: string; fmt: (n: number) => string }) {
  return (
    <Card className={`bg-gradient-to-br ${accent} to-zinc-950 border-white/10 p-4`}>
      <div className="flex items-center gap-2 text-white text-xs tracking-wide">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">{fmt(value)}</p>
    </Card>
  );
}
