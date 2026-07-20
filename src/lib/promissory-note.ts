import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const esc = (s: any) =>
  String(s ?? "—").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
const inr = (n: any) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

/** Convert a number to English words (Indian numbering). Handles 0–99,99,99,999. */
function inWords(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number): string =>
    x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? " " + a[x % 10] : "");
  const three = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    return (h ? a[h] + " Hundred" + (r ? " and " : "") : "") + (r ? two(r) : "");
  };
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [
    crore ? two(crore) + " Crore" : "",
    lakh ? two(lakh) + " Lakh" : "",
    thousand ? two(thousand) + " Thousand" : "",
    rest ? three(rest) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

async function signedUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\/|^data:/i.test(path)) return path;
  const { data } = await supabase.storage.from("loan-proofs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function printPromissoryNote(opts: {
  loan: any;
  member: { name?: string; member_code?: string; phone?: string; address?: string; father_name?: string };
  orgId: string;
}) {
  const { loan, member, orgId } = opts;

  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, gov_reg_number, phone, email, address, president_name")
    .eq("id", orgId).maybeSingle();

  const [bSig, sSig] = await Promise.all([
    signedUrl(loan.borrower_signature_url),
    signedUrl(loan.surety_signature_url),
  ]);

  const principal = Number(loan.principal || 0);
  const rate = Number(loan.interest_rate_monthly || 0);
  const dateStr = fmtDate(loan.start_date);
  const words = inWords(principal);
  const place = org?.address ? String(org.address).split(",").pop()?.trim() : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Promissory Note — ${esc(member.name)}</title>
<style>
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Times New Roman', Georgia, serif; color:#111; margin:0; font-size:13px; line-height:1.7; }
.sheet { border: 3px double #6b3f10; padding: 28px 32px; position: relative; }
.corner { position:absolute; width:22px; height:22px; border:2px solid #6b3f10; }
.c1{top:6px;left:6px;border-right:0;border-bottom:0}
.c2{top:6px;right:6px;border-left:0;border-bottom:0}
.c3{bottom:6px;left:6px;border-right:0;border-top:0}
.c4{bottom:6px;right:6px;border-left:0;border-top:0}
.header { text-align:center; border-bottom: 2px solid #6b3f10; padding-bottom: 10px; margin-bottom: 14px; }
.header img { height: 58px; margin-bottom: 6px; }
.header h1 { margin: 0; font-size: 18px; color: #6b3f10; letter-spacing: 1px; }
.header .sub { font-size: 11px; color: #444; margin-top: 2px; }
.title { text-align:center; font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 6px 0 4px; color:#6b3f10; }
.title-te { text-align:center; font-size: 14px; margin-bottom: 12px; color:#7a4b18; }
.stamp-row { display:flex; justify-content:space-between; font-size:11px; color:#555; margin-bottom: 14px; }
.stamp-box { border: 1.5px dashed #6b3f10; padding: 10px 18px; text-align:center; font-size: 10px; color:#6b3f10; font-weight:700; letter-spacing:1px; }
p.body { text-align: justify; text-indent: 24px; margin: 8px 0; }
.u { text-decoration: underline; font-weight: 600; }
.sig-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 36px; }
.sig-box { text-align:center; }
.sig-line { height: 70px; border-bottom: 1px solid #333; display:flex; align-items:flex-end; justify-content:center; margin-bottom: 4px; }
.sig-line img { max-height: 68px; max-width: 100%; }
.sig-label { font-size: 11px; margin-top: 2px; }
.sig-meta { font-size: 10px; color:#555; margin-top:2px; }
.witness { margin-top: 30px; display:grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.witness .w { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; text-align:center; }
.notes { margin-top: 22px; font-size: 10px; color:#555; border-top: 1px dashed #999; padding-top: 8px; }
.noprint { position:fixed; top:10px; right:10px; display:flex; gap:8px; z-index:9999; }
.noprint button { background:#6b3f10; color:#fff; border:0; padding:8px 14px; border-radius:4px; cursor:pointer; font-weight:600; font-family: inherit; }
.noprint button.back { background:#374151; }
@media print { .noprint { display:none !important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="noprint">
  <button class="back" onclick="try{window.close()}catch(e){};history.back()">← Back</button>
  <button onclick="window.print()">🖨 Print / Save PDF</button>
</div>

<div class="sheet">
  <div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>

  <div class="header">
    ${org?.logo_url ? `<img src="${esc(org.logo_url)}"/>` : ""}
    <h1>${esc(org?.name ?? "Organization")}</h1>
    <div class="sub">
      ${org?.gov_reg_number ? "Reg No: " + esc(org.gov_reg_number) : ""}
      ${org?.phone ? " · ☎ " + esc(org.phone) : ""}
      ${org?.email ? " · " + esc(org.email) : ""}
    </div>
  </div>

  <div class="title">PROMISSORY NOTE</div>
  <div class="title-te">వాగ్దాన పత్రం (ప్రామిసరీ నోట్)</div>

  <div class="stamp-row">
    <div><b>Place / స్థలం:</b> ${esc(place || "—")}</div>
    <div><b>Date / తేదీ:</b> ${esc(dateStr)}</div>
    <div class="stamp-box">
      REVENUE<br/>STAMP<br/>₹ 1/-
    </div>
  </div>

  <p class="body">
    ON DEMAND, I, <span class="u">${esc(member.name)}</span>
    ${member.father_name ? `S/o / D/o <span class="u">${esc(member.father_name)}</span>` : ""},
    Member ID <span class="u">${esc(member.member_code)}</span>${member.phone ? `, Phone <span class="u">${esc(member.phone)}</span>` : ""},
    ${member.address ? `resident of <span class="u">${esc(member.address)}</span>,` : ""}
    do hereby promise to pay <b>${esc(org?.name ?? "the Society")}</b>
    or order, the sum of <span class="u">${inr(principal)}</span>
    (Rupees <span class="u">${esc(words)} only</span>),
    together with interest thereon at the rate of
    <span class="u">${rate}% per month</span>
    (${rate * 12}% per annum), for value received in cash / by transfer on
    <span class="u">${esc(dateStr)}</span>.
  </p>

  <p class="body">
    డిమాండ్‌ మేరకు, నేను <b>${esc(member.name)}</b> (సభ్యుని ID: ${esc(member.member_code)}),
    పైన పేర్కొన్న సంఘానికి <b>${inr(principal)}</b>
    (అక్షరాలలో: <b>${esc(words)} రూపాయలు మాత్రమే</b>) మొత్తాన్ని,
    నెలకు <b>${rate}%</b> వడ్డీతో సహా, డిమాండ్‌ మేరకు తిరిగి చెల్లిస్తానని
    పూర్తి స్వేచ్ఛతో, ఆరోగ్యమనసుతో వాగ్దానం చేస్తున్నాను. పై సొమ్మును
    <span class="u">${esc(dateStr)}</span> నాడు నగదు / బదిలీ రూపంలో స్వీకరించాను.
  </p>

  ${loan.surety_name || loan.surety_code ? `
  <p class="body">
    <b>SURETY / హామీదారు:</b> I, <span class="u">${esc(loan.surety_name)}</span>
    ${loan.surety_code ? `(Member ID <span class="u">${esc(loan.surety_code)}</span>)` : ""}
    ${loan.surety_phone ? `, Phone <span class="u">${esc(loan.surety_phone)}</span>` : ""},
    stand as surety and jointly &amp; severally undertake to repay the above amount
    with interest in case of default by the borrower.
    పైన పేర్కొన్న అప్పు తీసుకున్న వ్యక్తి చెల్లించలేని పక్షంలో, హామీదారుగా
    పూర్తి బాధ్యతతో నేను ఈ మొత్తాన్ని వడ్డీతో సహా చెల్లిస్తానని అంగీకరిస్తున్నాను.
  </p>` : ""}

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-line">${bSig ? `<img src="${esc(bSig)}"/>` : ""}</div>
      <div class="sig-label"><b>Borrower Signature / అప్పు తీసుకున్నవారి సంతకం</b></div>
      <div class="sig-meta">${esc(member.name)} · ${esc(member.member_code)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">${sSig ? `<img src="${esc(sSig)}"/>` : ""}</div>
      <div class="sig-label"><b>Surety Signature / హామీదారు సంతకం</b></div>
      <div class="sig-meta">${loan.surety_name ? esc(loan.surety_name) : "—"}${loan.surety_code ? " · " + esc(loan.surety_code) : ""}</div>
    </div>
  </div>

  <div class="witness">
    <div class="w">Witness 1 / సాక్షి 1<br/><span style="color:#888">Name &amp; Signature</span></div>
    <div class="w">Witness 2 / సాక్షి 2<br/><span style="color:#888">Name &amp; Signature</span></div>
  </div>

  <div class="notes">
    Note: This promissory note is executed under the Indian Negotiable Instruments Act, 1881.
    Ref: ${esc(String(loan.id).slice(0, 8).toUpperCase())} · Generated: ${new Date().toLocaleString("en-IN")}
  </div>
</div>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 500));</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
