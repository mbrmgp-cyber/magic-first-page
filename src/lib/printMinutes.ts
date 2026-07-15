import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Lang = "en" | "te" | string;

const safe = (s: any) => String(s ?? "")
  .replace(/₹/g, "Rs.")
  .replace(/రూ\.?/g, "Rs.")
  .replace(/د\.إ/g, "AED")
  .replace(/د\.ك/g, "KWD");
const esc = (s: any) => safe(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const fmtDate = (d?: string | null, lang: Lang = "en") =>
  d ? new Date(d).toLocaleString(lang === "te" ? "te-IN" : "en-IN", { dateStyle: "long", timeStyle: "short" }) : "—";

const L = (lang: Lang, en: string, te: string) => (lang === "te" ? te : en);

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  const withToolbar = html.replace(/<body[^>]*>/, (m) => `${m}${toolbar}<div class="page">`).replace("</body>", "</div></body>");
  w.document.open(); w.document.write(withToolbar); w.document.close();
}

const styles = `
@page { size: A4; margin: 14mm; }
@font-face { font-family:'Noto Sans Telugu'; src:url('/fonts/NotoSansTelugu-Regular.ttf') format('truetype'); font-weight:400; font-style:normal; }
@font-face { font-family:'Noto Sans Telugu'; src:url('/fonts/NotoSansTelugu-Bold.ttf') format('truetype'); font-weight:700 900; font-style:normal; }
* { box-sizing: border-box; }
body { font-family:'Noto Sans Telugu','Inter',Arial,sans-serif; color:#111; margin:0; font-size:12px; line-height:1.5; }
.header { display:flex; align-items:center; gap:14px; border-bottom:2px solid #b45309; padding-bottom:10px; margin-bottom:14px; }
.header img { height:64px; width:64px; object-fit:contain; }
.header h1 { font-size:20px; margin:0; color:#7c2d12; }
.header .meta { font-size:11px; color:#444; margin-top:2px; }
.doc-title { text-align:center; font-size:16px; font-weight:700; color:#7c2d12; margin:12px 0; text-transform:uppercase; letter-spacing:1px; }
h2 { font-size:13px; margin:16px 0 6px; padding:4px 8px; background:#fef3c7; border-left:4px solid #d97706; color:#7c2d12; }
table.kv { width:100%; border-collapse:collapse; margin-bottom:8px; }
table.kv td { padding:5px 8px; border-bottom:1px dashed #ddd; vertical-align:top; }
table.kv td.k { width:30%; color:#555; font-weight:600; }
.box { border:1px solid #d4d4d8; border-radius:6px; padding:10px; margin-bottom:10px; }
.res { border:1px solid #d4d4d8; border-radius:6px; padding:10px; margin-bottom:10px; page-break-inside:avoid; }
.res .rno { display:inline-block; padding:2px 8px; background:#7c2d12; color:#fff; border-radius:4px; font-size:10px; font-weight:700; margin-right:8px; }
.res .topic { font-weight:700; font-size:13px; color:#111; }
.res .desc { margin-top:6px; color:#333; white-space:pre-wrap; }
.vote { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; }
.vote .cell { border:1px solid #e5e7eb; border-radius:4px; padding:6px 8px; font-size:11px; }
.vote .cell.app { background:#ecfdf5; border-color:#10b981; }
.vote .cell.opp { background:#fef2f2; border-color:#ef4444; }
.vote .cell b { display:block; margin-bottom:4px; }
.absent { background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:8px 10px; font-size:11px; color:#7f1d1d; }
.footer-sigs { margin-top:36px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; }
.footer-sigs .slot { text-align:center; padding-top:50px; border-top:1px solid #111; font-size:11px; }
.muted { color:#6b7280; font-size:11px; }
.toolbar { position:fixed; top:0; left:0; right:0; background:#7c2d12; color:#fff; padding:10px 12px; display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; z-index:9999; box-shadow:0 2px 8px rgba(0,0,0,.2); }
.toolbar .tb-title { font-weight:700; font-size:13px; }
.toolbar .tb-actions { display:flex; gap:8px; flex-wrap:wrap; }
.toolbar button { border:none; padding:10px 16px; border-radius:8px; font-weight:800; cursor:pointer; font-size:14px; min-height:44px; }
.toolbar button.print-btn { background:#fff; color:#7c2d12; }
.toolbar button.close-btn { background:#dc2626; color:#fff; border:2px solid #fff; padding:12px 20px; font-size:15px; box-shadow:0 2px 6px rgba(0,0,0,.35); }
.toolbar button.close-btn:hover { background:#b91c1c; }
@media (max-width: 520px) {
  .toolbar { flex-direction:column; align-items:stretch; }
  .toolbar .tb-title { text-align:center; }
  .toolbar .tb-actions { justify-content:stretch; }
  .toolbar .tb-actions button { flex:1; }
}
.page { margin-top:80px; }
@media print { .toolbar { display:none !important; } .page { margin-top:0; } }
`;

