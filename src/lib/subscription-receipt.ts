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
    <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:11px;">
      <div style="flex:1;">
        <div style="display:flex;align-items:flex-end;gap:10px;">
          <img src="${escapeHtml(mbrLogo.url)}" alt="MBR" style="height:44px;width:auto;" crossorigin="anonymous" />
          <div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:26px;color:#1e3a8a;line-height:1;border-bottom:1px solid #333;padding:0 12px 2px;">
            MBR Platform
          </div>
        </div>
        <div style="margin-top:6px;"><b>Received By</b><br/>MBR Platform — Authorized Signatory</div>
      </div>
      <div style="text-align:center;">
        <div style="width:110px;height:110px;border:3px double #16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#16a34a;font-weight:800;font-size:13px;transform:rotate(-12deg);line-height:1.1;text-align:center;">
          PAID<br/>MBR APP<br/><span style="font-size:9px;">${escapeHtml(new Date(r.paid_on).getFullYear().toString())}</span>
        </div>
      </div>
    </div>
  `;

  printDocument({
    title: `Receipt ${r.receipt_number}`,
    orgName: "MBR Platform",
    subtitle: `Subscription Receipt · ${org?.name ?? ""}`,
    logoUrl: mbrLogo.url,
    bodyHtml,
  });
}
