import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }) : "—";

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  // inject toolbar after <body>
  const withToolbar = html.replace(/<body[^>]*>/, (m) => `${m}${toolbar}<div class="page">`).replace("</body>", "</div></body>");
  w.document.open(); w.document.write(withToolbar); w.document.close();
}

const styles = `
@page { size: A4; margin: 14mm; }
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
.toolbar { position:fixed; top:0; left:0; right:0; background:#7c2d12; color:#fff; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; z-index:9999; box-shadow:0 2px 8px rgba(0,0,0,.2); }
.toolbar button { background:#fff; color:#7c2d12; border:none; padding:7px 14px; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px; margin-left:8px; }
.toolbar button.ghost { background:transparent; color:#fff; border:1px solid #fff; }
.page { margin-top:60px; }
@media print { .toolbar { display:none !important; } .page { margin-top:0; } }
`;

const toolbar = `<div class="toolbar no-print">
  <div style="font-weight:700;font-size:13px;">📄 Print Preview</div>
  <div>
    <button class="ghost" onclick="window.close()">✕ మూసివేయండి / Close</button>
    <button onclick="window.print()">🖨 ప్రింట్ / Print</button>
  </div>
</div>`;

type Org = { name?: string; logo_url?: string; gov_reg_number?: string; phone?: string; email?: string };
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
  return (data as any) ?? {};
}

function header(org: Org) {
  return `<div class="header">
    ${org.logo_url ? `<img src="${esc(org.logo_url)}" />` : ""}
    <div>
      <h1>${esc(org.name || "Organization")}</h1>
      <div class="meta">
        ${org.gov_reg_number ? `Reg No: ${esc(org.gov_reg_number)}` : ""}
        ${org.phone ? ` · ☎ ${esc(org.phone)}` : ""}
        ${org.email ? ` · ✉ ${esc(org.email)}` : ""}
      </div>
    </div>
  </div>`;
}

function namesList(ids: string[], members: Member[]) {
  if (!ids?.length) return `<span class="muted">— ఎవరూ లేరు —</span>`;
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
}) {
  const org = await fetchOrg(opts.orgId);
  const { meeting, resolutions, members } = opts;

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>సమావేశ నివేదిక - ${esc(meeting.title)}</title>
  <style>${styles}</style></head><body>
  ${header(org)}
  <div class="doc-title">సమావేశ నివేదిక / Meeting Minutes</div>

  <table class="kv">
    <tr><td class="k">సమావేశం శీర్షిక</td><td>${esc(meeting.title)}</td></tr>
    <tr><td class="k">తేదీ / సమయం</td><td>${esc(fmtDate(meeting.scheduled_at))}</td></tr>
    <tr><td class="k">విధానం</td><td>${meeting.meeting_type === "online" ? "ఆన్‌లైన్" : "ఆఫ్‌లైన్"}</td></tr>
    ${meeting.location ? `<tr><td class="k">వేదిక</td><td>${esc(meeting.location)}</td></tr>` : ""}
    ${meeting.meeting_link ? `<tr><td class="k">లింక్</td><td>${esc(meeting.meeting_link)}</td></tr>` : ""}
    <tr><td class="k">స్థితి</td><td>${esc(meeting.status)}</td></tr>
  </table>

  ${meeting.agenda ? `<h2>అజెండా / Agenda</h2><div class="box">${esc(meeting.agenda).replace(/\n/g, "<br/>")}</div>` : ""}

  <h2>హాజరైన వారు / Attended (${meeting.attended_member_ids.length})</h2>
  <div class="box">${namesList(meeting.attended_member_ids, members)}</div>

  <h2>గైర్హాజరైన వారు / Absent (${meeting.absent_member_ids.length})</h2>
  <div class="absent">${namesList(meeting.absent_member_ids, members)}</div>

  ${resolutions.length ? `<h2>నిర్ణయాలు / Resolutions</h2>
    ${resolutions.map((r) => `
      <div class="res">
        <div><span class="rno">${esc(r.resolution_no)}</span><span class="topic">${esc(r.topic)}</span></div>
        ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ""}
        <div class="vote">
          <div class="cell app"><b>ఆమోదించిన వారు (${r.approved_member_ids.length})</b>${namesList(r.approved_member_ids, members)}</div>
          <div class="cell opp"><b>వ్యతిరేకించిన వారు (${r.opposed_member_ids.length})</b>${namesList(r.opposed_member_ids, members)}</div>
        </div>
      </div>`).join("")}` : ""}

  ${meeting.notes ? `<h2>అదనపు గమనికలు</h2><div class="box">${esc(meeting.notes).replace(/\n/g, "<br/>")}</div>` : ""}

  <div class="footer-sigs">
    <div class="slot">అధ్యక్షుడు<br/>President</div>
    <div class="slot">కార్యదర్శి<br/>Secretary</div>
    <div class="slot">కోశాధికారి<br/>Treasurer</div>
  </div>



  </body></html>`;

  openPrint(html);
}

export async function printResolution(opts: {
  orgId: string;
  resolution: Resolution;
  members: Member[];
}) {
  const org = await fetchOrg(opts.orgId);
  const { resolution: r, members } = opts;
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>నిర్ణయం ${esc(r.resolution_no)}</title>
  <style>${styles}</style></head><body>
  ${header(org)}
  <div class="doc-title">అధికారిక నిర్ణయం / Official Resolution</div>
  <table class="kv">
    <tr><td class="k">నిర్ణయ సంఖ్య</td><td>${esc(r.resolution_no)}</td></tr>
    <tr><td class="k">తేదీ</td><td>${esc(new Date(r.decision_date).toLocaleDateString("en-IN", { dateStyle: "long" }))}</td></tr>
    <tr><td class="k">శీర్షిక</td><td>${esc(r.topic)}</td></tr>
    <tr><td class="k">స్థితి</td><td>${r.status === "passed" ? "ఆమోదించబడింది" : r.status === "rejected" ? "తిరస్కరించబడింది" : "పెండింగ్‌లో"}</td></tr>
  </table>
  ${r.description ? `<h2>వివరణ</h2><div class="box">${esc(r.description).replace(/\n/g, "<br/>")}</div>` : ""}
  <h2>ఓటింగ్ వివరాలు</h2>
  <div class="vote">
    <div class="cell app"><b>ఆమోదించిన వారు (${r.approved_member_ids.length})</b>${namesList(r.approved_member_ids, members)}</div>
    <div class="cell opp"><b>వ్యతిరేకించిన వారు (${r.opposed_member_ids.length})</b>${namesList(r.opposed_member_ids, members)}</div>
  </div>
  <div class="footer-sigs">
    <div class="slot">అధ్యక్షుడు<br/>President</div>
    <div class="slot">కార్యదర్శి<br/>Secretary</div>
    <div class="slot">కోశాధికారి<br/>Treasurer</div>
  </div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),300);}<\/script>
  </body></html>`;
  openPrint(html);
}