const toolbar = `<div class="toolbar no-print">
  <div class="tb-title">📄 Print Preview</div>
  <div class="tb-actions">
    <button type="button" class="close-btn" onclick="(function(){try{window.close();}catch(e){} setTimeout(function(){ if(!window.closed){ if(window.opener){ try{window.opener.focus();}catch(e){} } if(history.length>1){ history.back(); } else { window.location.href='about:blank'; } } },120);})()">✕</button>
    <button type="button" class="print-btn" onclick="window.print()">🖨 Print</button>
  </div>
</div>`;

type Org = { name?: string; logo_url?: string; gov_reg_number?: string; phone?: string; email?: string; president_name?: string };
type Member = { id: string; name: string; member_code?: string | null };
type Resolution = {
  id: string;
  resolution_no: string;
  topic: string;
  description?: string | null;
  decision_date: string;
  status: string;
  approved_member_ids: string[];
  opposed_member_ids: string[];
};
type Meeting = {
  id: string;
  title: string;
  agenda?: string | null;
  meeting_type: "online" | "offline";
  scheduled_at: string;
  location?: string | null;
  meeting_link?: string | null;
  status: string;
  attended_member_ids: string[];
  absent_member_ids: string[];
  notes?: string | null;
};

async function fetchOrg(orgId: string): Promise<Org> {
  const { data } = await supabase
    .from("organizations")
    .select("name, logo_url, gov_reg_number, phone, email")
    .eq("id", orgId).maybeSingle();
  const { data: pres } = await supabase
    .from("committee_members")
    .select("member_id, members:member_id(name)")
    .eq("org_id", orgId)
    .eq("role", "president")
    .eq("is_active", true)
    .maybeSingle();
  const president_name = (pres as any)?.members?.name ?? undefined;
  return { ...((data as any) ?? {}), president_name };
}

function presidentSlot(org: Org, lang: Lang) {
  return `<div class="slot">${org.president_name ? `<div style="font-weight:700;margin-bottom:2px;">${esc(org.president_name)}</div>` : ""}${L(lang, "President", "అధ్యక్షుడు")}</div>`;
}
function sigRow(org: Org, lang: Lang) {
  return `<div class="footer-sigs">
    ${presidentSlot(org, lang)}
    <div class="slot">${L(lang, "Secretary", "కార్యదర్శి")}</div>
    <div class="slot">${L(lang, "Treasurer", "కోశాధికారి")}</div>
  </div>`;
}

function header(org: Org, lang: Lang) {
  return `<div class="header">
    ${org.logo_url ? `<img src="${esc(org.logo_url)}" />` : ""}
    <div>
      <h1>${esc(org.name || (lang === "te" ? "సంస్థ" : "Organization"))}</h1>
      <div class="meta">
        ${org.gov_reg_number ? `${L(lang, "Reg No", "నమోదు సంఖ్య")}: ${esc(org.gov_reg_number)}` : ""}
        ${org.phone ? ` · ☎ ${esc(org.phone)}` : ""}
        ${org.email ? ` · ✉ ${esc(org.email)}` : ""}
      </div>
    </div>
  </div>`;
}

function namesList(ids: string[], members: Member[], lang: Lang) {
  if (!ids?.length) return `<span class="muted">— ${L(lang, "None", "ఎవరూ లేరు")} —</span>`;
  return ids.map((id) => {
    const m = members.find((x) => x.id === id);
    if (!m) return null;
    return `<div>• ${esc(m.name)}${m.member_code ? ` <span class="muted">(${esc(m.member_code)})</span>` : ""}</div>`;
  }).filter(Boolean).join("");
}

