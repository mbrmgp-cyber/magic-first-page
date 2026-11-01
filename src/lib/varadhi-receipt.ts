// Vaaradhi subscription receipt — printable PDF with Super Admin + District Admin signatures.
import { printDocument, escapeHtml } from "@/lib/print-pdf";
import varadhiLogo from "@/assets/logos/vaaradhi-logo-concept-1.png";
import bhaskarSig from "@/assets/bhaskar-signature.png.asset.json";

export type VaradhiReceipt = {
  receipt_no: string;
  plan: string;
  amount: number;
  status: string;
  starts_at: string;
  expires_at: string;
  payment_ref?: string | null;
  payer_name?: string | null;
  payer_phone?: string | null;
  area?: string | null;
  district_admin_name?: string | null;
};

const PLAN_TE: Record<string, string> = {
  "1m": "1 నెల",
  "3m": "3 నెలలు",
  "6m": "6 నెలలు",
  "1y": "1 సంవత్సరం",
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(iso);
  }
}

export function printVaradhiReceipt(r: VaradhiReceipt) {
  const rows: Array<[string, string]> = [
    ["రసీదు నంబర్", r.receipt_no],
    ["పేరు", r.payer_name || "—"],
    ["ఫోన్", r.payer_phone || "—"],
    ["ప్రాంతం", r.area || "—"],
    ["ప్లాన్", PLAN_TE[r.plan] ?? r.plan],
    ["చెల్లించిన మొత్తం", `Rs. ${Number(r.amount || 0).toLocaleString("en-IN")}`],
    ["ప్రారంభం", fmtDate(r.starts_at)],
    ["ముగింపు", fmtDate(r.expires_at)],
    ["స్థితి", (r.status || "").toUpperCase()],
    ...(r.payment_ref ? ([["రిఫరెన్స్", r.payment_ref]] as Array<[string, string]>) : []),
  ];

  const kv = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="width:38%;font-weight:600;color:#333;">${escapeHtml(k)}</td>
          <td>${escapeHtml(v)}</td>
        </tr>`,
    )
    .join("");

  const bodyHtml = `
    <div style="text-align:center;margin:8px 0 16px;">
      <div style="display:inline-block;padding:6px 18px;border:2px solid #16a34a;color:#16a34a;font-weight:800;letter-spacing:2px;border-radius:6px;font-size:16px;">
        PAID
      </div>
    </div>
    <h2>సబ్‌స్క్రిప్షన్ రసీదు</h2>
    <table><tbody>${kv}</tbody></table>
    <p style="margin-top:14px;font-size:11px;color:#555;">
      ఇది వారధి యాప్ సబ్‌స్క్రిప్షన్ చెల్లింపునకు సంబంధించిన అధికారిక రసీదు. దయచేసి భద్రపరచుకోండి.
    </p>
    <div style="margin-top:44px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:11px;">
      <div style="flex:1;">
        <img src="${escapeHtml(bhaskarSig.url)}" alt="Signature" style="height:46px;width:auto;display:block;" crossorigin="anonymous" />
        <div style="border-top:1px solid #333;padding-top:3px;margin-top:2px;max-width:220px;">
          <b>సూపర్ అడ్మిన్</b><br/>వారధి ప్లాట్‌ఫామ్
        </div>
      </div>
      <div style="flex:1;text-align:right;">
        <div style="height:46px;"></div>
        <div style="border-top:1px solid #333;padding-top:3px;margin-top:2px;max-width:220px;margin-left:auto;">
          <b>జిల్లా అడ్మిన్</b><br/>${escapeHtml(r.district_admin_name || "—")}
        </div>
      </div>
    </div>
  `;

  printDocument({
    title: `Vaaradhi Receipt ${r.receipt_no}`,
    orgName: "వారధి (VAARADHI)",
    subtitle: "సబ్‌స్క్రిప్షన్ చెల్లింపు రసీదు",
    logoUrl: varadhiLogo,
    bodyHtml,
  });
}
