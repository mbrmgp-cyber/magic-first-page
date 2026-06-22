import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Save, Send, Pencil, FileText, FileSpreadsheet, Search, ShieldCheck, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lookupMemberByCode, recordMonthlyPayment } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/org/accounts")({
  head: () => ({ meta: [{ title: "Committee Accounts — Monthly Loan Entry" }] }),
  component: AccountsPage,
});

type Lookup = Awaited<ReturnType<typeof lookupMemberByCode>>;

function AccountsPage() {
  const lookup = useServerFn(lookupMemberByCode);
  const record = useServerFn(recordMonthlyPayment);

  const [idNo, setIdNo] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  const [info, setInfo] = useState<Extract<Lookup, { found: true }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ balance: number; emailed_to: string | null } | null>(null);
  const [locked, setLocked] = useState(false);

  async function doLookup(code: string) {
    if (!code.trim()) return;
    setBusy(true); setSaved(null);
    try {
      const res = await lookup({ data: { code } }) as Lookup;
      if (!res.found) { setInfo(null); toast.error("ఈ ID NO కనపడలేదు / Member not found"); return; }
      setInfo(res);
      setInterest(String(Math.round(res.monthlyInterest * 100) / 100));
    } catch (e: any) {
      toast.error(e?.message ?? "Lookup failed");
    } finally { setBusy(false); }
  }

  async function onSave() {
    if (!info) { toast.error("Look up a member first"); return; }
    const p = Number(principal || 0), i = Number(interest || 0);
    if (p + i <= 0) { toast.error("అసలు లేదా వడ్డీ నమోదు చేయండి"); return; }
    setBusy(true);
    try {
      const res = await record({
        data: {
          member_code: idNo, payment_date: date,
          principal_amount: p, interest_amount: i,
          remarks: remarks || undefined,
        },
      });
      setSaved({ balance: res.balance, emailed_to: res.emailed_to });
      setLocked(true);
      toast.success(`Saved. రసీదు ${res.emailed_to ?? "—"}కు పంపబడింది`);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(false); }
  }

  function onEdit() { setLocked(false); }
  function comingSoon(label: string) { toast(`${label} — coming soon`); }

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/org/dashboard" className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        {/* Header */}
        <Card className="p-4 bg-white/95 border-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-orange-600" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Society</p>
              <p className="font-bold text-foreground">చిట్వేల్ హెల్ప్ లైన్ సొసైటీ</p>
            </div>
          </div>
          <h1 className="mt-3 text-lg md:text-2xl font-bold" style={{
            background: "linear-gradient(90deg,#FF9933,#138808)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            కమిటీ అకౌంట్స్ – నెలవారీ అప్పు వివరాల నమోదు
          </h1>
          <p className="text-xs text-muted-foreground">Committee Accounts – Monthly Loan Entry</p>
        </Card>

        {/* Lookup row */}
        <Card className="p-4 bg-white/95 border-white shadow-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>ID NO</Label>
              <div className="flex gap-2">
                <Input value={idNo} onChange={(e) => setIdNo(e.target.value.toUpperCase())}
                  placeholder="e.g. A/0001" disabled={locked} />
                <Button type="button" onClick={() => doLookup(idNo)} disabled={busy || locked}>
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>DATE / తేది</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={locked} />
            </div>
            <div className="space-y-1.5">
              <Label>REMARKS / గమనికలు</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={locked} placeholder="—" />
            </div>
          </div>

          {/* Dynamic auto-populated */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border bg-orange-50/60 p-3">
            <Field label="అప్పు తీసుకున్న వారి పేరు" value={info?.member.name ?? "—"} />
            <Field label="అప్పు మొత్తం (Outstanding)"
              value={info ? `₹ ${info.totalOutstanding.toLocaleString("en-IN")}` : "—"} />
            <Field label="వడ్డీ మొత్తం (Monthly)"
              value={info ? `₹ ${info.monthlyInterest.toLocaleString("en-IN")}` : "—"} />
          </div>

          {/* Editable entries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>అసలు జమ (Principal Paid)</Label>
              <Input inputMode="decimal" value={principal} disabled={locked}
                onChange={(e) => setPrincipal(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>వడ్డీ జమ (Interest Paid)</Label>
              <Input inputMode="decimal" value={interest} disabled={locked}
                onChange={(e) => setInterest(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
            </div>
          </div>

          {/* Surety */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border bg-green-50/60 p-3">
            <Field label="అప్పు చేసిన వారి సంతకం"
              value={info?.member.name ? `${info.member.name} (${info.member.member_code ?? "—"})` : "—"} />
            <Field label="షూరిటీ సంతకం + ID NO"
              value={info?.surety ? `${info.surety.name} (${info.surety.member_code ?? "—"})` : "—"} />
          </div>

          {saved && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              ✅ Saved. Updated balance: <b>₹ {saved.balance.toLocaleString("en-IN")}</b>.{" "}
              {saved.emailed_to && <>Receipt emailed to <b>{saved.emailed_to}</b>.</>}
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button onClick={onSave} disabled={busy || locked} className="bg-orange-600 hover:bg-orange-700">
              <Save className="h-4 w-4" /> Save / సేవ్
            </Button>
            <Button variant="outline" onClick={() => comingSoon("Send File")} disabled={busy}>
              <Send className="h-4 w-4" /> Send File
            </Button>
            <Button variant="outline" onClick={onEdit} disabled={!locked}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => comingSoon("Personal File PDF")} disabled={busy}>
              <FileText className="h-4 w-4" /> Personal File PDF
            </Button>
            <Button variant="outline" onClick={() => comingSoon("Total File PDF")} disabled={busy}>
              <FileSpreadsheet className="h-4 w-4" /> Total File PDF
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
