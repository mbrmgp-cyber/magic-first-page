import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Building2, User, Briefcase, Users, AlarmClock, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCashFlowSummary, type TimeRange } from "@/lib/cashflow.functions";
import { useCurrency, BASE_CURRENCY } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/cashflow")({
  head: () => ({ meta: [{ title: "Society Cash Flow Statement" }] }),
  component: CashFlowPage,
});

const INCOME_LABEL: Record<string, { te: string; en: string }> = {
  registration_fee: { te: "నమోదు రుసుములు", en: "Registration Fees" },
  donation: { te: "విరాళాలు", en: "Donations" },
  loan_principal: { te: "అసలు వసూలు", en: "Principal Collected" },
  loan_interest: { te: "వడ్డీ వసూలు", en: "Interest Collected" },
  other: { te: "ఇతర ఆదాయం", en: "Other Income" },
};
const EXPENSE_LABEL: Record<string, { te: string; en: string }> = {
  charity: { te: "ఆర్థిక సహాయం / ధర్మం", en: "Financial Aid / Charity" },
  office: { te: "ఆఫీసు ఖర్చులు", en: "Office Expenses" },
  meeting: { te: "మీటింగ్ ఖర్చులు", en: "Meeting Expenses" },
  misc: { te: "ఇతరములు", en: "Miscellaneous" },
};

const RANGES: { v: TimeRange; te: string; en: string }[] = [
  { v: "this_month", te: "నెల పట్టిక", en: "This Month" },
  { v: "3m", te: "3 నెలల పట్టిక", en: "3 Months" },
  { v: "6m", te: "6 నెలల పట్టిక", en: "6 Months" },
  { v: "yearly", te: "సంవత్సర పట్టిక", en: "Yearly" },
];

