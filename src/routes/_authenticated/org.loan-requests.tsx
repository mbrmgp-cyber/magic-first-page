import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, User, Banknote, FileImage, FileSignature, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listOrgLoanRequests, approveLoanRequest, rejectLoanRequest,
} from "@/lib/loan-requests.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/org/loan-requests")({
  head: () => ({ meta: [{ title: "Loan Requests — Admin" }] }),
  component: LoanRequestsAdmin,
});

function SignedImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    // If already an absolute URL, use it directly
    if (/^https?:\/\//i.test(path)) { setUrl(path); return; }
    supabase.storage.from("loan-proofs").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!path) return null;
  if (!url) return <div className={`bg-white/5 animate-pulse ${className ?? ""}`} />;
  return <img src={url} alt={alt} className={className} />;
}

async function resolveAsset(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\/|^data:/i.test(path)) return path;
  const { data } = await supabase.storage.from("loan-proofs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function printLoanApplication(r: any) {
  // Fetch org branding
  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, slogan, gov_reg_number, letter_code, phone, email, president_name")
    .eq("id", r.org_id)
    .maybeSingle();

  const [sigUrl, proofUrl, suretySigUrl] = await Promise.all([
    resolveAsset(r.signature_data_url),
    resolveAsset(r.proof_url),
    resolveAsset(r.surety?.signature_data_url),
  ]);

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Loan Application — ${esc(r.member?.name ?? "")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Telugu', 'Inter', Arial, sans-serif; color: #111; margin: 0; font-size: 12px; line-height: 1.45; }
  .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 14px; }
  .header img { height: 64px; width: 64px; object-fit: contain; }
  .header h1 { font-size: 20px; margin: 0; color: #7c2d12; }
  .header .meta { font-size: 11px; color: #444; margin-top: 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding: 4px 8px; background: #fef3c7; border-left: 4px solid #d97706; color: #7c2d12; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 5px 8px; border-bottom: 1px dashed #ddd; vertical-align: top; }
  table.kv td.k { width: 32%; color: #555; font-weight: 600; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .box { border: 1px solid #d4d4d8; border-radius: 6px; padding: 10px; }
  .box .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .sigbox { height: 90px; border: 1px dashed #9ca3af; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .sigbox img { max-height: 86px; max-width: 100%; object-fit: contain; }
  .proof { max-height: 220px; max-width: 100%; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px; background: #fff; }
  .footer-sigs { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
  .footer-sigs .slot { text-align: center; padding-top: 50px; border-top: 1px solid #111; font-size: 11px; }
  .stamp { display: inline-block; padding: 3px 10px; border: 2px solid #047857; color: #047857; border-radius: 4px; font-weight: 700; font-size: 11px; letter-spacing: 1px; }
  .stamp.rej { border-color: #b91c1c; color: #b91c1c; }
  .stamp.pen { border-color: #b45309; color: #b45309; }
  .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .doc-title { font-size: 16px; font-weight: 700; color: #7c2d12; }
  .ref { font-size: 11px; color: #555; }
  @media print { .noprint { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .noprint { position: fixed; top: 10px; right: 10px; }
  .noprint button { background: #d97706; color: white; border: 0; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: 600; }
</style>
</head><body>
<div class="noprint"><button onclick="window.print()">🖨 Print / Save PDF</button></div>

<div class="header">
  ${org?.logo_url ? `<img src="${esc(org.logo_url)}" alt="logo" />` : ""}
  <div style="flex:1">
    <h1>${esc(org?.name ?? "Organization")}</h1>
    <div class="meta">
      ${org?.slogan ? esc(org.slogan) + " · " : ""}
      ${org?.gov_reg_number ? "Reg No: " + esc(org.gov_reg_number) : ""}
      ${org?.phone ? " · ☎ " + esc(org.phone) : ""}
      ${org?.email ? " · " + esc(org.email) : ""}
    </div>
  </div>
</div>

<div class="title-row">
  <div class="doc-title">లోన్ దరఖాస్తు / Loan Application Form</div>
  <div class="ref">
    Ref: ${esc(String(r.id).slice(0, 8).toUpperCase())} ·
    ${r.status === "approved" ? '<span class="stamp">APPROVED</span>' :
      r.status === "rejected" ? '<span class="stamp rej">REJECTED</span>' :
      '<span class="stamp pen">PENDING</span>'}
  </div>
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
  <tr><td class="k">మొత్తం / Amount</td><td><b>₹ ${Number(r.requested_amount).toLocaleString("en-IN")}</b></td>
      <td class="k">కాలవ్యవధి / Tenure</td><td>${r.tenure_months ? esc(r.tenure_months) + " months" : "—"}</td></tr>
  <tr><td class="k">వడ్డీ / Interest</td><td>${r.interest_rate_monthly ?? "—"} % / month</td>
      <td class="k">UTR</td><td>${esc(r.utr_number ?? "—")}</td></tr>
  <tr><td class="k">కారణం / Purpose</td><td colspan="3">${esc(r.reason)}</td></tr>
</table>

<h2>సంతకాలు & ధృవీకరణ పత్రాలు / Signatures & Proofs</h2>
<div class="grid2">
  <div class="box">
    <div class="lbl">దరఖాస్తుదారు సంతకం / Applicant Signature</div>
    <div class="sigbox">${sigUrl ? `<img src="${esc(sigUrl)}" />` : "— Not provided —"}</div>
    <div style="margin-top:8px; font-size:11px;"><b>${esc(r.member?.name)}</b> · ${esc(r.member?.member_code)}</div>
  </div>
  <div class="box">
    <div class="lbl">హామీదారు / Surety Member</div>
    <div class="sigbox">${suretySigUrl ? `<img src="${esc(suretySigUrl)}" />` :
      (r.surety?.name ? "(Signature pending)" : "— No surety —")}</div>
    <div style="margin-top:8px; font-size:11px;">
      ${r.surety?.name ? `<b>${esc(r.surety.name)}</b> · ${esc(r.surety.member_code)}` :
        (r.surety_member_code ? `Code: ${esc(r.surety_member_code)}` : "—")}
    </div>
  </div>
</div>

<div class="box" style="margin-top:12px;">
  <div class="lbl">ధృవీకరణ పత్రం / Uploaded Proof Document</div>
  <div style="text-align:center;">
    ${proofUrl ? `<img class="proof" src="${esc(proofUrl)}" />` : "— No document uploaded —"}
  </div>
</div>

${r.status !== "pending" ? `
<h2>సమీక్ష / Review</h2>
<table class="kv">
  <tr><td class="k">స్థితి / Status</td><td>${esc(r.status.toUpperCase())}</td>
      <td class="k">సమీక్ష తేదీ / Reviewed At</td><td>${fmtDate(r.reviewed_at)}</td></tr>
  ${r.status === "approved" ? `
  <tr><td class="k">చెల్లింపు తేదీ / Payment Date</td><td>${esc(r.payment_date ?? "—")}</td>
      <td class="k">UTR Number</td><td>${esc(r.utr_number ?? "—")}</td></tr>` : ""}
  ${r.reject_reason ? `<tr><td class="k">కారణం / Reason</td><td colspan="3">${esc(r.reject_reason)}</td></tr>` : ""}
</table>` : ""}

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

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Popup blocked. Allow popups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

function LoanRequestsAdmin() {
  const listFn = useServerFn(listOrgLoanRequests);
  const approveFn = useServerFn(approveLoanRequest);
  const rejectFn = useServerFn(rejectLoanRequest);
  const q = useQuery({ queryKey: ["org-loan-requests"], queryFn: () => listFn() });

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [approving, setApproving] = useState<any | null>(null);
  const [utr, setUtr] = useState("");
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState("2.0");
  const [busy, setBusy] = useState(false);

  const requests = ((q.data?.requests ?? []) as any[])
    .filter((r) => filter === "all" ? true : r.status === filter);

  async function doApprove() {
    if (!approving) return;
    if (!utr.trim()) { toast.error("UTR number required"); return; }
    setBusy(true);
    try {
      await approveFn({ data: {
        request_id: approving.id,
        utr_number: utr.trim(),
        payment_date: payDate,
        interest_rate_monthly: Number(rate) || 2.0,
      }});
      toast.success("Approved & loan added to ledger");
      setApproving(null); setUtr(""); setRate("2.0");
      q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  async function doReject(r: any) {
    if (!confirm(`Reject loan request for ${r.member?.name}?`)) return;
    try {
      await rejectFn({ data: { request_id: r.id } });
      toast.success("Rejected");
      q.refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  const pendingCount = ((q.data?.requests ?? []) as any[]).filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/org/accounts-hub" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Loan Requests · అప్పు అభ్యర్థనలు</h1>
            <p className="text-xs text-white/60">{pendingCount} pending</p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(["pending","approved","rejected","all"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? "bg-orange-600 border-orange-500 text-white" : "border-white/15 text-white/70"}`}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {q.isLoading && <p className="text-xs text-white/50">Loading…</p>}
        {!q.isLoading && requests.length === 0 && (
          <Card className="bg-zinc-950 border-white/10 p-6 text-center text-white/60">
            No requests in this view.
          </Card>
        )}

        <div className="grid gap-3">
          {requests.map((r) => (
            <Card key={r.id} className="bg-zinc-950 border-white/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {r.member?.photo_url
                    ? <img src={r.member.photo_url} alt="" className="h-full w-full object-cover" />
                    : <User className="h-6 w-6 text-white/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Link to="/org/members" className="font-semibold hover:underline">
                        {r.member?.name ?? "—"}
                      </Link>
                      <div className="text-[11px] text-white/50">
                        ID: {r.member?.member_code} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-white/50">Amount:</span> <span className="font-semibold text-orange-400">₹ {Number(r.requested_amount).toLocaleString()}</span></div>
                    <div><span className="text-white/50">Tenure:</span> {r.tenure_months ? `${r.tenure_months} mo` : "—"}</div>
                    <div className="col-span-2"><span className="text-white/50">Reason:</span> {r.reason}</div>
                    <div className="col-span-2"><span className="text-white/50">Surety:</span> {r.surety?.name ? `${r.surety.name} (${r.surety.member_code})` : (r.surety_member_code ?? "—")}</div>
                    {r.status === "approved" && (
                      <div className="col-span-2 text-emerald-400">
                        UTR: {r.utr_number} · Paid: {r.payment_date}
                      </div>
                    )}
                  </div>

                  {(r.signature_data_url || r.proof_url) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {r.signature_data_url && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-white/50 flex items-center gap-1"><FileSignature className="h-3 w-3" /> సంతకం / Signature</div>
                          <a href="#" onClick={(e) => e.preventDefault()} className="block rounded border border-white/10 bg-white p-1">
                            <SignedImage path={r.signature_data_url} alt="Signature" className="w-full h-20 object-contain" />
                          </a>
                        </div>
                      )}
                      {r.proof_url && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-white/50 flex items-center gap-1"><FileImage className="h-3 w-3" /> ప్రూఫ్ / Proof</div>
                          <div className="rounded border border-white/10 bg-zinc-900 overflow-hidden">
                            <SignedImage path={r.proof_url} alt="Proof" className="w-full h-20 object-cover" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => { setApproving(r); setRate(String(r.interest_rate_monthly ?? "2.0")); }}
                          className="bg-emerald-600 hover:bg-emerald-500">
                          <CheckCircle2 className="h-4 w-4" /> ఆమోదించు
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => doReject(r)}>
                          <XCircle className="h-4 w-4" /> తిరస్కరించు
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => printLoanApplication(r)}
                      className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10">
                      <Printer className="h-4 w-4" /> ప్రింట్ / PDF డౌన్‌లోడ్
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-400" />
              Approve Loan — {approving?.member?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-white/70">
              Amount: <span className="font-semibold text-orange-400">₹ {Number(approving?.requested_amount ?? 0).toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <Label>బ్యాంక్ ట్రాన్సాక్షన్ నెం. / UTR No <span className="text-red-400">*</span></Label>
              <Input value={utr} onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. HDFC123456789"
                className="bg-black border-white/15 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Date</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="bg-black border-white/15 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label>Interest %/month</Label>
                <Input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)}
                  className="bg-black border-white/15 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            <Button onClick={doApprove} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500">
              {busy ? "Saving…" : "Save & Add to Ledger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-600/20 text-emerald-300",
    rejected: "bg-red-600/20 text-red-300",
    pending: "bg-amber-600/20 text-amber-300",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>{status}</span>;
}
