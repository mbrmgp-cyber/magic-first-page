import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMasterLedger } from "@/lib/accounts.functions";
import { useCurrency } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/org/master-ledger")({
  head: () => ({ meta: [{ title: "మాస్టర్ లెడ్జర్" }] }),
  component: MasterLedgerPage,
});

function MasterLedgerPage() {
  const fetchLedger = useServerFn(getMasterLedger);
  const q = useQuery({ queryKey: ["master-ledger"], queryFn: () => fetchLedger() });
  const { symbol } = useCurrency();
  const fmt = (n: number) => `${symbol} ${Number(n || 0).toLocaleString("en-IN")}`;

  const rows = q.data?.rows ?? [];
  const totals = q.data?.totals ?? { outstanding: 0, principal: 0, interest: 0, newLoan: 0, net: 0 };

  function exportExcel() {
    const headers = ["సభ్యుని ID", "సభ్యుని పేరు", "పాత అప్పు బాకీ", "అసలు జమ", "వడ్డీ జమ", "ఈ రోజు కొత్త అప్పు", "నవీకరించిన మొత్తం"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([r.member_id, `"${r.member_name}"`, r.old_balance, r.principal_collected, r.interest_collected, r.new_loan, r.net_balance].join(","));
    }
    lines.push(["మొత్తం", "", totals.outstanding, totals.principal, totals.interest, totals.newLoan, totals.net].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `master-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    const rowsHtml = rows.map(r => `<tr><td>${r.member_id}</td><td>${r.member_name}</td>
      <td style="text-align:right">${fmt(r.old_balance)}</td>
      <td style="text-align:right">${fmt(r.principal_collected)}</td>
      <td style="text-align:right">${fmt(r.interest_collected)}</td>
      <td style="text-align:right">${fmt(r.new_loan)}</td>
      <td style="text-align:right;font-weight:bold">${fmt(r.net_balance)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Master Ledger</title>
    <style>body{font-family:system-ui;padding:20px}h1{color:#c2410c;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
    th,td{border:1px solid #ddd;padding:6px 8px}th{background:#fff7ed;color:#9a3412}
    tfoot td{background:#dcfce7;font-weight:bold}</style></head><body>
    <h1>చిట్వేల్ హెల్ప్ లైన్ సొసైటీ — మాస్టర్ లెడ్జర్</h1>
    <div style="font-size:11px;color:#666">${new Date().toLocaleString()}</div>
    <table><thead><tr><th>సభ్యుని ID</th><th>పేరు</th><th>పాత బాకీ</th><th>అసలు జమ</th><th>వడ్డీ జమ</th><th>కొత్త అప్పు</th><th>మొత్తం</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr><td colspan="2">మొత్తం</td>
    <td style="text-align:right">${fmt(totals.outstanding)}</td>
    <td style="text-align:right">${fmt(totals.principal)}</td>
    <td style="text-align:right">${fmt(totals.interest)}</td>
    <td style="text-align:right">${fmt(totals.newLoan)}</td>
    <td style="text-align:right">${fmt(totals.net)}</td></tr></tfoot></table>
    <script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Link to="/org/accounts-hub" className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> ఖాతాల కేంద్రం
        </Link>

        <Card className="p-4 bg-white/95 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-orange-700">మాస్టర్ లెడ్జర్</h1>
              <p className="text-xs text-muted-foreground">కమిటీ ఖాతాల నుండి ప్రత్యక్ష నమోదులు</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => q.refetch()}>
                <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={exportExcel} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="h-4 w-4" /> ఎక్సెల్ డౌన్‌లోడ్
              </Button>
              <Button size="sm" onClick={exportPDF} variant="outline">
                <FileText className="h-4 w-4" /> పిడిఎఫ్ డౌన్‌లోడ్
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 bg-white/95 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50 text-orange-900 text-xs tracking-wide">
                  <th className="px-3 py-2 text-left border-b">సభ్యుని ID</th>
                  <th className="px-3 py-2 text-left border-b">పేరు</th>
                  <th className="px-3 py-2 text-right border-b">పాత బాకీ</th>
                  <th className="px-3 py-2 text-right border-b">అసలు జమ</th>
                  <th className="px-3 py-2 text-right border-b">వడ్డీ జమ</th>
                  <th className="px-3 py-2 text-right border-b">కొత్త అప్పు</th>
                  <th className="px-3 py-2 text-right border-b">మొత్తం బాకీ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {q.isLoading ? "లోడ్ అవుతోంది…" : "సభ్యులు లేరు"}
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
                  <td colSpan={2} className="px-3 py-2.5 text-right">మొత్తం</td>
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
