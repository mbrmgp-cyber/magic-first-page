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

function currentLang(): "te" | "en" {
  try {
    const l = typeof window !== "undefined" ? localStorage.getItem("mbr_lang") : null;
    return l && l.startsWith("te") ? "te" : "en";
  } catch { return "te"; }
}

function openPrintable(html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/* ============================================================
   PROMISSORY NOTE — single language (matches admin's mbr_lang)
   ============================================================ */
export async function printPromissoryNote(opts: {
  loan: any;
  member: { name?: string; member_code?: string; phone?: string; address?: string; father_name?: string };
  orgId: string;
  lang?: "te" | "en";
}) {
  const { loan, member, orgId } = opts;
  const lang = opts.lang ?? currentLang();
  const isTe = lang === "te";

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

  const L = isTe ? {
    title: "వాగ్దాన పత్రం (ప్రామిసరీ నోట్)",
    place: "స్థలం", date: "తేదీ",
    stamp1: "రెవెన్యూ", stamp2: "స్టాంపు", stamp3: "Rs. 1/-",
    borrowerSig: "అప్పు తీసుకున్నవారి సంతకం",
    suretySig: "హామీదారు సంతకం",
    witness1: "సాక్షి 1", witness2: "సాక్షి 2",
    witnessSub: "పేరు మరియు సంతకం",
    note: `ఈ వాగ్దాన పత్రం భారత నెగోషియబుల్ ఇన్‌స్ట్రుమెంట్స్ చట్టం, 1881 ప్రకారం అమలవుతుంది.`,
  } : {
    title: "PROMISSORY NOTE",
    place: "Place", date: "Date",
    stamp1: "REVENUE", stamp2: "STAMP", stamp3: "Rs. 1/-",
    borrowerSig: "Borrower Signature",
    suretySig: "Surety Signature",
    witness1: "Witness 1", witness2: "Witness 2",
    witnessSub: "Name & Signature",
    note: `This promissory note is executed under the Indian Negotiable Instruments Act, 1881.`,
  };

  const bodyTe = `
    <p class="body">
      డిమాండ్‌ మేరకు, నేను <b>${esc(member.name)}</b>
      ${member.father_name ? `(తండ్రి / భర్త పేరు: <b>${esc(member.father_name)}</b>)` : ""},
      సభ్యుని ID: <b>${esc(member.member_code)}</b>${member.phone ? `, ఫోన్: <b>${esc(member.phone)}</b>` : ""},
      ${member.address ? `చిరునామా: <b>${esc(member.address)}</b>,` : ""}
      <b>${esc(org?.name ?? "సంఘం")}</b> వారికి లేదా వారి ఆదేశానుసారం,
      <b>${inr(principal)}</b> (అక్షరాలలో: <b>${esc(words)} రూపాయలు మాత్రమే</b>) మొత్తాన్ని,
      నెలకు <b>${rate}%</b> వడ్డీ (సంవత్సరానికి ${rate * 12}%) తో సహా, డిమాండ్‌ మేరకు తిరిగి
      చెల్లిస్తానని పూర్తి స్వేచ్ఛతో, ఆరోగ్యమనసుతో వాగ్దానం చేస్తున్నాను. పై సొమ్మును
      <b>${esc(dateStr)}</b> నాడు నగదు / బదిలీ రూపంలో పూర్తిగా స్వీకరించాను.
    </p>
    ${loan.surety_name || loan.surety_code ? `
    <p class="body">
      <b>హామీదారు:</b> నేను <b>${esc(loan.surety_name)}</b>
      ${loan.surety_code ? `(సభ్యుని ID: <b>${esc(loan.surety_code)}</b>)` : ""}
      ${loan.surety_phone ? `, ఫోన్: <b>${esc(loan.surety_phone)}</b>` : ""},
      పైన పేర్కొన్న అప్పు తీసుకున్న వ్యక్తి చెల్లించలేని పక్షంలో, హామీదారుగా పూర్తి
      బాధ్యతతో ఈ మొత్తాన్ని వడ్డీతో సహా చెల్లిస్తానని అంగీకరిస్తూ, స్వేచ్ఛగా,
      ఆరోగ్యమనసుతో సంతకం చేస్తున్నాను.
    </p>` : ""}
    <p class="body">
      ఈ వాగ్దాన పత్రాన్ని ఎటువంటి ఒత్తిడి లేకుండా, పూర్తి అవగాహనతో, స్వచ్ఛందంగా రాసి
      సంతకం చేస్తున్నాను.
    </p>`;

  const bodyEn = `
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
    ${loan.surety_name || loan.surety_code ? `
    <p class="body">
      <b>SURETY:</b> I, <span class="u">${esc(loan.surety_name)}</span>
      ${loan.surety_code ? `(Member ID <span class="u">${esc(loan.surety_code)}</span>)` : ""}
      ${loan.surety_phone ? `, Phone <span class="u">${esc(loan.surety_phone)}</span>` : ""},
      stand as surety and jointly &amp; severally undertake to repay the above
      amount with interest in case of default by the borrower.
    </p>` : ""}
    <p class="body">
      I confirm that I have received the said amount in cash / by bank transfer
      on the date mentioned above, and I shall repay the principal along with
      accrued interest on demand. This note is executed voluntarily, in sound
      mind, and without any coercion.
    </p>`;

  const html = `<!doctype html><html lang="${isTe ? "te" : "en"}"><head><meta charset="utf-8"/>
<title>${L.title} — ${esc(member.name)}</title>
<style>
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans Telugu', 'Times New Roman', Georgia, serif; color:#111; margin:0; font-size:13px; line-height:1.75; }
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
.title { text-align:center; font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 6px 0 12px; color:#6b3f10; }
.stamp-row { display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#555; margin-bottom: 14px; }
.stamp-box { border: 1.5px dashed #6b3f10; padding: 8px 14px; text-align:center; font-size: 10px; color:#6b3f10; font-weight:700; letter-spacing:1px; line-height:1.4; }
p.body { text-align: justify; text-indent: 24px; margin: 8px 0; }
.u { text-decoration: underline; font-weight: 600; }
.sig-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 46px; }
.sig-box { text-align:center; }
.sig-line { height: 80px; border-bottom: 1px solid #333; display:flex; align-items:flex-end; justify-content:center; margin-bottom: 4px; }
.sig-line img { max-height: 78px; max-width: 100%; }
.sig-label { font-size: 11px; margin-top: 2px; font-weight:600; }
.sig-meta { font-size: 10px; color:#555; margin-top:2px; }
.witness { margin-top: 30px; display:grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.witness .w { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; text-align:center; }
.notes { margin-top: 22px; font-size: 10px; color:#555; border-top: 1px dashed #999; padding-top: 8px; }
.noprint { position:fixed; top:10px; right:10px; display:flex; gap:8px; z-index:9999; }
.noprint button { background:#6b3f10; color:#fff; border:0; padding:8px 14px; border-radius:4px; cursor:pointer; font-weight:600; font-family: inherit; }
.noprint button.back { background:#374151; }
@media print { .noprint { display:none !important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700&display=swap" rel="stylesheet">
</head><body>
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

  <div class="title">${L.title}</div>

  <div class="stamp-row">
    <div><b>${L.place}:</b> ${esc(place || "—")}</div>
    <div><b>${L.date}:</b> ${esc(dateStr)}</div>
    <div class="stamp-box">${L.stamp1}<br/>${L.stamp2}<br/>${L.stamp3}</div>
  </div>

  ${isTe ? bodyTe : bodyEn}

  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-line">${bSig ? `<img crossorigin="anonymous" src="${esc(bSig)}"/>` : ""}</div>
      <div class="sig-label">${L.borrowerSig}</div>
      <div class="sig-meta">${esc(member.name)} · ${esc(member.member_code)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">${sSig ? `<img crossorigin="anonymous" src="${esc(sSig)}"/>` : ""}</div>
      <div class="sig-label">${L.suretySig}</div>
      <div class="sig-meta">${loan.surety_name ? esc(loan.surety_name) : "—"}${loan.surety_code ? " · " + esc(loan.surety_code) : ""}</div>
    </div>
  </div>

  <div class="witness">
    <div class="w">${L.witness1}<br/><span style="color:#888">${L.witnessSub}</span></div>
    <div class="w">${L.witness2}<br/><span style="color:#888">${L.witnessSub}</span></div>
  </div>

  <div class="notes">
    ${L.note} Ref: ${esc(String(loan.id).slice(0, 8).toUpperCase())} · Generated: ${new Date().toLocaleString(isTe ? "te-IN" : "en-IN")}
  </div>
</div>
<script>
  (function () {
    function ready() {
      var imgs = Array.prototype.slice.call(document.images || []);
      return Promise.all(imgs.map(function (img) {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(function (res) {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        });
      }));
    }
    window.addEventListener('load', function () {
      ready().then(function () { setTimeout(function () { window.print(); }, 500); });
    });
  })();
</script>
</body></html>`;

  openPrintable(html);
}

/* ============================================================
   PAYMENT RECEIPT — detailed, single-language
   ============================================================ */
export async function printPaymentReceipt(opts: {
  orgId: string;
  member: { name?: string; member_code?: string; phone?: string; email?: string };
  date: string;
  /** Outstanding BEFORE this payment */
  before: { principal: number; interest: number };
  /** Amount collected in this entry (INR) */
  paid: { principal: number; interest: number };
  /** Optional foreign-currency echo for the collected amount */
  fx?: { code: string; rate: number; principal?: number; interest?: number } | null;
  /** Balance AFTER payment */
  after: { principalRemaining: number; interestCarryForward: number };
  /** Next month due estimate */
  nextMonth: { principal: number; interest: number };
  /** Optional new loan disbursed same day */
  newLoan?: { amount: number; rate: number; nextDueMonths: number } | null;
  remarks?: string;
  lang?: "te" | "en";
  /** Display currency for all amounts. Stored values are INR; converted for display. */
  display?: { symbol: string; code: string; rateFromInr: number } | null;
}) {
  const lang = opts.lang ?? currentLang();
  const disp = opts.display && opts.display.rateFromInr > 0 ? opts.display : null;
  const money = (n: any) => {
    const v = Number(n || 0) * (disp ? disp.rateFromInr : 1);
    const sym = disp ? disp.symbol : "Rs.";
    return `${sym} ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const isTe = lang === "te";
  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, gov_reg_number, phone, email, address")
    .eq("id", opts.orgId).maybeSingle();

  const L = isTe ? {
    title: "చెల్లింపు రసీదు",
    receiptNo: "రసీదు నెం.",
    date: "తేదీ",
    memberDetails: "సభ్యుని వివరాలు",
    name: "పేరు", id: "సభ్యుని ID", phone: "ఫోన్", email: "ఇమెయిల్",
    before: "చెల్లింపుకు ముందు బాకీ",
    principal: "అసలు", interest: "వడ్డీ",
    paid: "ఈరోజు చెల్లించినది",
    paidFx: "(విదేశీ కరెన్సీలో)",
    after: "చెల్లింపు తర్వాత మిగిలిన బాకీ",
    principalLeft: "మిగిలిన అసలు",
    carry: "వచ్చే నెలకు క్యారీ-ఫార్వర్డ్ వడ్డీ",
    nextMonth: "వచ్చే నెల కట్టవలసినది",
    newLoan: "ఈరోజు కొత్త అప్పు",
    amount: "మొత్తం", rate: "నెలవారీ వడ్డీ", tenure: "వ్యవధి",
    months: "నెలలు",
    remarks: "గమనికలు",
    footer: "ఇది ఎలక్ట్రానిక్ రసీదు. అధికారిక సంతకం అవసరం లేదు.",
    signature: "అధీకృత సంతకం",
    print: "🖨 ప్రింట్ / PDF సేవ్",
    back: "← వెనుకకు",
    receivedBy: "వసూలు చేసినది",
    total: "మొత్తం చెల్లించినది",
  } : {
    title: "PAYMENT RECEIPT",
    receiptNo: "Receipt No.",
    date: "Date",
    memberDetails: "Member Details",
    name: "Name", id: "Member ID", phone: "Phone", email: "Email",
    before: "Outstanding BEFORE Payment",
    principal: "Principal", interest: "Interest",
    paid: "Paid Today",
    paidFx: "(in foreign currency)",
    after: "Balance AFTER Payment",
    principalLeft: "Principal Remaining",
    carry: "Interest Carry-Forward to Next Month",
    nextMonth: "Next Month Due",
    newLoan: "New Loan Disbursed Today",
    amount: "Amount", rate: "Monthly Interest", tenure: "Tenure",
    months: "months",
    remarks: "Remarks",
    footer: "This is an electronically generated receipt. No signature required.",
    signature: "Authorised Signature",
    print: "🖨 Print / Save PDF",
    back: "← Back",
    receivedBy: "Received By",
    total: "Total Paid",
  };

  const totalPaid = (opts.paid.principal || 0) + (opts.paid.interest || 0);
  const receiptNo = `R-${Date.now().toString(36).toUpperCase()}`;

  const fxLine = opts.fx && opts.fx.code !== "INR" && opts.fx.rate > 0
    ? `<div class="fx">${esc(L.paidFx)}: ${esc(opts.fx.code)} @ ${opts.fx.rate} → INR
        ${opts.fx.principal ? ` · ${L.principal}: ${opts.fx.principal} ${esc(opts.fx.code)}` : ""}
        ${opts.fx.interest ? ` · ${L.interest}: ${opts.fx.interest} ${esc(opts.fx.code)}` : ""}
       </div>` : "";

  const html = `<!doctype html><html lang="${isTe ? "te" : "en"}"><head><meta charset="utf-8"/>
<title>${L.title} — ${esc(opts.member.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans Telugu','Segoe UI', Arial, sans-serif; color:#111; margin:0; font-size:13px; line-height:1.55; background:#f4f4f4; }
.sheet { max-width: 780px; margin: 0 auto; background:#fff; padding: 26px 30px; border-top: 6px solid #b45309; box-shadow: 0 2px 8px rgba(0,0,0,.05); }
.hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #b45309; padding-bottom:10px; }
.hdr .brand { display:flex; gap:12px; align-items:center; }
.hdr img { height: 54px; }
.hdr h1 { margin:0; font-size:18px; color:#7c3a05; }
.hdr .sub { font-size: 10.5px; color:#555; margin-top:2px; }
.hdr .rcpt { text-align:right; font-size: 11px; color:#555; }
.hdr .rcpt .rn { font-size: 13px; font-weight: 700; color:#7c3a05; }
.title { text-align:center; font-size: 20px; font-weight: 800; letter-spacing: 4px; color:#7c3a05; margin: 14px 0 4px; }
.section { margin-top: 14px; }
.section h3 { margin: 0 0 6px; font-size: 12px; letter-spacing: 1px; color:#7c3a05; text-transform: uppercase; border-bottom: 1px dashed #d4a373; padding-bottom: 3px; }
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
.kv { display:flex; justify-content:space-between; padding: 3px 0; font-size: 12.5px; border-bottom: 1px dotted #eee; }
.kv .k { color:#555; }
.kv .v { font-weight: 600; color:#111; }
.box { border: 1.5px solid #d4a373; border-radius: 6px; padding: 10px 14px; background:#fffdf7; }
.box.paid { border-color:#059669; background:#ecfdf5; }
.box.after { border-color:#2563eb; background:#eff6ff; }
.box.next { border-color:#ea580c; background:#fff7ed; }
.box.newloan { border-color:#dc2626; background:#fef2f2; }
.total-row { display:flex; justify-content:space-between; align-items:center; margin-top: 8px; padding-top: 6px; border-top: 2px solid #059669; }
.total-row .lbl { font-size: 13px; font-weight: 700; color:#065f46; }
.total-row .amt { font-size: 20px; font-weight: 800; color:#047857; }
.fx { margin-top: 4px; font-size: 11px; color:#075985; font-style: italic; }
.footer { margin-top: 24px; display:flex; justify-content:space-between; align-items:flex-end; }
.sig { text-align: center; min-width: 200px; }
.sig .line { border-top: 1px solid #333; padding-top:3px; font-size: 11px; margin-top: 30px; }
.tag { font-size: 10.5px; color:#666; margin-top: 20px; text-align:center; border-top: 1px dashed #ccc; padding-top: 8px; }
.noprint { position:fixed; top:10px; right:10px; display:flex; gap:8px; z-index:9999; }
.noprint button { background:#b45309; color:#fff; border:0; padding:8px 14px; border-radius:4px; cursor:pointer; font-weight:600; font-family: inherit; }
.noprint button.back { background:#374151; }
@media print { .noprint { display:none !important; } body { background:#fff; } .sheet { box-shadow:none; } }
</style></head><body>
<div class="noprint">
  <button class="back" onclick="try{window.close()}catch(e){};history.back()">${L.back}</button>
  <button onclick="window.print()">${L.print}</button>
</div>

<div class="sheet">
  <div class="hdr">
    <div class="brand">
      ${org?.logo_url ? `<img src="${esc(org.logo_url)}"/>` : ""}
      <div>
        <h1>${esc(org?.name ?? "Organization")}</h1>
        <div class="sub">
          ${org?.gov_reg_number ? "Reg No: " + esc(org.gov_reg_number) : ""}
          ${org?.phone ? " · ☎ " + esc(org.phone) : ""}
        </div>
        <div class="sub">${org?.email ? esc(org.email) : ""}${org?.address ? " · " + esc(org.address) : ""}</div>
      </div>
    </div>
    <div class="rcpt">
      <div>${L.receiptNo}</div>
      <div class="rn">${receiptNo}</div>
      <div style="margin-top:6px">${L.date}: <b>${esc(fmtDate(opts.date))}</b></div>
    </div>
  </div>

  <div class="title">${L.title}</div>

  <div class="section">
    <h3>${L.memberDetails}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.name}</span><span class="v">${esc(opts.member.name)}</span></div>
      <div class="kv"><span class="k">${L.id}</span><span class="v">${esc(opts.member.member_code)}</span></div>
      ${opts.member.phone ? `<div class="kv"><span class="k">${L.phone}</span><span class="v">${esc(opts.member.phone)}</span></div>` : ""}
      ${opts.member.email ? `<div class="kv"><span class="k">${L.email}</span><span class="v">${esc(opts.member.email)}</span></div>` : ""}
    </div>
  </div>

  <div class="section box">
    <h3>${L.before}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.principal}</span><span class="v">${money(opts.before.principal)}</span></div>
      <div class="kv"><span class="k">${L.interest}</span><span class="v">${money(opts.before.interest)}</span></div>
    </div>
  </div>

  <div class="section box paid">
    <h3>${L.paid}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.principal}</span><span class="v">${money(opts.paid.principal)}</span></div>
      <div class="kv"><span class="k">${L.interest}</span><span class="v">${money(opts.paid.interest)}</span></div>
    </div>
    ${fxLine}
    <div class="total-row"><span class="lbl">${L.total}</span><span class="amt">${money(totalPaid)}</span></div>
  </div>

  <div class="section box after">
    <h3>${L.after}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.principalLeft}</span><span class="v">${money(opts.after.principalRemaining)}</span></div>
      <div class="kv"><span class="k">${L.carry}</span><span class="v">${money(opts.after.interestCarryForward)}</span></div>
    </div>
  </div>

  <div class="section box next">
    <h3>${L.nextMonth}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.principal}</span><span class="v">${money(opts.nextMonth.principal)}</span></div>
      <div class="kv"><span class="k">${L.interest}</span><span class="v">${money(opts.nextMonth.interest)}</span></div>
    </div>
  </div>

  ${opts.newLoan && opts.newLoan.amount > 0 ? `
  <div class="section box newloan">
    <h3>${L.newLoan}</h3>
    <div class="grid2">
      <div class="kv"><span class="k">${L.amount}</span><span class="v">${money(opts.newLoan.amount)}</span></div>
      <div class="kv"><span class="k">${L.rate}</span><span class="v">${opts.newLoan.rate}%</span></div>
      <div class="kv"><span class="k">${L.tenure}</span><span class="v">${opts.newLoan.nextDueMonths} ${L.months}</span></div>
    </div>
  </div>` : ""}

  ${opts.remarks ? `
  <div class="section">
    <h3>${L.remarks}</h3>
    <div style="font-size:12px;color:#333;padding: 4px 0;">${esc(opts.remarks)}</div>
  </div>` : ""}

  <div class="footer">
    <div style="font-size:11px;color:#555;max-width:60%">${L.footer}</div>
    <div class="sig">
      <div class="line">${L.signature}</div>
    </div>
  </div>

  <div class="tag">${esc(org?.name ?? "")} · ${L.receiptNo} ${receiptNo} · ${new Date().toLocaleString(isTe ? "te-IN" : "en-IN")}</div>
</div>

<script>
  window.addEventListener('load', function () {
    var imgs = Array.prototype.slice.call(document.images || []);
    Promise.all(imgs.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (res) {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    })).then(function(){ setTimeout(function(){ window.print(); }, 400); });
  });
</script>
</body></html>`;

  openPrintable(html);
}
