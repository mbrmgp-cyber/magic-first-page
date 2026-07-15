import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function resolveAsset(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\/|^data:/i.test(path)) return path;
  const { data } = await supabase.storage.from("loan-proofs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

const safe = (s: any) => String(s ?? "")
  .replace(/₹/g, "Rs.")
  .replace(/రూ\.?/g, "Rs.")
  .replace(/د\.إ/g, "AED")
  .replace(/د\.ك/g, "KWD");
const esc = (s: any) => safe(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

async function fetchOrg(org_id: string) {
  const { data } = await supabase
    .from("organizations")
    .select("name, logo_url, slogan, gov_reg_number, phone, email, president_name")
    .eq("id", org_id).maybeSingle();
  return data;
}

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

const baseStyles = `
@page { size: A4; margin: 14mm; }
@font-face { font-family:'Noto Sans Telugu'; src:url('/fonts/NotoSansTelugu-Regular.ttf') format('truetype'); font-weight:400; font-style:normal; }
@font-face { font-family:'Noto Sans Telugu'; src:url('/fonts/NotoSansTelugu-Bold.ttf') format('truetype'); font-weight:700 900; font-style:normal; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans Telugu','Inter',Arial,sans-serif; color:#111; margin:0; font-size:12px; line-height:1.45; }
.header { display:flex; align-items:center; gap:14px; border-bottom:2px solid #b45309; padding-bottom:10px; margin-bottom:14px; }
.header img { height:64px; width:64px; object-fit:contain; }
.header h1 { font-size:20px; margin:0; color:#7c2d12; }
.header .meta { font-size:11px; color:#444; margin-top:2px; }
h2 { font-size:13px; margin:18px 0 6px; padding:4px 8px; background:#fef3c7; border-left:4px solid #d97706; color:#7c2d12; }
table.kv { width:100%; border-collapse:collapse; }
table.kv td { padding:5px 8px; border-bottom:1px dashed #ddd; vertical-align:top; }
table.kv td.k { width:32%; color:#555; font-weight:600; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
.box { border:1px solid #d4d4d8; border-radius:6px; padding:10px; }
.box .lbl { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
.sigbox { height:90px; border:1px dashed #9ca3af; border-radius:4px; display:flex; align-items:center; justify-content:center; background:#fff; }
.sigbox img { max-height:86px; max-width:100%; object-fit:contain; }
.proof { max-height:220px; max-width:100%; object-fit:contain; border:1px solid #e5e7eb; border-radius:4px; padding:4px; background:#fff; }
.footer-sigs { margin-top:30px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; }
.footer-sigs .slot { text-align:center; padding-top:50px; border-top:1px solid #111; font-size:11px; }
.stamp { display:inline-block; padding:3px 10px; border:2px solid #047857; color:#047857; border-radius:4px; font-weight:700; font-size:11px; letter-spacing:1px; }
.stamp.rej { border-color:#b91c1c; color:#b91c1c; }
.stamp.pen { border-color:#b45309; color:#b45309; }
.stamp.wait { border-color:#a16207; color:#a16207; }
.title-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.doc-title { font-size:16px; font-weight:700; color:#7c2d12; }
.ref { font-size:11px; color:#555; }
.timeline { border-left:2px solid #d97706; padding-left:12px; margin:8px 0; }
.timeline .step { margin-bottom:8px; font-size:11px; }
.timeline .step b { color:#7c2d12; }
@media print { .noprint { display:none !important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
.noprint { position:fixed; top:10px; right:10px; display:flex; gap:8px; z-index:9999; }
.noprint button { background:#d97706; color:white; border:0; padding:8px 14px; border-radius:4px; cursor:pointer; font-weight:600; }
.noprint button.back { background:#374151; }
`;

function headerBlock(org: any) {
  return `<div class="header">
    ${org?.logo_url ? `<img src="${esc(org.logo_url)}" />` : ""}
    <div style="flex:1">
      <h1>${esc(org?.name ?? "Organization")}</h1>
      <div class="meta">
        ${org?.slogan ? esc(org.slogan) + " · " : ""}
        ${org?.gov_reg_number ? "Reg No: " + esc(org.gov_reg_number) : ""}
        ${org?.phone ? " · ☎ " + esc(org.phone) : ""}
        ${org?.email ? " · " + esc(org.email) : ""}
      </div>
    </div>
  </div>`;
}

function statusStamp(r: any) {
  if (r.status === "approved") return '<span class="stamp">APPROVED</span>';
  if (r.status === "rejected") return '<span class="stamp rej">REJECTED</span>';
  if (r.surety_member_id && r.surety_status === "awaiting") return '<span class="stamp wait">AWAITING SURETY</span>';
  if (r.surety_status === "declined") return '<span class="stamp rej">SURETY DECLINED</span>';
  return '<span class="stamp pen">PENDING</span>';
}

const T = {
  accepted: "ఆమోదించబడింది",
  declined: "తిరస్కరించబడింది",
  awaiting: "ఎదురుచూస్తోంది",
  approved: "ఆమోదించబడింది",
  rejected: "తిరస్కరించబడింది",
  pending: "పెండింగ్‌లో ఉంది",
  noDoc: "ఏ పత్రం అప్‌లోడ్ చేయలేదు",
  noSurety: "షూరిటీ లేరు",
  notProvided: "ఇవ్వలేదు",
};
const tenure = (n: any) => (n ? `${n} నెలలు` : "—");
const statusLabel = (s: string) => (T as any)[s] ?? s;

function timelineBlock(r: any) {
  const steps = [
    { label: "దరఖాస్తు సమర్పణ / Submitted by applicant", at: r.created_at, done: true },
    {
      label: r.surety_member_id ? "షూరిటీ సమ్మతి / Surety consent" : "షూరిటీ అవసరం లేదు / No surety required",
      at: r.surety_responded_at,
      done: !r.surety_member_id || r.surety_status === "accepted" || r.surety_status === "declined",
      note: r.surety_status === "declined" ? `${T.declined}${r.surety_decline_reason ? ` — ${r.surety_decline_reason}` : ""}` :
            r.surety_status === "accepted" ? T.accepted :
            r.surety_status === "awaiting" ? T.awaiting : "",
    },
    {
      label: "కార్యవర్గ సమీక్ష / Committee review",
      at: r.reviewed_at,
      done: r.status !== "pending",
      note: r.status === "approved" ? `${T.approved} · UTR ${r.utr_number ?? ""}` :
            r.status === "rejected" ? `${T.rejected}${r.reject_reason ? ` — ${r.reject_reason}` : ""}` : T.pending,
    },
  ];
  return `<div class="timeline">${steps.map(s => `
    <div class="step">
      <b>${s.done ? "✓" : "○"} ${esc(s.label)}</b>
      ${s.at ? ` · ${fmtDate(s.at)}` : ""}
      ${s.note ? ` <span style="color:#555">— ${esc(s.note)}</span>` : ""}
    </div>`).join("")}</div>`;
}

/** Full application: borrower + surety + committee. Used by admin and surety. */
export async function printLoanApplication(r: any) {
  const org = await fetchOrg(r.org_id);
  const [sigUrl, proofUrl, suretySigUrl] = await Promise.all([
    resolveAsset(r.signature_data_url),
    resolveAsset(r.proof_url),
    resolveAsset(r.surety_signature_url),
  ]);

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Loan Application — ${esc(r.member?.name ?? "")}</title>
<style>${baseStyles}</style></head><body>
<div class="noprint"><button class="back" onclick="try{window.close()}catch(e){};history.back()">← వెనుకకు / Back</button><button onclick="window.print()">🖨 Print / Save PDF</button></div>
${headerBlock(org)}

<div class="title-row">
  <div class="doc-title">లోన్ దరఖాస్తు / Loan Application Form</div>
  <div class="ref">Ref: ${esc(String(r.id).slice(0,8).toUpperCase())} · ${statusStamp(r)}</div>
</div>

<h2>దరఖాస్తుదారు వివరాలు / Applicant Details</h2>
<table class="kv">
  <tr><td class="k">పేరు / Name</td><td>${esc(r.member?.name)}</td>
      <td class="k">సభ్యుని ID / Member ID</td><td>${esc(r.member?.member_code)}</td></tr>
  <tr><td class="k">ఫోన్ / Phone</td><td>${esc(r.member?.phone ?? "—")}</td>
      <td class="k">దరఖాస్తు తేదీ / Applied On</td><td>${fmtDate(r.created_at)}</td></tr>
</table>

<h2>లోన్ వివరాలు / Loan Details</h2>
<table class="kv">
  <tr><td class="k">మొత్తం / Amount</td><td><b>Rs. ${Number(r.requested_amount).toLocaleString("en-IN")}</b></td>
      <td class="k">కాలవ్యవధి / Tenure</td><td>${tenure(r.tenure_months)}</td></tr>
  <tr><td class="k">వడ్డీ / Interest</td><td>${r.interest_rate_monthly ?? "—"} % / month</td>
      <td class="k">UTR</td><td>${esc(r.utr_number ?? "—")}</td></tr>
  <tr><td class="k">కారణం / Purpose</td><td colspan="3">${esc(r.reason)}</td></tr>
</table>

<h2>ప్రాసెస్ టైమ్‌లైన్ / Process Timeline</h2>
${timelineBlock(r)}

<h2>సంతకాలు & ధృవీకరణ పత్రాలు / Signatures & Proofs</h2>
<div class="grid2">
  <div class="box">
    <div class="lbl">దరఖాస్తుదారు సంతకం / Applicant Signature</div>
    <div class="sigbox">${sigUrl ? `<img src="${esc(sigUrl)}" />` : "— Not provided —"}</div>
    <div style="margin-top:8px; font-size:11px;"><b>${esc(r.member?.name)}</b> · ${esc(r.member?.member_code)}</div>
  </div>
  <div class="box">
    <div class="lbl">హామీదారు సంతకం / Surety Signature</div>
    <div class="sigbox">${suretySigUrl ? `<img src="${esc(suretySigUrl)}" />` :
      (r.surety?.name || r.surety_member_code ? esc(statusLabel(r.surety_status ?? "pending")) : esc(T.noSurety))}</div>
    <div style="margin-top:8px; font-size:11px;">
      ${r.surety?.name ? `<b>${esc(r.surety.name)}</b> · ${esc(r.surety.member_code)}` :
        (r.surety_member_code ? `Code: ${esc(r.surety_member_code)}` : "—")}
      ${r.surety_responded_at ? ` · ${fmtDate(r.surety_responded_at)}` : ""}
    </div>
  </div>
</div>

<div class="box" style="margin-top:12px;">
  <div class="lbl">ధృవీకరణ పత్రం / Uploaded Proof Document</div>
  <div style="text-align:center;">
    ${proofUrl ? `<img class="proof" src="${esc(proofUrl)}" />` : `— ${esc(T.noDoc)} —`}
  </div>
</div>

<div class="footer-sigs">
  <div class="slot">కార్యదర్శి సంతకం<br/>Secretary</div>
  <div class="slot">కోశాధికారి సంతకం<br/>Treasurer</div>
  <div class="slot">${esc(org?.president_name ?? "అధ్యక్షుడు")}<br/>President</div>
</div>
<div style="text-align:center; margin-top:14px; font-size:10px; color:#6b7280;">
  కార్యవర్గ నిర్వాహకుల సంతకం / Working Committee Signatures
</div>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

  openPrint(html);
}

/** Surety-side consent receipt: a short slip the surety can print after responding. */
export async function printSuretyConsent(r: any) {
  const org = await fetchOrg(r.org_id);
  const [sigUrl] = await Promise.all([resolveAsset(r.surety_signature_url)]);

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Surety Consent — ${esc(r.member?.name ?? "")}</title>
<style>${baseStyles}</style></head><body>
<div class="noprint"><button class="back" onclick="try{window.close()}catch(e){};history.back()">← వెనుకకు / Back</button><button onclick="window.print()">🖨 Print / Save PDF</button></div>
${headerBlock(org)}

<div class="title-row">
  <div class="doc-title">షూరిటీ సమ్మతి పత్రం / Surety Consent</div>
  <div class="ref">Ref: ${esc(String(r.id).slice(0,8).toUpperCase())} · ${statusStamp(r)}</div>
</div>

<table class="kv">
  <tr><td class="k">దరఖాస్తుదారు / Applicant</td><td>${esc(r.member?.name)} (${esc(r.member?.member_code)})</td>
      <td class="k">మొత్తం / Amount</td><td><b>Rs. ${Number(r.requested_amount).toLocaleString("en-IN")}</b></td></tr>
  <tr><td class="k">కారణం / Purpose</td><td colspan="3">${esc(r.reason)}</td></tr>
  <tr><td class="k">షూరిటీ స్థితి / Surety Status</td><td>${esc(statusLabel(r.surety_status))}</td>
      <td class="k">స్పందించిన తేదీ / Responded At</td><td>${fmtDate(r.surety_responded_at)}</td></tr>
  ${r.surety_decline_reason ? `<tr><td class="k">కారణం / Reason</td><td colspan="3">${esc(r.surety_decline_reason)}</td></tr>` : ""}
</table>

<div class="box" style="margin-top:14px;">
  <div class="lbl">షూరిటీ సంతకం / Surety Signature</div>
  <div class="sigbox">${sigUrl ? `<img src="${esc(sigUrl)}" />` : `— ${esc(T.notProvided)} —`}</div>
</div>

<p style="margin-top:18px; font-size:11px; color:#444;">
  నేను పైన పేర్కొన్న దరఖాస్తుదారికి షూరిటీగా ఉండటానికి స్వచ్ఛందంగా సమ్మతిస్తున్నాను.
  I willingly consent to act as surety for the applicant named above.
</p>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;
  openPrint(html);
}