export async function printMeetingMinutes(opts: {
  orgId: string;
  meeting: Meeting;
  resolutions: Resolution[];
  members: Member[];
  lang?: Lang;
}) {
  const lang: Lang = opts.lang ?? "en";
  const org = await fetchOrg(opts.orgId);
  const { meeting, resolutions, members } = opts;

  const statusTxt = (s: string) => {
    if (lang !== "te") return s;
    if (s === "completed") return "పూర్తయింది";
    if (s === "scheduled") return "నిర్ధారితమైంది";
    if (s === "cancelled") return "రద్దు";
    return s;
  };

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${L(lang, "Meeting Minutes", "సమావేశ నివేదిక")} - ${esc(meeting.title)}</title>
  <style>${styles}</style></head><body>
  ${header(org, lang)}
  <div class="doc-title">${L(lang, "Meeting Minutes", "సమావేశ నివేదిక")}</div>

  <table class="kv">
    <tr><td class="k">${L(lang, "Title", "శీర్షిక")}</td><td>${esc(meeting.title)}</td></tr>
    <tr><td class="k">${L(lang, "Date / Time", "తేదీ / సమయం")}</td><td>${esc(fmtDate(meeting.scheduled_at, lang))}</td></tr>
    <tr><td class="k">${L(lang, "Mode", "విధానం")}</td><td>${meeting.meeting_type === "online" ? L(lang, "Online", "ఆన్‌లైన్") : L(lang, "Offline", "ఆఫ్‌లైన్")}</td></tr>
    ${meeting.location ? `<tr><td class="k">${L(lang, "Venue", "వేదిక")}</td><td>${esc(meeting.location)}</td></tr>` : ""}
    ${meeting.meeting_link ? `<tr><td class="k">${L(lang, "Link", "లింక్")}</td><td>${esc(meeting.meeting_link)}</td></tr>` : ""}
    <tr><td class="k">${L(lang, "Status", "స్థితి")}</td><td>${esc(statusTxt(meeting.status))}</td></tr>
  </table>

  ${meeting.agenda ? `<h2>${L(lang, "Agenda", "అజెండా")}</h2><div class="box">${esc(meeting.agenda).replace(/\n/g, "<br/>")}</div>` : ""}

  <h2>${L(lang, "Attended", "హాజరైన వారు")} (${meeting.attended_member_ids.length})</h2>
  <div class="box">${namesList(meeting.attended_member_ids, members, lang)}</div>

  <h2>${L(lang, "Absent", "గైర్హాజరైన వారు")} (${meeting.absent_member_ids.length})</h2>
  <div class="absent">${namesList(meeting.absent_member_ids, members, lang)}</div>

  ${resolutions.length ? `<h2>${L(lang, "Resolutions", "నిర్ణయాలు")}</h2>
    ${resolutions.map((r) => `
      <div class="res">
        <div><span class="rno">${esc(r.resolution_no)}</span><span class="topic">${esc(r.topic)}</span></div>
        ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ""}
        <div class="vote">
          <div class="cell app"><b>${L(lang, "Approved", "ఆమోదించిన వారు")} (${r.approved_member_ids.length})</b>${namesList(r.approved_member_ids, members, lang)}</div>
          <div class="cell opp"><b>${L(lang, "Opposed", "వ్యతిరేకించిన వారు")} (${r.opposed_member_ids.length})</b>${namesList(r.opposed_member_ids, members, lang)}</div>
        </div>
      </div>`).join("")}` : ""}

  ${meeting.notes ? `<h2>${L(lang, "Additional Notes", "అదనపు గమనికలు")}</h2><div class="box">${esc(meeting.notes).replace(/\n/g, "<br/>")}</div>` : ""}

  ${sigRow(org, lang)}

  </body></html>`;

  openPrint(html);
}

export async function printResolution(opts: {
  orgId: string;
  resolution: Resolution;
  members: Member[];
  lang?: Lang;
}) {
  const lang: Lang = opts.lang ?? "en";
  const org = await fetchOrg(opts.orgId);
  const { resolution: r, members } = opts;
  const statusTxt = r.status === "passed"
    ? L(lang, "Passed", "ఆమోదించబడింది")
    : r.status === "rejected"
      ? L(lang, "Rejected", "తిరస్కరించబడింది")
      : L(lang, "Pending", "పెండింగ్‌లో");
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${L(lang, "Resolution", "నిర్ణయం")} ${esc(r.resolution_no)}</title>
  <style>${styles}</style></head><body>
  ${header(org, lang)}
  <div class="doc-title">${L(lang, "Official Resolution", "అధికారిక నిర్ణయం")}</div>
  <table class="kv">
    <tr><td class="k">${L(lang, "Resolution No", "నిర్ణయ సంఖ్య")}</td><td>${esc(r.resolution_no)}</td></tr>
    <tr><td class="k">${L(lang, "Date", "తేదీ")}</td><td>${esc(new Date(r.decision_date).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { dateStyle: "long" }))}</td></tr>
    <tr><td class="k">${L(lang, "Title", "శీర్షిక")}</td><td>${esc(r.topic)}</td></tr>
    <tr><td class="k">${L(lang, "Status", "స్థితి")}</td><td>${statusTxt}</td></tr>
  </table>
  ${r.description ? `<h2>${L(lang, "Description", "వివరణ")}</h2><div class="box">${esc(r.description).replace(/\n/g, "<br/>")}</div>` : ""}
  <h2>${L(lang, "Voting Details", "ఓటింగ్ వివరాలు")}</h2>
  <div class="vote">
    <div class="cell app"><b>${L(lang, "Approved", "ఆమోదించిన వారు")} (${r.approved_member_ids.length})</b>${namesList(r.approved_member_ids, members, lang)}</div>
    <div class="cell opp"><b>${L(lang, "Opposed", "వ్యతిరేకించిన వారు")} (${r.opposed_member_ids.length})</b>${namesList(r.opposed_member_ids, members, lang)}</div>
  </div>
  ${sigRow(org, lang)}
  </body></html>`;
  openPrint(html);
}

