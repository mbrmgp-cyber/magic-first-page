import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { submitLoanRequest, listMyLoanRequests } from "@/lib/loan-requests.functions";

export const Route = createFileRoute("/_authenticated/member/loan-request")({
  head: () => ({ meta: [{ title: "అప్పు కొరకు అభ్యర్థన — Loan Request" }] }),
  component: LoanRequestPage,
});

const REASONS = [
  { v: "Education", te: "విద్య" },
  { v: "Medical", te: "వైద్యం" },
  { v: "Marriage", te: "వివాహం" },
  { v: "Business", te: "వ్యాపారం" },
  { v: "Other", te: "ఇతరం" },
];

function LoanRequestPage() {
  const submit = useServerFn(submitLoanRequest);
  const listFn = useServerFn(listMyLoanRequests);
  const myReq = useQuery({ queryKey: ["my-loan-requests"], queryFn: () => listFn() });

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [surety, setSurety] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0)) { toast.error("సరైన మొత్తం నమోదు చేయండి"); return; }
    if (!reason) { toast.error("కారణం ఎంచుకోండి"); return; }
    setBusy(true);
    try {
      await submit({ data: {
        requested_amount: a, reason,
        surety_member_code: surety.trim() || undefined,
      }});
      toast.success("అభ్యర్థన పంపబడింది — Admin కి నోటిఫై చేశాము");
      setAmount(""); setReason(""); setSurety("");
      myReq.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  const requests = (myReq.data?.requests ?? []) as any[];

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-md mx-auto p-4 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/member/dashboard" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">అప్పు కొరకు అభ్యర్థన</h1>
            <p className="text-xs text-white/60">Request Loan</p>
          </div>
        </header>

        <Card className="bg-zinc-950 border-white/10 p-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/80">కావాల్సిన మొత్తం (₹) <span className="text-red-400">*</span></Label>
              <Input
                type="number" min="1" step="1" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="bg-black border-white/15 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">కారణం (Reason) <span className="text-red-400">*</span></Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-black border-white/15 text-white">
                  <SelectValue placeholder="ఎంచుకోండి" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.v} value={r.v}>{r.te} ({r.v})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">షూరిటీ సభ్యుడి ఐడీ (Surety Member ID)</Label>
              <Input
                value={surety} onChange={(e) => setSurety(e.target.value.toUpperCase())}
                placeholder="e.g. A/0023"
                className="bg-black border-white/15 text-white"
              />
              <p className="text-[11px] text-white/50">ఐచ్ఛికం — ఒక సభ్యుని Member Code ఇవ్వండి.</p>
            </div>

            <Button type="submit" disabled={busy}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white">
              <Send className="h-4 w-4" />
              {busy ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-white/80">నా అభ్యర్థనలు (My Requests)</h2>
          {myReq.isLoading && <p className="text-xs text-white/50">Loading…</p>}
          {!myReq.isLoading && requests.length === 0 && (
            <p className="text-xs text-white/50">ఇంకా అభ్యర్థనలు లేవు.</p>
          )}
          {requests.map((r) => (
            <Card key={r.id} className="bg-zinc-950 border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">₹ {Number(r.requested_amount).toLocaleString()}</div>
                  <div className="text-xs text-white/60">{r.reason} {r.surety_member_code ? `· Surety: ${r.surety_member_code}` : ""}</div>
                </div>
                <StatusPill status={r.status} />
              </div>
              {r.status === "approved" && (
                <div className="mt-2 text-[11px] text-emerald-400">
                  UTR: {r.utr_number} · Paid: {r.payment_date}
                </div>
              )}
              {r.status === "rejected" && r.reject_reason && (
                <div className="mt-2 text-[11px] text-red-400">Reason: {r.reject_reason}</div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600/20 text-red-300">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-600/20 text-amber-300">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
