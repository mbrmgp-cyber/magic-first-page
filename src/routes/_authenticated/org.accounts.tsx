import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Save, Pencil, FileText, FileSpreadsheet, Search, RefreshCw, Upload, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lookupMemberByCode, recordMonthlyPayment, getMasterLedger } from "@/lib/accounts.functions";
import { getMyOrg, updateOrgLogo } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/org/accounts")({
  head: () => ({ meta: [{ title: "కమిటీ ఖాతాలు — నెలవారీ అప్పు నమోదు" }] }),
  component: AccountsPage,
});

import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

type Lookup = Awaited<ReturnType<typeof lookupMemberByCode>>;

function AccountsPage() {
  const lookup = useServerFn(lookupMemberByCode);
  const record = useServerFn(recordMonthlyPayment);
  const fetchOrg = useServerFn(getMyOrg);
  const saveLogo = useServerFn(updateOrgLogo);
  const qc = useQueryClient();
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [idNo, setIdNo] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  const [newLoan, setNewLoan] = useState("");
  const [newLoanRate, setNewLoanRate] = useState("2");
  const { symbol: sym } = useCurrency();
  const { lang } = useI18n();
  const lt = (en: string, te: string) => (lang === "te" ? te : en);
  const fetchMaster = useServerFn(getMasterLedger);
  const [info, setInfo] = useState<Extract<Lookup, { found: true }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ balance: number; emailed_to: string | null; collected: number; disbursed: number } | null>(null);
  const [locked, setLocked] = useState(false);

  const fmtCur = (n: number) => `${sym} ${Number(n || 0).toLocaleString("en-IN")}`;

  async function onLogoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = f.name.split(".").pop() || "png";
      const path = `${user.id}/logo/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-documents").upload(path, f, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("URL generation failed");
      await saveLogo({ data: { logo_url: url } });
      await qc.invalidateQueries({ queryKey: ["my-org"] });
      toast.success("లోగో అప్‌డేట్ అయింది");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
    const nl = Number(newLoan || 0), nr = Number(newLoanRate || 0);
    if (p + i + nl <= 0) { toast.error("ఏదైనా మొత్తం నమోదు చేయండి"); return; }
    setBusy(true);
    try {
      const res = await record({
        data: {
          member_code: idNo, payment_date: date,
          principal_amount: p, interest_amount: i,
          new_loan_amount: nl > 0 ? nl : undefined,
          new_loan_interest_rate: nl > 0 ? nr : undefined,
          remarks: remarks || undefined,
        },
      });
      setSaved({
        balance: res.balance, emailed_to: res.emailed_to,
        collected: res.collected, disbursed: res.disbursed,
      });
      setLocked(true);
      await qc.invalidateQueries({ queryKey: ["master-ledger"] });
      toast.success(`Saved. రసీదు ${res.emailed_to ?? "—"}కు పంపబడింది`);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(false); }
  }

  function onEdit() { setLocked(false); }
  function comingSoon(label: string) { toast(`${label} — coming soon`); }

  async function downloadPersonalPdf() {
    if (!info) { toast.error(lt("Look up a member first", "మొదట సభ్యుని వెతకండి")); return; }
    setBusy(true);
    try {
      const { downloadPersonalStatementPdf } = await import("@/lib/loan-pdf");
      const fmtAmt = (n: number) => `${sym} ${Number(n || 0).toLocaleString("en-IN")}`;
      await downloadPersonalStatementPdf({
        orgName: orgQ.data?.org?.name ?? "Society",
        title: lt("Personal Loan Statement", "వ్యక్తిగత రుణ వివరాలు"),
        date,
        member: {
          name: info.member.name,
          code: info.member.member_code ?? idNo,
          phone: info.member.phone,
          email: info.member.email,
        },
        labels: {
          member: lt("Member", "సభ్యుడు"),
          date: lt("Date", "తేదీ"),
          phone: lt("Phone", "ఫోన్"),
          email: lt("Email", "ఇమెయిల్"),
          oldLoan: lt("Old Loan", "పాత అప్పు"),
          outstanding: lt("Outstanding Balance", "మొత్తం బాకీ"),
          monthly: lt("Monthly Interest", "నెలవారీ వడ్డీ"),
          todaysEntry: lt("Today's Entry", "ఈ రోజు నమోదు"),
          principalPaid: lt("Principal Paid", "అసలు జమ"),
          interestPaid: lt("Interest Paid", "వడ్డీ జమ"),
          newLoan: lt("New Loan", "కొత్త అప్పు"),
          newLoanRate: lt("New Loan Rate", "వడ్డీ రేటు"),
          remarks: lt("Remarks", "గమనికలు"),
          updatedBalance: lt("Updated Balance", "నవీకరించిన బాకీ"),
        },
        outstanding: fmtAmt(info.totalOutstanding),
        monthlyInterest: fmtAmt(info.monthlyInterest),
        principalPaid: fmtAmt(Number(principal || 0)),
        interestPaid: fmtAmt(Number(interest || 0)),
        newLoan: fmtAmt(Number(newLoan || 0)),
        newLoanRate: `${newLoanRate}%`,
        remarks: remarks || undefined,
        updatedBalance: saved ? fmtAmt(saved.balance) : undefined,
        fileName: `member-${idNo || "statement"}-${date}.pdf`,
      });
      toast.success(lt("PDF downloaded", "పిడిఎఫ్ డౌన్‌లోడ్ అయింది"));
    } catch (e: any) {
      toast.error(e?.message ?? "PDF failed");
    } finally { setBusy(false); }
  }

  async function downloadFullPdf() {
    setBusy(true);
    try {
      const { downloadMasterLedgerPdfCanvas } = await import("@/lib/loan-pdf");
      const res = await fetchMaster();
      const rows = res?.rows ?? [];
      const totals = res?.totals ?? { outstanding: 0, principal: 0, interest: 0, newLoan: 0, net: 0 };
      const fmtAmt = (n: number) => `${sym} ${Number(n || 0).toLocaleString("en-IN")}`;
      await downloadMasterLedgerPdfCanvas({
        orgName: orgQ.data?.org?.name ?? "Society",
        title: lt("Master Ledger", "మాస్టర్ లెడ్జర్"),
        dateText: new Date().toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { year: "numeric", month: "long", day: "numeric" }),
        rows,
        totals,
        headers: {
          id: "ID",
          name: lt("Name", "పేరు"),
          oldBal: lt("Old Bal", "పాత బాకీ"),
          principal: lt("Principal", "అసలు"),
          interest: lt("Interest", "వడ్డీ"),
          newLoan: lt("New Loan", "కొత్త అప్పు"),
          total: lt("Total", "మొత్తం"),
        },
        totalLabel: lt("Total", "మొత్తం"),
        fmt: fmtAmt,
        fileName: `master-ledger-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      toast.success(lt("PDF downloaded", "పిడిఎఫ్ డౌన్‌లోడ్ అయింది"));
    } catch (e: any) {
      toast.error(e?.message ?? "PDF failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-tricolor p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/org/accounts-hub" className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> ఖాతాల కేంద్రం
        </Link>

        {/* Header with logo + currency */}
        <Card className="p-4 bg-white/95 border-white shadow-xl">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition group"
                title="లోగో అప్‌లోడ్">
                {orgQ.data?.org?.logo_url ? (
                  <img src={orgQ.data.org.logo_url} alt="Society logo" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-orange-600" />
                )}
                {uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin" /></div>}
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 opacity-0 group-hover:opacity-100">సవరించు</div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoPicked} />
              <div className="leading-tight">
                <p className="text-[11px] tracking-wide text-muted-foreground">సొసైటీ</p>
                <p className="font-bold text-foreground">{orgQ.data?.org?.name ?? "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ"}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-[10px] tracking-wide text-muted-foreground">బేస్ కరెన్సీ ఖాతాల కేంద్రంలో సెట్ చేయబడింది</span>
            </div>
          </div>
          <h1 className="mt-3 text-lg md:text-2xl font-bold text-orange-700">
            కమిటీ ఖాతాలు – నెలవారీ అప్పు నమోదు
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">సభ్యుల చెల్లింపులు మరియు కొత్త అప్పులు</p>
            <Link to="/org/master-ledger" className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-semibold">
              <BookOpen className="h-3 w-3" /> మాస్టర్ లెడ్జర్ చూడండి →
            </Link>
          </div>
        </Card>

        {/* Lookup row */}
        <Card className="p-4 bg-white/95 border-white shadow-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>సభ్యుని ID</Label>
              <div className="flex gap-2">
                <Input value={idNo} onChange={(e) => setIdNo(e.target.value.toUpperCase())}
                  placeholder="ఉదా. A/0001" disabled={locked} />
                <Button type="button" onClick={() => doLookup(idNo)} disabled={busy || locked}>
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>తేదీ</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} disabled={locked} />
            </div>
            <div className="space-y-1.5">
              <Label>గమనికలు</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={locked} placeholder="—" />
            </div>
          </div>

          {/* Member name banner */}
          <div className="rounded-lg border bg-orange-50/60 p-3">
            <p className="text-[11px] tracking-wide text-muted-foreground">అప్పు తీసుకున్న వారి పేరు</p>
            <p className="text-lg font-bold text-foreground">{info?.member.name ?? "—"}</p>
          </div>

          {/* Dual-pane: OLD LOAN | TODAY NEW LOAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* OLD LOAN */}
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50/40 p-3 space-y-3">
              <p className="text-xs font-bold text-red-600 tracking-wide">పాత అప్పు</p>
              <div>
                <p className="text-[11px] text-muted-foreground">అప్పు మొత్తం (బాకీ)</p>
                <p className="font-bold text-lg">{sym} {info ? info.totalOutstanding.toLocaleString("en-IN") : "0"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">నెలవారీ వడ్డీ</p>
                <p className="font-bold text-lg">{sym} {info ? info.monthlyInterest.toLocaleString("en-IN") : "0"}</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-orange-200">
                <Label className="text-xs">అసలు జమ</Label>
                <Input inputMode="decimal" value={principal} disabled={locked}
                  onChange={(e) => setPrincipal(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">వడ్డీ జమ</Label>
                <Input inputMode="decimal" value={interest} disabled={locked}
                  onChange={(e) => setInterest(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
              </div>
            </div>

            {/* TODAY NEW LOAN */}
            <div className="rounded-lg border-2 border-red-300 bg-red-50/40 p-3 space-y-3">
              <p className="text-xs font-bold text-red-600 tracking-wide">ఈ రోజు కొత్త అప్పు</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-green-700 font-semibold">కొత్త అప్పు మొత్తం</Label>
                <Input inputMode="decimal" value={newLoan} disabled={locked}
                  onChange={(e) => setNewLoan(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-green-700 font-semibold">వడ్డీ రేటు (% నెలవారీ)</Label>
                <Input inputMode="decimal" value={newLoanRate} disabled={locked}
                  onChange={(e) => setNewLoanRate(e.target.value.replace(/[^\d.]/g, ""))} placeholder="2.0" />
              </div>
              {newLoan && Number(newLoan) > 0 && (
                <div className="text-[11px] text-muted-foreground pt-2 border-t border-red-200">
                  ఈ రోజు ఇవ్వబడుతుంది: <b className="text-red-700">{sym} {Number(newLoan).toLocaleString("en-IN")}</b>
                </div>
              )}
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
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900 space-y-1">
              <div>✅ సేవ్ అయింది. మొత్తం బాకీ: <b>{sym} {saved.balance.toLocaleString("en-IN")}</b></div>
              {saved.collected > 0 && <div>ఈ రోజు వసూలు: <b>{sym} {saved.collected.toLocaleString("en-IN")}</b></div>}
              {saved.disbursed > 0 && <div>కొత్త అప్పు: <b>{sym} {saved.disbursed.toLocaleString("en-IN")}</b></div>}
              {saved.emailed_to && <div>రసీదు <b>{saved.emailed_to}</b>కు పంపబడింది</div>}
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button onClick={onSave} disabled={busy || locked} className="bg-orange-600 hover:bg-orange-700">
              <Save className="h-4 w-4" /> సేవ్ చేయండి
            </Button>
            <Button variant="outline" onClick={onEdit} disabled={!locked}>
              <Pencil className="h-4 w-4" /> సవరించు
            </Button>
            <Button variant="outline" onClick={downloadPersonalPdf} disabled={busy}>
              <FileText className="h-4 w-4" /> {lt("Personal PDF", "వ్యక్తిగత పిడిఎఫ్")}
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
