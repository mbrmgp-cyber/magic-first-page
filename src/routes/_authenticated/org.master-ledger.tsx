import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMasterLedger } from "@/lib/accounts.functions";
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
  const fmt = (n: number) => `${symbol} ${Number(n || 0).toLocaleString("en-IN")}`;

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
    await downloadMasterLedgerPdf({
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
      fmt,
      totalLabel: H.totalLabel,
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

type MasterLedgerPdfRow = {
  member_id: string;
  member_name: string;
  old_balance: number;
  principal_collected: number;
  interest_collected: number;
  new_loan: number;
  net_balance: number;
};

type MasterLedgerPdfTotals = {
  outstanding: number;
  principal: number;
  interest: number;
  newLoan: number;
  net: number;
};

type MasterLedgerHeaders = {
  id: string;
  name: string;
  oldBal: string;
  principal: string;
  interest: string;
  newLoan: string;
  total: string;
};

type PdfColumn = {
  label: string;
  width: number;
  align?: CanvasTextAlign;
  value: (row: MasterLedgerPdfRow) => string;
  bold?: boolean;
};

async function downloadMasterLedgerPdf({
  title,
  orgName,
  dateText,
  rows,
  totals,
  headers,
  fmt,
  totalLabel,
}: {
  title: string;
  orgName: string;
  dateText: string;
  rows: MasterLedgerPdfRow[];
  totals: MasterLedgerPdfTotals;
  headers: MasterLedgerHeaders;
  fmt: (n: number) => string;
  totalLabel: string;
}) {
  const { jsPDF } = await import("jspdf");
  await document.fonts?.ready;

  const pageWidth = 1240;
  const pageHeight = 1754;
  const marginX = 56;
  const headerHeight = 206;
  const footerHeight = 78;
  const tableHeaderHeight = 42;
  const rowHeight = 38;
  const totalHeight = 42;

  const columns: PdfColumn[] = [
    { label: headers.id, width: 92, value: (r) => r.member_id },
    { label: headers.name, width: 270, value: (r) => r.member_name },
    { label: headers.oldBal, width: 154, align: "right", value: (r) => fmt(r.old_balance) },
    { label: headers.principal, width: 154, align: "right", value: (r) => fmt(r.principal_collected) },
    { label: headers.interest, width: 154, align: "right", value: (r) => fmt(r.interest_collected) },
    { label: headers.newLoan, width: 154, align: "right", value: (r) => fmt(r.new_loan) },
    { label: headers.total, width: 154, align: "right", value: (r) => fmt(r.net_balance), bold: true },
  ];

  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const rowsPerPage = Math.max(
    1,
    Math.floor((pageHeight - headerHeight - footerHeight - tableHeaderHeight - totalHeight) / rowHeight),
  );
  const rowChunks = rows.length
    ? Array.from({ length: Math.ceil(rows.length / rowsPerPage) }, (_, i) => rows.slice(i * rowsPerPage, (i + 1) * rowsPerPage))
    : [[] as MasterLedgerPdfRow[]];

  const fontFamily = '"Noto Sans Telugu", "Noto Sans", "Segoe UI", Arial, sans-serif';
  const setFont = (ctx: CanvasRenderingContext2D, size: number, weight: number | string = 400) => {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  };
  const drawFittedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    size: number,
    align: CanvasTextAlign = "left",
    weight: number | string = 400,
  ) => {
    const safe = String(text ?? "");
    let fittedSize = size;
    setFont(ctx, fittedSize, weight);
    while (fittedSize > 9 && ctx.measureText(safe).width > width) {
      fittedSize -= 1;
      setFont(ctx, fittedSize, weight);
    }
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const drawX = align === "right" ? x + width : align === "center" ? x + width / 2 : x;
    ctx.fillText(safe, drawX, y);
  };

  const buildPage = (pageRows: MasterLedgerPdfRow[], pageIndex: number, pageCount: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PDF canvas is not available");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    ctx.fillStyle = "#8b1a1a";
    drawFittedText(ctx, orgName, (pageWidth - 540) / 2, 78, 540, 28, "center", 800);
    ctx.fillStyle = "#111111";
    drawFittedText(ctx, title, (pageWidth - 540) / 2, 116, 540, 20, "center", 700);
    ctx.fillStyle = "#555555";
    drawFittedText(ctx, dateText, (pageWidth - 540) / 2, 146, 540, 14, "center", 400);

    const lineY = 176;
    const lineX = marginX;
    const lineW = tableWidth;
    ctx.fillStyle = "#ff9933";
    ctx.fillRect(lineX, lineY, lineW * 0.44, 5);
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(lineX + lineW * 0.44, lineY, lineW * 0.12, 5);
    ctx.fillStyle = "#138808";
    ctx.fillRect(lineX + lineW * 0.56, lineY, lineW * 0.44, 5);

    let y = headerHeight;
    let x = marginX;
    ctx.strokeStyle = "#b8b8b8";
    ctx.lineWidth = 1;
    columns.forEach((col) => {
      ctx.fillStyle = "#f4e6d0";
      ctx.fillRect(x, y, col.width, tableHeaderHeight);
      ctx.strokeRect(x, y, col.width, tableHeaderHeight);
      ctx.fillStyle = "#111111";
      drawFittedText(ctx, col.label, x + 8, y + tableHeaderHeight / 2, col.width - 16, 13, col.align ?? "left", 700);
      x += col.width;
    });

    y += tableHeaderHeight;
    pageRows.forEach((row, index) => {
      x = marginX;
      ctx.fillStyle = index % 2 ? "#ffffff" : "#fff7ed";
      ctx.fillRect(marginX, y, tableWidth, rowHeight);
      columns.forEach((col) => {
        ctx.strokeStyle = "#c4c4c4";
        ctx.strokeRect(x, y, col.width, rowHeight);
        ctx.fillStyle = "#111111";
        drawFittedText(ctx, col.value(row), x + 8, y + rowHeight / 2, col.width - 16, 13, col.align ?? "left", col.bold ? 700 : 400);
        x += col.width;
      });
      y += rowHeight;
    });

    if (pageIndex === pageCount - 1) {
      x = marginX;
      ctx.fillStyle = "#dcfce7";
      ctx.fillRect(marginX, y, tableWidth, totalHeight);
      const totalValues = [
        totalLabel,
        "",
        fmt(totals.outstanding),
        fmt(totals.principal),
        fmt(totals.interest),
        fmt(totals.newLoan),
        fmt(totals.net),
      ];
      columns.forEach((col, index) => {
        ctx.strokeStyle = "#a8c8ad";
        ctx.strokeRect(x, y, col.width, totalHeight);
        ctx.fillStyle = "#111111";
        const label = index === 0 ? totalValues[0] : index === 1 ? "" : totalValues[index];
        drawFittedText(ctx, label, x + 8, y + totalHeight / 2, col.width - 16, 14, index < 2 ? "left" : "right", 800);
        x += col.width;
      });
    }

    const footerY = pageHeight - 54;
    ctx.strokeStyle = "#dddddd";
    ctx.beginPath();
    ctx.moveTo(marginX, footerY - 18);
    ctx.lineTo(marginX + tableWidth, footerY - 18);
    ctx.stroke();
    ctx.fillStyle = "#666666";
    drawFittedText(ctx, `Download from MBR APP · ${pageIndex + 1}/${pageCount}`, (pageWidth - 520) / 2, footerY, 520, 12, "center", 400);

    return canvas;
  };

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  rowChunks.forEach((chunk, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    const canvas = buildPage(chunk, index, rowChunks.length);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  });
  pdf.save(`master-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
}