export async function printActivity(opts: {
  orgId: string;
  activity: {
    id: string;
    event_name: string;
    event_date: string;
    description?: string | null;
    allocated_budget: number | string;
    actual_expense: number | string;
    status: string;
  };
  lang?: Lang;
}) {
  const lang: Lang = opts.lang ?? "en";
  const org = await fetchOrg(opts.orgId);
  const a = opts.activity;
  const budget = Number(a.allocated_budget) || 0;
  const expense = Number(a.actual_expense) || 0;
  const variance = budget - expense;
  const inr = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;
  const statusTxt =
    a.status === "completed" ? L(lang, "Completed", "పూర్తయింది") :
    a.status === "ongoing" ? L(lang, "Ongoing", "జరుగుతోంది") :
    a.status === "cancelled" ? L(lang, "Cancelled", "రద్దు") :
    L(lang, "Planned", "ప్రణాళిక");
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${L(lang, "Activity", "కార్యక్రమం")} - ${esc(a.event_name)}</title>
  <style>${styles}</style></head><body>
  ${header(org, lang)}
  <div class="doc-title">${L(lang, "Activity Report", "కార్యక్రమ నివేదిక")}</div>
  <table class="kv">
    <tr><td class="k">${L(lang, "Event", "పేరు")}</td><td>${esc(a.event_name)}</td></tr>
    <tr><td class="k">${L(lang, "Date", "తేదీ")}</td><td>${esc(new Date(a.event_date).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { dateStyle: "long" }))}</td></tr>
    <tr><td class="k">${L(lang, "Status", "స్థితి")}</td><td>${statusTxt}</td></tr>
  </table>
  ${a.description ? `<h2>${L(lang, "Description", "వివరణ")}</h2><div class="box">${esc(a.description).replace(/\n/g, "<br/>")}</div>` : ""}
  <h2>${L(lang, "Financial Summary", "ఆర్థిక సారాంశం")}</h2>
  <div class="vote">
    <div class="cell app"><b>${L(lang, "Allocated Budget", "కేటాయించిన బడ్జెట్")}</b>${inr(budget)}</div>
    <div class="cell opp"><b>${L(lang, "Actual Expense", "వాస్తవిక ఖర్చు")}</b>${inr(expense)}</div>
  </div>
  <div class="box" style="margin-top:10px;">
    <b>${L(lang, "Variance", "మిగులు")}:</b>
    <span style="color:${variance >= 0 ? "#065f46" : "#991b1b"};font-weight:700;"> ${inr(variance)}</span>
  </div>
  ${sigRow(org, lang)}
  </body></html>`;
  openPrint(html);
}
