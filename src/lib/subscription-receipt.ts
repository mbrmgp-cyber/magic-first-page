// Renders a Subscription Payment Receipt as a printable/downloadable PDF
// using the existing print pipeline (native print → Save as PDF).
import { printDocument, escapeHtml } from "@/lib/print-pdf";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

export type ReceiptOrg = {
  name?: string | null;
  org_code?: string | null;
  email?: string | null;
  phone?: string | null;
  gov_reg_number?: string | null;
  logo_url?: string | null;
};

export type ReceiptRow = {
  receipt_number: string;
  amount: number | string;
  currency: string;
  period_start?: string | null;
  period_end: string;
  paid_on: string;
  payment_method?: string | null;
  status?: string | null;
  notes?: string | null;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function fmtAmount(a: number | string, ccy: string): string {
  const n = typeof a === "number" ? a : Number(a || 0);
  const symbol = ccy === "INR" ? "Rs." : ccy.toUpperCase();
  const s = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${s}`;
}

export function printReceipt(org: ReceiptOrg | null | undefined, r: ReceiptRow) {
  const rows: Array<[string, string]> = [
    ["Receipt No.", r.receipt_number],
    ["Paid On", fmtDate(r.paid_on)],
    ["Organization", org?.name ?? "—"],
    ["Org Code", org?.org_code ?? "—"],
    ["Contact", [org?.email, org?.phone].filter(Boolean).join(" · ") || "—"],
    ...(org?.gov_reg_number ? ([["Reg No.", org.gov_reg_number]] as Array<[string, string]>) : []),
    ["Validity Period", `${fmtDate(r.period_start)} → ${fmtDate(r.period_end)}`],
    ["Payment Method", (r.payment_method || "other").toUpperCase()],
    ["Amount Paid", fmtAmount(r.amount, r.currency)],
    ["Status", (r.status || "paid").toUpperCase()],
  ];
  const kv = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="width:35%;font-weight:600;color:#333;">${escapeHtml(k)}</td>
          <td>${escapeHtml(v)}</td>
        </tr>`,
    )
    .join("");

  const notes = r.notes
    ? `<h2>Notes</h2><p style="white-space:pre-wrap;">${escapeHtml(r.notes)}</p>`
    : "";

  const bodyHtml = `
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="display:inline-block;padding:6px 18px;border:2px solid #16a34a;color:#16a34a;font-weight:800;letter-spacing:2px;border-radius:6px;font-size:16px;">
        PAID
      </div>
    </div>
    <h2>Payment Receipt</h2>
    <table>
      <tbody>${kv}</tbody>
    </table>
    ${notes}
    <p style="margin-top:16px;font-size:11px;color:#555;">
      This is a system-generated receipt for the MBR App yearly subscription payment.
      Please retain this document for your records.
    </p>
    <div style="margin-top:32px;display:flex;justify-content:space-between;font-size:11px;">
      <div>______________________<br/><b>Received By</b><br/>MBR Platform</div>
      <div style="text-align:right;">______________________<br/><b>Authorized Signature</b></div>
    </div>
  `;

  printDocument({
    title: `Receipt ${r.receipt_number}`,
    orgName: "MBR Platform",
    subtitle: `Subscription Receipt · ${org?.name ?? ""}`,
    logoUrl: org?.logo_url ?? null,
    bodyHtml,
  });
}
