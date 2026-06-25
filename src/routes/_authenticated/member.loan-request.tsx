import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowLeft, Send, Clock, CheckCircle2, XCircle, Camera, Loader2,
  FileSignature, FileImage, Printer, Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitLoanRequest, listMyLoanRequests } from "@/lib/loan-requests.functions";
import { printLoanApplication } from "@/lib/printLoan";
import { SignaturePad } from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/member/loan-request")({
  head: () => ({ meta: [{ title: "లోన్ అభ్యర్థన — Loan Request" }] }),
  component: LoanRequestPage,
});

function LoanRequestPage() {
  const { lang } = useI18n();
  const isTe = lang === "te";
  const pick = <T,>(te: T, en: T) => (isTe ? te : en);

  const submit = useServerFn(submitLoanRequest);
  const listFn = useServerFn(listMyLoanRequests);
  const myReq = useQuery({ queryKey: ["my-loan-requests"], queryFn: () => listFn() });

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [tenure, setTenure] = useState("");
  const [surety, setSurety] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadProof(): Promise<string | null> {
    if (!proofFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const ext = (proofFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}-proof.${ext}`;
    const { error } = await supabase.storage.from("loan-proofs").upload(path, proofFile, {
      upsert: false, contentType: proofFile.type || "image/jpeg",
    });
    if (error) throw error;
    return path;
  }

  async function uploadSignature(dataUrl: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/${Date.now()}-signature.png`;
    const { error } = await supabase.storage.from("loan-proofs").upload(path, blob, {
      upsert: false, contentType: "image/png",
    });
    if (error) throw error;
    return path;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0)) { toast.error(pick("సరైన మొత్తం నమోదు చేయండి", "Enter a valid amount")); return; }
    if (!reason.trim()) { toast.error(pick("కారణం రాయండి", "Enter the purpose")); return; }
    if (!tenure.trim() || Number(tenure) <= 0) { toast.error(pick("తిరిగి చెల్లించే కాలపరిమితి ఇవ్వండి", "Enter repayment tenure")); return; }
    if (!signature) { toast.error(pick("సంతకం తప్పనిసరి", "Signature is required")); return; }

    setBusy(true);
    try {
      const sigPath = await uploadSignature(signature);
      const proofPath = await uploadProof();
      await submit({ data: {
        requested_amount: a,
        reason: reason.trim(),
        tenure_months: Number(tenure),
        surety_member_code: surety.trim() || undefined,
        signature_data_url: sigPath,
        proof_url: proofPath ?? undefined,
      }});
      toast.success(pick("అభ్యర్థన పంపబడింది — కార్యవర్గం ఆమోద క్యూకు వెళ్లింది", "Submitted — sent to committee approval queue"));
      setAmount(""); setReason(""); setTenure(""); setSurety("");
      setSignature(null); setProofFile(null);
      if (proofRef.current) proofRef.current.value = "";
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
          <Link to="/org/chat" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{pick("లోన్ అభ్యర్థన", "Loan Request")}</h1>
            <p className="text-xs text-white/60">{pick("మీ అభ్యర్థన నేరుగా కార్యవర్గం ఆమోద క్యూకు పంపబడుతుంది.", "Goes directly to the working committee's approval queue.")}</p>
          </div>
        </header>

        <Card className="bg-zinc-950 border-white/10 p-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/80">{pick("కోరుకునే లోన్ మొత్తం (₹)", "Loan amount (₹)")} <span className="text-red-400">*</span></Label>
              <Input
                type="number" min="1" step="1" required inputMode="numeric"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="bg-black border-white/15 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">{pick("లోన్ తీసుకోవడానికి గల కారణం", "Purpose of loan")} <span className="text-red-400">*</span></Label>
              <Textarea
                value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder={pick("ఉదా: వైద్య ఖర్చు, వ్యాపార మూలధనం, విద్య…", "e.g. Medical expense, business capital, education…")}
                className="bg-black border-white/15 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/80">{pick("తిరిగి చెల్లించే కాలపరిమితి (నెలలు)", "Repayment tenure (months)")} <span className="text-red-400">*</span></Label>
                <Input
                  type="number" min="1" step="1" inputMode="numeric"
                  value={tenure} onChange={(e) => setTenure(e.target.value)}
                  placeholder="12"
                  className="bg-black border-white/15 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80">{pick("షూరిటీ సభ్యుడి ఐడీ", "Surety member ID")}</Label>
                <Input
                  value={surety} onChange={(e) => setSurety(e.target.value.toUpperCase())}
                  placeholder="A/0023"
                  className="bg-black border-white/15 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-[#ff8c28]" />
                {pick("సభ్యుడి సంతకం", "Member signature")} <span className="text-red-400">*</span>
              </Label>
              <SignaturePad
                onChange={setSignature}
                hint={pick("వేలితో పైన గీయండి", "Draw with your finger above")}
                clearLabel={pick("మళ్లీ గీయండి", "Clear")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80 flex items-center gap-2">
                <FileImage className="h-4 w-4 text-[#ff8c28]" />
                {pick("సంతకం/వేలిముద్ర పత్రం లేదా ఐడీ ప్రూఫ్ అప్‌లోడ్", "Upload signed paper / thumbprint / ID proof")}
              </Label>
              <input
                ref={proofRef}
                type="file" accept="image/*" capture="environment"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="loan-proof-input"
              />
              <label htmlFor="loan-proof-input"
                className="flex items-center gap-2 justify-center w-full rounded-md border border-dashed border-white/20 bg-black/40 px-3 py-3 text-sm text-white/70 hover:border-[#ff8c28] cursor-pointer">
                <Camera className="h-4 w-4" />
                {proofFile
                  ? <span className="truncate max-w-[220px]">{proofFile.name}</span>
                  : pick("ఫోటో తీయండి లేదా ఎంచుకోండి", "Take photo or choose file")}
              </label>
              {proofFile && (
                <button type="button" onClick={() => { setProofFile(null); if (proofRef.current) proofRef.current.value = ""; }}
                  className="text-[11px] text-white/50 hover:text-white">
                  {pick("తీసివేయండి", "Remove")}
                </button>
              )}
            </div>

            <Button type="submit" disabled={busy}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? pick("పంపుతోంది…", "Submitting…") : pick("అభ్యర్థనను పంపండి", "Submit Request")}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-white/80">{pick("నా అభ్యర్థనలు (లైవ్ స్థితి)", "My requests (live status)")}</h2>
          {myReq.isLoading && <p className="text-xs text-white/50">Loading…</p>}
          {!myReq.isLoading && requests.length === 0 && (
            <p className="text-xs text-white/50">{pick("ఇంకా అభ్యర్థనలు లేవు.", "No requests yet.")}</p>
          )}
          {requests.map((r) => (
            <Card key={r.id} className="bg-zinc-950 border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">₹ {Number(r.requested_amount).toLocaleString()}</div>
                  <div className="text-xs text-white/60">
                    {r.reason}
                    {r.tenure_months ? ` · ${r.tenure_months} ${pick("నెలలు", "mo")}` : ""}
                    {r.surety_member_code ? ` · Surety: ${r.surety_member_code}` : ""}
                  </div>
                </div>
                <StatusPill status={r.status} isTe={isTe} />
              </div>
              {r.status === "approved" && (
                <div className="mt-2 text-[11px] text-emerald-400">
                  UTR: {r.utr_number} · {pick("చెల్లించిన తేదీ", "Paid")}: {r.payment_date}
                </div>
              )}
              {r.status === "rejected" && r.reject_reason && (
                <div className="mt-2 text-[11px] text-red-400">{pick("కారణం", "Reason")}: {r.reject_reason}</div>
              )}
              {r.surety_member_id && r.status === "pending" && (
                <div className={`mt-2 text-[11px] ${
                  r.surety_status === "accepted" ? "text-emerald-400" :
                  r.surety_status === "declined" ? "text-red-400" : "text-amber-300"
                }`}>
                  {r.surety_status === "accepted" ? pick("షూరిటీ ఆమోదించారు — కార్యవర్గం వద్ద", "Surety accepted — at committee") :
                   r.surety_status === "declined" ? pick(`షూరిటీ తిరస్కరించారు${r.surety_decline_reason ? `: ${r.surety_decline_reason}` : ""}`, `Surety declined${r.surety_decline_reason ? `: ${r.surety_decline_reason}` : ""}`) :
                   pick("షూరిటీ ఆమోదం కోసం ఎదురుచూస్తోంది", "Awaiting surety consent")}
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <button onClick={() => printLoanApplication({ ...r, member: { name: "", member_code: "" } })}
                  className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-500/40 text-orange-300 hover:bg-orange-500/10">
                  <Printer className="h-3 w-3" /> {pick("ప్రింట్ / PDF", "Print / PDF")}
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Link to="/member/surety-inbox"
          className="block rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm hover:border-amber-500/40">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-amber-300" />
            <span className="font-semibold">{pick("షూరిటీ అభ్యర్థనలు", "Surety Inbox")}</span>
            <span className="ml-auto text-xs text-white/50">{pick("నేను షూరిటీగా ఉన్నవి", "Where I'm the surety")} →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ status, isTe }: { status: string; isTe: boolean }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> {isTe ? "ఆమోదించబడింది" : "Approved"}
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600/20 text-red-300">
      <XCircle className="h-3 w-3" /> {isTe ? "తిరస్కరించబడింది" : "Rejected"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-600/20 text-amber-300">
      <Clock className="h-3 w-3" /> {isTe ? "పెండింగ్" : "Pending"}
    </span>
  );
}
