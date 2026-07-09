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

  async function downloadCashFlowPdf() {
    if (!d || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      await document.fonts?.ready;

      const pageWidth = 1240;
      const pageHeight = 1754;
      const margin = 80;
      const canvas = document.createElement("canvas");
      canvas.width = pageWidth;
      canvas.height = pageHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("PDF canvas is not available");

      const fontFamily = '"Noto Sans Telugu", "Noto Sans", "Segoe UI", Arial, sans-serif';
      const setFont = (size: number, weight: number | string = 400) => {
        ctx.font = `${weight} ${size}px ${fontFamily}`;
      };
      const drawText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        size: number,
        color = "#111827",
        weight: number | string = 400,
        align: CanvasTextAlign = "left",
      ) => {
        const safe = String(text ?? "");
        let fittedSize = size;
        setFont(fittedSize, weight);
        while (fittedSize > 13 && ctx.measureText(safe).width > maxWidth) {
          fittedSize -= 1;
          setFont(fittedSize, weight);
        }
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = "middle";
        const drawX = align === "right" ? x + maxWidth : align === "center" ? x + maxWidth / 2 : x;
        ctx.fillText(safe, drawX, y);
      };
      const roundedRect = (x: number, y: number, w: number, h: number, r = 14) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };
      const drawCard = (x: number, y: number, w: number, h: number, label: string, value: string, accent: string) => {
        ctx.fillStyle = "#ffffff";
        roundedRect(x, y, w, h, 16);
        ctx.fill();
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = accent;
        roundedRect(x, y, 10, h, 12);
        ctx.fill();
        drawText(label, x + 28, y + 34, w - 56, 20, "#374151", 700);
        drawText(value, x + 28, y + 78, w - 56, 30, "#111827", 800);
      };

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageWidth, pageHeight);
      ctx.fillStyle = "#ff8c28";
      ctx.fillRect(0, 0, pageWidth, 14);

      const rangeLabel = RANGES.find((r) => r.v === range);
      drawText(lt("Society Cash Flow", "సొసైటీ నగదు ప్రవాహం"), margin, 84, pageWidth - margin * 2, 34, "#111827", 800);
      drawText(
        `${lt("Cash Flow Statement", "నగదు ప్రవాహ నివేదిక")} • ${rangeLabel ? lt(rangeLabel.en, rangeLabel.te) : range}`,
        margin,
        126,
        pageWidth - margin * 2,
        22,
        "#4b5563",
        500,
      );
      drawText(new Date().toLocaleDateString("en-IN"), margin, 126, pageWidth - margin * 2, 20, "#6b7280", 500, "right");

      let y = 190;
      const gap = 24;
      const cardW = (pageWidth - margin * 2 - gap * 2) / 3;
      drawCard(margin, y, cardW, 118, lt("In Bank", "బ్యాంకులో"), fmt(d.wallets.bank), "#2563eb");
      drawCard(margin + cardW + gap, y, cardW, 118, lt("Cashier / Petty Cash", "అకౌంటెంట్ / చిల్లర"), fmt(d.wallets.accountant), "#d97706");
      drawCard(margin + (cardW + gap) * 2, y, cardW, 118, lt("President", "అధ్యక్షుడు"), fmt(d.wallets.president), "#7c3aed");

      y += 148;
      const halfW = (pageWidth - margin * 2 - gap) / 2;
      drawCard(margin, y, halfW, 118, lt("With Members", "సభ్యుల వద్ద ఉన్న మొత్తం"), fmt(d.membersOutstanding ?? 0), "#ea580c");
      drawCard(margin + halfW + gap, y, halfW, 118, lt("Pending Interest", "పెండింగ్ వడ్డీ"), fmt(d.pendingInterest ?? 0), "#e11d48");

      y += 162;
      ctx.fillStyle = "#f9fafb";
      roundedRect(margin, y, pageWidth - margin * 2, 132, 18);
      ctx.fill();
      ctx.strokeStyle = "#d1d5db";
      ctx.stroke();
      const totalW = (pageWidth - margin * 2) / 3;
      drawText(lt("Income", "వచ్చినది"), margin, y + 38, totalW, 22, "#15803d", 800, "center");
      drawText(fmt(d.totalIncome), margin, y + 84, totalW, 30, "#15803d", 800, "center");
      drawText(lt("Expense", "పోయినది"), margin + totalW, y + 38, totalW, 22, "#b91c1c", 800, "center");
      drawText(fmt(d.totalExpense), margin + totalW, y + 84, totalW, 30, "#b91c1c", 800, "center");
      drawText(lt("Balance", "మిగులు"), margin + totalW * 2, y + 38, totalW, 22, "#c2410c", 800, "center");
      drawText(fmt(d.closingBalance), margin + totalW * 2, y + 84, totalW, 30, "#c2410c", 800, "center");

      const drawBreakdown = (x: number, startY: number, w: number, title: string, rows: [string, number][], color: string) => {
        ctx.fillStyle = "#ffffff";
        roundedRect(x, startY, w, 470, 16);
        ctx.fill();
        ctx.strokeStyle = "#d1d5db";
        ctx.stroke();
        drawText(title, x + 28, startY + 44, w - 56, 24, color, 800);
        let rowY = startY + 92;
        if (!rows.length) {
          drawText(lt("No entries in this period.", "ఈ కాలంలో ఎంట్రీలు లేవు."), x + 28, rowY, w - 56, 20, "#6b7280", 500);
          return;
        }
        rows.slice(0, 10).forEach(([label, amount]) => {
          drawText(label, x + 28, rowY, w - 220, 20, "#374151", 600);
          drawText(fmt(amount), x + 28, rowY, w - 56, 20, "#111827", 700, "right");
          ctx.strokeStyle = "#e5e7eb";
          ctx.beginPath();
          ctx.moveTo(x + 28, rowY + 24);
          ctx.lineTo(x + w - 28, rowY + 24);
          ctx.stroke();
          rowY += 48;
        });
      };

      y += 172;
      drawBreakdown(
        margin,
        y,
        halfW,
        lt("Income Details", "ఆదాయ వివరాలు"),
        Object.entries(d.incomeByType).map(([k, v]) => [INCOME_LABEL[k] ? lt(INCOME_LABEL[k].en, INCOME_LABEL[k].te) : k, Number(v)]),
        "#15803d",
      );
      drawBreakdown(
        margin + halfW + gap,
        y,
        halfW,
        lt("Expense Details", "ఖర్చు వివరాలు"),
        Object.entries(d.expenseByType).map(([k, v]) => [EXPENSE_LABEL[k] ? lt(EXPENSE_LABEL[k].en, EXPENSE_LABEL[k].te) : k, Number(v)]),
        "#b91c1c",
      );

      drawText("Download from MBR APP", margin, pageHeight - 78, pageWidth - margin * 2, 16, "#6b7280", 500, "center");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`cash-flow-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16">
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
              <FileDown className="h-4 w-4" /> {pdfBusy ? lt("Creating…", "తయారవుతోంది…") : lt("PDF", "పిడిఎఫ్")}
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
