import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMasterLedger } from "@/lib/accounts.functions";
import { downloadMasterLedgerPdfCanvas } from "@/lib/loan-pdf";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/master-ledger")({
  head: () => ({ meta: [{ title: "Master Ledger" }] }),
  component: MasterLedgerPage,
});

function MasterLedgerPage() {
  const fetchLedger = useServerFn(getMasterLedger);
  const q = useQuery({ queryKey: ["master-ledger"], queryFn: () => fetchLedger() });
  const { symbol } = useCurrency();
  const { lang } = useI18n();
  const lt = (en: string, te: string) => (lang === "te" ? te : en);
  const pdfSymbol = symbol === "₹" ? "Rs." : symbol === "د.إ" ? "AED" : symbol === "د.ك" ? "KWD" : symbol;
  const fmt = (n: number) => `${symbol} ${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtPdf = (n: number) => `${pdfSymbol} ${Number(n || 0).toLocaleString("en-IN")}`;

  const rows = q.data?.rows ?? [];
  const totals = q.data?.totals ?? { outstanding: 0, principal: 0, interest: 0, newLoan: 0, net: 0 };

  const H = {
    id: lt("Member ID", "సభ్యుని ID"),
    name: lt("Name", "పేరు"),
    oldBal: lt("Old Balance", "పాత బాకీ"),
    principal: lt("Principal Paid", "అసలు జమ"),
    interest: lt("Interest Paid", "వడ్డీ జమ"),
    newLoan: lt("New Loan", "కొత్త అప్పు"),
    total: lt("Total Balance", "మొత్తం బాకీ"),
    totalLabel: lt("Total", "మొత్తం"),
  };

  function exportExcel() {
    const headers = [H.id, H.name, H.oldBal, H.principal, H.interest, H.newLoan, H.total];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([r.member_id, `"${r.member_name}"`, r.old_balance, r.principal_collected, r.interest_collected, r.new_loan, r.net_balance].join(","));
    }
    lines.push([H.totalLabel, "", totals.outstanding, totals.principal, totals.interest, totals.newLoan, totals.net].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `master-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    await downloadMasterLedgerPdfCanvas({
      title: lt("Master Ledger", "మాస్టర్ లెడ్జర్"),
      orgName: lt("Society", "సొసైటీ"),
      dateText: new Date().toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      rows,
      totals,
      headers: H,
      fmt: fmtPdf,
      totalLabel: H.totalLabel,
      fileName: `master-ledger-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Link to="/org/accounts-hub" className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {lt("Accounts Hub", "ఖాతాల కేంద్రం")}
        </Link>

        <Card className="p-4 bg-white/95 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-orange-700">{lt("Master Ledger", "మాస్టర్ లెడ్జర్")}</h1>
              <p className="text-xs text-muted-foreground">{lt("Live entries from committee accounts", "కమిటీ ఖాతాల నుండి ప్రత్యక్ష నమోదులు")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => q.refetch()}>
                <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={exportExcel} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="h-4 w-4" /> {lt("Excel", "ఎక్సెల్")}
              </Button>
              <Button size="sm" onClick={exportPDF} variant="outline">
                <FileText className="h-4 w-4" /> {lt("PDF", "పిడిఎఫ్")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 bg-white/95 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50 text-orange-900 text-xs tracking-wide">
                  <th className="px-3 py-2 text-left border-b">{H.id}</th>
                  <th className="px-3 py-2 text-left border-b">{H.name}</th>
                  <th className="px-3 py-2 text-right border-b">{H.oldBal}</th>
                  <th className="px-3 py-2 text-right border-b">{H.principal}</th>
                  <th className="px-3 py-2 text-right border-b">{H.interest}</th>
                  <th className="px-3 py-2 text-right border-b">{H.newLoan}</th>
                  <th className="px-3 py-2 text-right border-b">{H.total}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {q.isLoading ? lt("Loading…", "లోడ్ అవుతోంది…") : lt("No members", "సభ్యులు లేరు")}
                  </td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.member_id} className={i % 2 ? "bg-white" : "bg-orange-50/30"}>
                    <td className="px-3 py-2 border-b font-mono text-xs">{r.member_id}</td>
                    <td className="px-3 py-2 border-b">{r.member_name}</td>
                    <td className="px-3 py-2 border-b text-right">{fmt(r.old_balance)}</td>
                    <td className="px-3 py-2 border-b text-right text-green-700">{fmt(r.principal_collected)}</td>
                    <td className="px-3 py-2 border-b text-right text-green-700">{fmt(r.interest_collected)}</td>
                    <td className="px-3 py-2 border-b text-right text-red-700">{fmt(r.new_loan)}</td>
                    <td className="px-3 py-2 border-b text-right font-bold">{fmt(r.net_balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-100 font-bold">
                  <td colSpan={2} className="px-3 py-2.5 text-right">{H.totalLabel}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(totals.outstanding)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(totals.principal)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(totals.interest)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(totals.newLoan)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
