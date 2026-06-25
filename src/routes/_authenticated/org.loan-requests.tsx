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

                  {r.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => { setApproving(r); setRate(String(r.interest_rate_monthly ?? "2.0")); }}
                        className="bg-emerald-600 hover:bg-emerald-500">
                        <CheckCircle2 className="h-4 w-4" /> ఆమోదించు
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => doReject(r)}>
                        <XCircle className="h-4 w-4" /> తిరస్కరించు
                      </Button>
                    </div>
                  )}
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
