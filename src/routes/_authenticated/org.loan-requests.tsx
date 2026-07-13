import { DateInput } from "@/components/DateInput";
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
import { printLoanApplication } from "@/lib/printLoan";
import { useI18n } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/org/loan-requests")({
  head: () => ({ meta: [{ title: "Loan Requests — Admin" }] }),
  component: LoanRequestsAdmin,
});

function SignedImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
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

function LoanRequestsAdmin() {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const lt = (en: string, te: string) => lang === "te" ? te : en;
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
    if (!utr.trim()) { toast.error(lt("UTR number required", "UTR నంబర్ అవసరం")); return; }
    setBusy(true);
    try {
      await approveFn({ data: {
        request_id: approving.id,
        utr_number: utr.trim(),
        payment_date: payDate,
        interest_rate_monthly: Number(rate) || 2.0,
      }});
      toast.success(lt("Approved & loan added to ledger", "ఆమోదించబడింది మరియు లెడ్జర్‌కు జోడించబడింది"));
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
      toast.success(lt("Rejected", "తిరస్కరించబడింది"));
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
            <h1 className="text-lg font-bold">{lt("Loan Requests", "అప్పు అభ్యర్థనలు")}</h1>
            <p className="text-xs text-white/60">{lt(`${pendingCount} pending`, `${pendingCount} పెండింగ్`)}</p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(["pending","approved","rejected","all"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? "bg-orange-600 border-orange-500 text-white" : "border-white/15 text-white/70"}`}>
              {lt(s[0].toUpperCase() + s.slice(1), s === "all" ? "అన్నీ" : s === "pending" ? "పెండింగ్" : s === "approved" ? "ఆమోదించబడినవి" : "తిరస్కరించబడినవి")}
            </button>
          ))}
        </div>

        {q.isLoading && <p className="text-xs text-white/50">{lt("Loading…", "లోడ్ అవుతోంది…")}</p>}
        {!q.isLoading && requests.length === 0 && (
          <Card className="bg-zinc-950 border-white/10 p-6 text-center text-white/60">
            {lt("No requests in this view.", "ఈ వీక్షణలో అభ్యర్థనలు లేవు.")}
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
                        ID: {r.member?.member_code} · {new Date(r.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <StatusPill status={r.status} lang={lang} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-white/50">{lt("Amount:", "మొత్తం:")}</span> <span className="font-semibold text-orange-400">{sym} {Number(r.requested_amount).toLocaleString()}</span></div>
                    <div><span className="text-white/50">{lt("Tenure:", "కాలం:")}</span> {r.tenure_months ? lt(`${r.tenure_months} mo`, `${r.tenure_months} నెలలు`) : "—"}</div>
                    <div className="col-span-2"><span className="text-white/50">{lt("Reason:", "కారణం:")}</span> {r.reason}</div>
                    <div className="col-span-2 flex items-center gap-2 flex-wrap">
                      <span className="text-white/50">{lt("Surety:", "షూరిటీ:")}</span>
                      <span>{r.surety?.name ? `${r.surety.name} (${r.surety.member_code})` : (r.surety_member_code ?? "—")}</span>
                      {r.surety_member_id && r.status === "pending" && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          r.surety_status === "accepted" ? "bg-emerald-600/20 text-emerald-300" :
                          r.surety_status === "declined" ? "bg-red-600/20 text-red-300" :
                          "bg-amber-600/20 text-amber-300"
                        }`}>
                          {r.surety_status === "accepted" ? lt("Surety ✓ accepted", "షూరిటీ ✓ అంగీకరించారు") :
                           r.surety_status === "declined" ? lt(`Surety ✗ declined${r.surety_decline_reason ? `: ${r.surety_decline_reason}` : ""}`, `షూరిటీ ✗ తిరస్కరించారు${r.surety_decline_reason ? `: ${r.surety_decline_reason}` : ""}`) :
                           lt("Awaiting surety consent", "షూరిటీ సమ్మతి కోసం ఎదురుచూస్తోంది")}
                        </span>
                      )}
                    </div>
                    {r.status === "approved" && (
                      <div className="col-span-2 text-emerald-400">
                        {lt("UTR:", "UTR:")} {r.utr_number} · {lt("Paid:", "చెల్లించిన తేదీ:")} {r.payment_date}
                      </div>
                    )}
                  </div>

                  {(r.signature_data_url || r.proof_url) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {r.signature_data_url && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-white/50 flex items-center gap-1"><FileSignature className="h-3 w-3" /> {lt("Signature", "సంతకం")}</div>
                          <a href="#" onClick={(e) => e.preventDefault()} className="block rounded border border-white/10 bg-white p-1">
                            <SignedImage path={r.signature_data_url} alt="Signature" className="w-full h-20 object-contain" />
                          </a>
                        </div>
                      )}
                      {r.proof_url && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-white/50 flex items-center gap-1"><FileImage className="h-3 w-3" /> {lt("Proof", "ప్రూఫ్")}</div>
                          <div className="rounded border border-white/10 bg-zinc-900 overflow-hidden">
                            <SignedImage path={r.proof_url} alt="Proof" className="w-full h-20 object-cover" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "pending" && (!r.surety_member_id || r.surety_status === "accepted") && (
                      <>
                        <Button size="sm"
                          onClick={() => { setApproving(r); setRate(String(r.interest_rate_monthly ?? "2.0")); }}
                          className="bg-emerald-600 hover:bg-emerald-500">
                          <CheckCircle2 className="h-4 w-4" /> {lt("Approve", "ఆమోదించు")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => doReject(r)}>
                          <XCircle className="h-4 w-4" /> {lt("Reject", "తిరస్కరించు")}
                        </Button>
                      </>
                    )}
                    {r.status === "pending" && r.surety_member_id && r.surety_status === "awaiting" && (
                      <div className="text-[11px] px-3 py-1.5 rounded-md bg-amber-600/15 text-amber-300 border border-amber-600/30">
                        ⏳ {lt("Awaiting surety consent — approval is disabled until then", "షూరిటీ సమ్మతి కోసం ఎదురుచూస్తోంది — అప్పటివరకు ఆమోదం ఇవ్వలేరు")}
                      </div>
                    )}
                    {r.status === "pending" && r.surety_status === "declined" && (
                      <div className="text-[11px] px-3 py-1.5 rounded-md bg-red-600/15 text-red-300 border border-red-600/30">
                        {lt("Surety declined — the application cannot proceed", "షూరిటీ తిరస్కరించారు — దరఖాస్తు ముందుకు సాగదు")}
                      </div>
                    )}
                    <Button size="sm" onClick={() => printLoanApplication(r)}
                      className="bg-slate-600 hover:bg-slate-500 text-white">
                      <Printer className="h-4 w-4" /> {lt("Print / PDF Download", "ప్రింట్ / పిడిఎఫ్ డౌన్‌లోడ్")}
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
              {lt("Approve Loan", "అప్పు ఆమోదించండి")} — {approving?.member?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-white/70">
              {lt("Amount:", "మొత్తం:")} <span className="font-semibold text-orange-400">{sym} {Number(approving?.requested_amount ?? 0).toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <Label>{lt("Bank Transaction No. / UTR No", "బ్యాంక్ ట్రాన్సాక్షన్ నెం.")} <span className="text-red-400">*</span></Label>
              <Input value={utr} onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. HDFC123456789"
                className="bg-black border-white/15 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{lt("Payment Date", "చెల్లింపు తేదీ")}</Label>
                <DateInput value={payDate} onChange={(e) => setPayDate(e.target.value)}
                  className="bg-black border-white/15 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label>{lt("Interest %/month", "వడ్డీ %/నెల")}</Label>
                <Input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)}
                  className="bg-black border-white/15 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>{lt("Cancel", "రద్దు")}</Button>
            <Button onClick={doApprove} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500">
              {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save & Add to Ledger", "సేవ్ చేసి లెడ్జర్‌కు జోడించండి")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status, lang }: { status: string; lang: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-600/20 text-emerald-300",
    rejected: "bg-red-600/20 text-red-300",
    pending: "bg-amber-600/20 text-amber-300",
  };
  const label = lang === "te"
    ? status === "approved" ? "ఆమోదించబడింది" : status === "rejected" ? "తిరస్కరించబడింది" : status === "pending" ? "పెండింగ్" : status
    : status;
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>{label}</span>;
}
