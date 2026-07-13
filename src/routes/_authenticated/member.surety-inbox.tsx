import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { listSuretyRequests, respondAsSurety } from "@/lib/loan-requests.functions";
import { SignaturePad } from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, localizeText } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";
import { printSuretyConsent } from "@/lib/printLoan";

export const Route = createFileRoute("/_authenticated/member/surety-inbox")({
  head: () => ({ meta: [{ title: "షూరిటీ అభ్యర్థనలు — Surety Inbox" }] }),
  component: SuretyInbox,
});

function SignedImg({ path, className }: { path?: string | null; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let c = false;
    if (!path) return;
    if (/^https?:\/\//.test(path)) { setUrl(path); return; }
    supabase.storage.from("loan-proofs").createSignedUrl(path, 3600).then(({ data }) => {
      if (!c) setUrl(data?.signedUrl ?? null);
    });
    return () => { c = true; };
  }, [path]);
  if (!path) return null;
  if (!url) return <div className={`bg-white/5 animate-pulse ${className ?? ""}`} />;
  return <img src={url} alt="" className={className} />;
}

function SuretyInbox() {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const isTe = lang !== "en";
  const pick = (te: string, en: string) => (lang === "en" ? en : localizeText({ te, en }, lang));

  const listFn = useServerFn(listSuretyRequests);
  const respondFn = useServerFn(respondAsSurety);
  const q = useQuery({ queryKey: ["surety-inbox"], queryFn: () => listFn() });

  const [active, setActive] = useState<any | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadSignature(dataUrl: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/${Date.now()}-surety.png`;
    const { error } = await supabase.storage.from("loan-proofs").upload(path, blob, {
      upsert: false, contentType: "image/png",
    });
    if (error) throw error;
    return path;
  }

  async function accept() {
    if (!active) return;
    if (!signature) { toast.error(pick("సంతకం తప్పనిసరి", "Signature required")); return; }
    setBusy(true);
    try {
      const sigPath = await uploadSignature(signature);
      await respondFn({ data: { request_id: active.id, decision: "accepted", signature_data_url: sigPath } });
      toast.success(pick("మీరు షూరిటీగా అంగీకరించారు — కార్యవర్గానికి పంపబడింది", "Accepted — sent to committee"));
      setActive(null); setSignature(null);
      q.refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function decline() {
    if (!active) return;
    if (!confirm(pick("తిరస్కరిస్తారా?", "Decline this request?"))) return;
    setBusy(true);
    try {
      await respondFn({ data: { request_id: active.id, decision: "declined", decline_reason: declineReason || undefined } });
      toast.success(pick("తిరస్కరించబడింది", "Declined"));
      setActive(null); setDeclineReason("");
      q.refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  const requests = (q.data?.requests ?? []) as any[];
  const awaiting = requests.filter(r => r.surety_status === "awaiting");
  const past = requests.filter(r => r.surety_status !== "awaiting");

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-md mx-auto p-4 space-y-5">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => window.history.back()} className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{pick("షూరిటీ అభ్యర్థనలు", "Surety Requests")}</h1>
            <p className="text-xs text-white/60">{pick("మీరు షూరిటీగా ఉన్న లోన్ అభ్యర్థనలు", "Loans where you are named as surety")}</p>
          </div>
        </header>

        {q.isLoading && <p className="text-xs text-white/50">Loading…</p>}
        {!q.isLoading && requests.length === 0 && (
          <Card className="bg-zinc-950 border-white/10 p-6 text-center text-white/60 text-sm">
            {pick("ప్రస్తుతం అభ్యర్థనలు లేవు", "No requests right now")}
          </Card>
        )}

        {awaiting.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-amber-300">{pick("సమ్మతి అవసరం", "Awaiting your consent")}</h2>
            {awaiting.map(r => (
              <Card key={r.id} className="bg-zinc-950 border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/5 overflow-hidden flex items-center justify-center">
                    {r.member?.photo_url
                      ? <img src={r.member.photo_url} className="h-full w-full object-cover" />
                      : <User className="h-5 w-5 text-white/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{r.member?.name}</div>
                    <div className="text-[11px] text-white/50">ID: {r.member?.member_code}</div>
                  </div>
                </div>
                <div className="text-sm text-white/80">
                  {pick(
                    `${r.member?.name} గారు ${sym} ${Number(r.requested_amount).toLocaleString()} లోను కోరారు. మీరు షూరిటీగా ఉండటానికి సమ్మతిస్తారా?`,
                    `${r.member?.name} requested ${sym} ${Number(r.requested_amount).toLocaleString()}. Do you accept being their surety?`,
                  )}
                </div>
                <div className="text-xs text-white/60 grid grid-cols-2 gap-1">
                  <div><span className="text-white/40">{pick("కాలవ్యవధి", "Tenure")}:</span> {r.tenure_months ? `${r.tenure_months} mo` : "—"}</div>
                  <div><span className="text-white/40">{pick("తేదీ", "Date")}:</span> {new Date(r.created_at).toLocaleDateString("en-GB")}</div>
                  <div className="col-span-2"><span className="text-white/40">{pick("కారణం", "Purpose")}:</span> {r.reason}</div>
                </div>
                <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-500" onClick={() => { setActive(r); setSignature(null); setDeclineReason(""); }}>
                  {pick("సమీక్షించి స్పందించండి", "Review & Respond")}
                </Button>
              </Card>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white/70">{pick("గత స్పందనలు", "Past responses")}</h2>
            {past.map(r => (
              <Card key={r.id} className="bg-zinc-950 border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{r.member?.name} · {sym} {Number(r.requested_amount).toLocaleString()}</div>
                    <div className="text-[11px] text-white/50">{r.reason}</div>
                  </div>
                  <Pill status={r.surety_status} isTe={isTe} />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
                    onClick={() => printSuretyConsent(r)}>
                    <Printer className="h-3.5 w-3.5" /> {pick("ప్రింట్", "Print")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {active && (
          <Card className="bg-zinc-950 border-amber-500/40 p-4 space-y-3">
            <div className="text-sm font-semibold">{pick("మీ స్పందన", "Your response")}</div>
            <div className="text-xs text-white/60">
              {pick("అంగీకరిస్తే మీ సంతకం గీయండి. తిరస్కరిస్తే కారణం రాయండి.",
                "Draw your signature to accept, or write a reason to decline.")}
            </div>
            {active.proof_url && (
              <div>
                <Label className="text-white/80 text-xs">{pick("అప్‌లోడ్ చేసిన పత్రం", "Uploaded proof")}</Label>
                <div className="rounded border border-white/10 bg-zinc-900 overflow-hidden mt-1">
                  <SignedImg path={active.proof_url} className="w-full max-h-40 object-contain" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-white/80 text-xs">{pick("మీ సంతకం", "Your signature")}</Label>
              <SignaturePad onChange={setSignature}
                hint={pick("వేలితో పైన గీయండి", "Draw above")}
                clearLabel={pick("మళ్లీ గీయండి", "Clear")} />
            </div>
            <div>
              <Label className="text-white/80 text-xs">{pick("తిరస్కరణ కారణం (వైకల్పికం)", "Decline reason (optional)")}</Label>
              <Textarea rows={2} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                className="bg-black border-white/15 text-white" />
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={accept} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> {pick("సమ్మతిస్తున్నాను", "I Accept")}
              </Button>
              <Button disabled={busy} variant="destructive" onClick={decline} className="flex-1">
                <XCircle className="h-4 w-4" /> {pick("తిరస్కరిస్తున్నాను", "Decline")}
              </Button>
            </div>
            <button onClick={() => setActive(null)} className="text-xs text-white/50 hover:text-white">{pick("మూసివేయండి", "Cancel")}</button>
          </Card>
        )}
      </div>
    </div>
  );
}

function r_proofPreview(r: any) {
  if (!r.proof_url && !r.signature_data_url) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {r.signature_data_url && (
        <div className="bg-white rounded p-1">
          <SignedImg path={r.signature_data_url} className="w-full h-20 object-contain" />
        </div>
      )}
      {r.proof_url && (
        <div className="bg-zinc-900 rounded overflow-hidden">
          <SignedImg path={r.proof_url} className="w-full h-20 object-cover" />
        </div>
      )}
    </div>
  );
}

function Pill({ status, isTe }: { status: string; isTe: boolean }) {
  const lang = typeof document !== "undefined" ? document.documentElement.lang || "te" : "te";
  const tr = (te: string, en: string) => (lang === "en" || !isTe ? en : localizeText({ te, en }, lang));
  if (status === "accepted") return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300"><CheckCircle2 className="h-3 w-3"/>{tr("సమ్మతించారు", "Accepted")}</span>;
  if (status === "declined") return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300"><XCircle className="h-3 w-3"/>{tr("తిరస్కరించారు", "Declined")}</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300"><Clock className="h-3 w-3"/>{tr("వేచిఉంది", "Awaiting")}</span>;
}