function CashFlowPage() {
  const { lang } = useI18n();
  const lt = (en: string, te: string) => lang === "te" ? te : en;
  const fetchFn = useServerFn(getCashFlowSummary);
  const [range, setRange] = useState<TimeRange>("this_month");
  const [pdfBusy, setPdfBusy] = useState(false);
  const q = useQuery({
    queryKey: ["cashflow", range],
    queryFn: () => fetchFn({ data: { range } }),
  });
  const d = q.data;
  const { currency, fmt: fmtRaw, symbol } = useCurrency();
  // Stored totals are in INR (base). Show note when viewing in a non-base currency.
  const fmt = (n: number) => fmtRaw(n);
  const rangeLabel = RANGES.find((r) => r.v === range);
  const rangeText = rangeLabel ? lt(rangeLabel.en, rangeLabel.te) : range;
  const reportDate = new Date().toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const incomeRows: [string, number][] = d
    ? Object.entries(d.incomeByType).map(([k, v]) => [INCOME_LABEL[k] ? lt(INCOME_LABEL[k].en, INCOME_LABEL[k].te) : k, Number(v)])
    : [];
  const expenseRows: [string, number][] = d
    ? Object.entries(d.expenseByType).map(([k, v]) => [EXPENSE_LABEL[k] ? lt(EXPENSE_LABEL[k].en, EXPENSE_LABEL[k].te) : k, Number(v)])
    : [];

  async function downloadCashFlowPdf() {
    if (!d || pdfBusy) return;
    setPdfBusy(true);
    const previousTitle = document.title;
    const cleanup = () => {
      document.documentElement.classList.remove("mbr-printing-cashflow");
      document.body.classList.remove("mbr-printing-cashflow");
      document.title = previousTitle;
      window.removeEventListener("afterprint", cleanup);
      setPdfBusy(false);
    };

    try {
      document.title = `cash-flow-${range}-${new Date().toISOString().slice(0, 10)}`;
      document.documentElement.classList.add("mbr-printing-cashflow");
      document.body.classList.add("mbr-printing-cashflow");
      await document.fonts?.load('400 12pt "Noto Sans Telugu"');
      await document.fonts?.load('700 16pt "Noto Sans Telugu"');
      await document.fonts?.ready;
      window.addEventListener("afterprint", cleanup, { once: true });
      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 120000);
      }, 100);
    } catch {
      cleanup();
    }
  }

  return (
    <>
    <div className="cashflow-screen min-h-screen bg-black text-white pb-16">
      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/org/accounts-hub" className="p-2 rounded-lg hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{lt("Society Cash Flow", "సొసైటీ నగదు ప్రవాహం")}</h1>
              <p className="text-xs text-white/70">{lt("Cash Flow Statement", "నగదు ప్రవాహ నివేదిక")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center print:hidden">
            <Link to="/org/income">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">{lt("+ Income", "+ ఆదాయం")}</Button>
            </Link>
            <Link to="/org/expenses">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">{lt("+ Expense", "+ ఖర్చు")}</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={downloadCashFlowPdf} disabled={!d || q.isLoading || pdfBusy} className="gap-1">
              <FileDown className="h-4 w-4" /> {pdfBusy ? lt("Creating…", "తయారవుతోంది…") : lt("Save PDF", "PDF సేవ్")}
            </Button>
          </div>
        </header>

        {/* Time filter */}
        <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <TabsList className="bg-zinc-900 border border-white/10 grid grid-cols-4 w-full h-auto p-1">
            {RANGES.map((r) => (
              <TabsTrigger key={r.v} value={r.v}
                className="data-[state=active]:bg-[#ff8c28] data-[state=active]:text-white text-white flex-col py-1.5 px-1 h-auto">
                <span className="text-[11px] font-medium">{lt(r.en, r.te)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {currency !== BASE_CURRENCY && (
          <p className="text-[11px] text-amber-400/80 bg-amber-900/20 border border-amber-500/30 rounded px-3 py-1.5">
            {lt(`Showing in ${symbol} ${currency}. Amounts are converted from base currency (INR).`, `${symbol} ${currency}లో ప్రదర్శిస్తోంది. మొత్తాలు బేస్ కరెన్సీ (INR)కి మార్చబడతాయి.`)}
          </p>
        )}

        {q.isLoading || !d ? (
          <p className="text-sm text-white">{lt("Loading…", "లోడ్ అవుతోంది…")}</p>
        ) : (
          <>
            {/* Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <WalletCard fmt={fmt} icon={<Building2 className="h-5 w-5" />} label={lt("In Bank", "బ్యాంకులో")} value={d.wallets.bank} accent="from-blue-500/30" />
              <WalletCard fmt={fmt} icon={<Briefcase className="h-5 w-5" />} label={lt("Cashier / Petty Cash", "అకౌంటెంట్ / చిల్లర")} value={d.wallets.accountant} accent="from-amber-500/30" />
              <WalletCard fmt={fmt} icon={<User className="h-5 w-5" />} label={lt("President", "అధ్యక్షుడు")} value={d.wallets.president} accent="from-purple-500/30" />
            </div>

            {/* Members holdings + pending interest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WalletCard fmt={fmt} icon={<Users className="h-5 w-5" />}
                label={lt("With Members", "సభ్యుల వద్ద ఉన్న మొత్తం")}
                value={d.membersOutstanding ?? 0} accent="from-orange-500/30" />
              <WalletCard fmt={fmt} icon={<AlarmClock className="h-5 w-5" />}
                label={lt("Pending Interest", "పెండింగ్ వడ్డీ")}
                value={d.pendingInterest ?? 0} accent="from-rose-500/30" />
            </div>

            {/* Totals */}
            <Card className="bg-zinc-950 border-white/10 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[11px] text-green-400 flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" />{lt("Income", "వచ్చినది")}</p>
                  <p className="text-lg font-bold text-green-400">{fmt(d.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-red-400 flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3" />{lt("Expense", "పోయినది")}</p>
                  <p className="text-lg font-bold text-red-400">{fmt(d.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#ff8c28] flex items-center justify-center gap-1"><Wallet className="h-3 w-3" />{lt("Balance", "మిగులు")}</p>
                  <p className="text-lg font-bold text-[#ff8c28]">{fmt(d.closingBalance)}</p>
                </div>
              </div>
            </Card>

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">{lt("Income Details", "ఆదాయ వివరాలు")}</h3>
                {Object.keys(d.incomeByType).length === 0 ? (
                  <p className="text-xs text-white/60">{lt("No income in this period.", "ఈ కాలంలో ఆదాయం లేదు.")}</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.incomeByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white">{INCOME_LABEL[k] ? lt(INCOME_LABEL[k].en, INCOME_LABEL[k].te) : k}</span>
                        <span className="font-medium text-white">{fmt(v as number)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="bg-zinc-950 border-white/10 p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2">{lt("Expense Details", "ఖర్చు వివరాలు")}</h3>
                {Object.keys(d.expenseByType).length === 0 ? (
                  <p className="text-xs text-white/60">{lt("No expenses in this period.", "ఈ కాలంలో ఖర్చులు లేవు.")}</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(d.expenseByType).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white">{EXPENSE_LABEL[k] ? lt(EXPENSE_LABEL[k].en, EXPENSE_LABEL[k].te) : k}</span>
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
    {d && (
      <CashFlowPrintSheet
        title={lt("Society Cash Flow", "సొసైటీ నగదు ప్రవాహం")}
        subtitle={`${lt("Cash Flow Statement", "నగదు ప్రవాహ నివేదిక")} • ${rangeText}`}
        dateText={reportDate}
        fmt={fmt}
        labels={{
          bank: lt("In Bank", "బ్యాంకులో"),
          accountant: lt("Cashier / Petty Cash", "అకౌంటెంట్ / చిల్లర"),
          president: lt("President", "అధ్యక్షుడు"),
          members: lt("With Members", "సభ్యుల వద్ద ఉన్న మొత్తం"),
          pendingInterest: lt("Pending Interest", "పెండింగ్ వడ్డీ"),
          income: lt("Income", "వచ్చినది"),
          expense: lt("Expense", "పోయినది"),
          balance: lt("Balance", "మిగులు"),
          incomeDetails: lt("Income Details", "ఆదాయ వివరాలు"),
          expenseDetails: lt("Expense Details", "ఖర్చు వివరాలు"),
          noEntries: lt("No entries in this period.", "ఈ కాలంలో ఎంట్రీలు లేవు."),
        }}
        data={d}
        incomeRows={incomeRows}
        expenseRows={expenseRows}
      />
    )}
    </>
  );
}

type CashFlowSummaryView = {
  wallets: Record<"bank" | "accountant" | "president", number>;
  membersOutstanding?: number;
  pendingInterest?: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
};

type PrintLabels = {
  bank: string;
  accountant: string;
  president: string;
  members: string;
  pendingInterest: string;
  income: string;
  expense: string;
  balance: string;
  incomeDetails: string;
  expenseDetails: string;
  noEntries: string;
};

function CashFlowPrintSheet({
  title,
  subtitle,
  dateText,
  fmt,
  labels,
  data,
  incomeRows,
  expenseRows,
}: {
  title: string;
  subtitle: string;
  dateText: string;
  fmt: (n: number) => string;
  labels: PrintLabels;
  data: CashFlowSummaryView;
  incomeRows: [string, number][];
  expenseRows: [string, number][];
}) {
  return (
    <section className="cashflow-print-sheet" aria-label={title}>
      <header className="cashflow-print-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <span>{dateText}</span>
      </header>

      <div className="cashflow-print-metrics cashflow-print-metrics-five">
        <PrintMetric label={labels.bank} value={fmt(data.wallets.bank)} accent="blue" />
        <PrintMetric label={labels.accountant} value={fmt(data.wallets.accountant)} accent="amber" />
        <PrintMetric label={labels.president} value={fmt(data.wallets.president)} accent="violet" />
        <PrintMetric label={labels.members} value={fmt(data.membersOutstanding ?? 0)} accent="orange" />
        <PrintMetric label={labels.pendingInterest} value={fmt(data.pendingInterest ?? 0)} accent="rose" />
      </div>

      <div className="cashflow-print-total-row">
        <PrintTotal label={labels.income} value={fmt(data.totalIncome)} tone="green" />
        <PrintTotal label={labels.expense} value={fmt(data.totalExpense)} tone="red" />
        <PrintTotal label={labels.balance} value={fmt(data.closingBalance)} tone="orange" />
      </div>

      <div className="cashflow-print-breakdowns">
        <PrintBreakdown title={labels.incomeDetails} rows={incomeRows} fmt={fmt} emptyText={labels.noEntries} tone="green" />
        <PrintBreakdown title={labels.expenseDetails} rows={expenseRows} fmt={fmt} emptyText={labels.noEntries} tone="red" />
      </div>

      <footer>Download from MBR APP</footer>
    </section>
  );
}

function PrintMetric({ label, value, accent }: { label: string; value: string; accent: "blue" | "amber" | "violet" | "orange" | "rose" }) {
  return (
    <div className={`cashflow-print-metric cashflow-print-accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintTotal({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "orange" }) {
  return (
    <div className={`cashflow-print-total cashflow-print-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintBreakdown({ title, rows, fmt, emptyText, tone }: { title: string; rows: [string, number][]; fmt: (n: number) => string; emptyText: string; tone: "green" | "red" }) {
  return (
    <div className={`cashflow-print-breakdown cashflow-print-tone-${tone}`}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <table>
          <tbody>
            {rows.map(([label, amount]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{fmt(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
