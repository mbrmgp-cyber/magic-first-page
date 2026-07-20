import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Pencil, FileText, Search, RefreshCw, Upload, BookOpen } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { lookupMemberByCode, recordMonthlyPayment } from "@/lib/accounts.functions";
import { listApprovedMembers } from "@/lib/members.functions";
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
  const fetchMembers = useServerFn(listApprovedMembers);
  const qc = useQueryClient();
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const membersQ = useQuery({ queryKey: ["approved-members"], queryFn: () => fetchMembers() });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [idNo, setIdNo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  // OLD LOAN payment inputs — stored as INR (Rs.)
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  // OLD LOAN foreign-currency helpers
  type FxCode = "INR" | "USD" | "AED" | "KWD" | "MYR";
  const [payCcy, setPayCcy] = useState<FxCode>("INR");
  const [payRate, setPayRate] = useState(""); // 1 unit foreign = ? INR
  const [payPrincipalFx, setPayPrincipalFx] = useState("");
  const [payInterestFx, setPayInterestFx] = useState("");
  // NEW LOAN
  const [newLoan, setNewLoan] = useState("");
  const [newLoanRate, setNewLoanRate] = useState("2");
  const [newLoanCcy, setNewLoanCcy] = useState<FxCode>("INR");
  const [newLoanFxRate, setNewLoanFxRate] = useState("");
  const [newLoanFxAmt, setNewLoanFxAmt] = useState("");
  const [nextDueMonths, setNextDueMonths] = useState<"1" | "3" | "6" | "12">("1");
  // Surety + signatures
  const [suretyName, setSuretyName] = useState("");
  const [suretyId, setSuretyId] = useState("");
  const [borrowerSig, setBorrowerSig] = useState<string | null>(null);
  const [suretySig, setSuretySig] = useState<string | null>(null);
  const { symbol: sym } = useCurrency();
  const { lang } = useI18n();
  const lt = (en: string, te: string) => (lang === "te" ? te : en);
  const [info, setInfo] = useState<Extract<Lookup, { found: true }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ balance: number; emailed_to: string | null; collected: number; disbursed: number } | null>(null);
  const [locked, setLocked] = useState(false);

  const fmtCur = (n: number) => `${sym} ${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtINR = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Auto-fetch FX rate (foreign → INR) from open.er-api.com
  async function fetchFxRate(code: FxCode): Promise<number | null> {
    if (code === "INR") return 1;
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${code}`);
      const j = await r.json();
      const inr = j?.rates?.INR;
      return typeof inr === "number" && inr > 0 ? Math.round(inr * 100) / 100 : null;
    } catch { return null; }
  }

  // Auto-populate payment currency rate on change
  useEffect(() => {
    if (payCcy === "INR") { setPayRate(""); return; }
    let cancel = false;
    fetchFxRate(payCcy).then((v) => { if (!cancel && v) setPayRate(String(v)); });
    return () => { cancel = true; };
  }, [payCcy]);

  // Auto-populate new-loan currency rate on change
  useEffect(() => {
    if (newLoanCcy === "INR") { setNewLoanFxRate(""); return; }
    let cancel = false;
    fetchFxRate(newLoanCcy).then((v) => { if (!cancel && v) setNewLoanFxRate(String(v)); });
    return () => { cancel = true; };
  }, [newLoanCcy]);

  // Auto-convert FX → INR for OLD LOAN payments
  useEffect(() => {
    if (payCcy === "INR") return;
    const r = Number(payRate || 0);
    if (!(r > 0)) return;
    if (payPrincipalFx) setPrincipal(String(Math.round(Number(payPrincipalFx) * r * 100) / 100));
    if (payInterestFx) setInterest(String(Math.round(Number(payInterestFx) * r * 100) / 100));
  }, [payPrincipalFx, payInterestFx, payRate, payCcy]);

  // Auto-convert FX → INR for NEW LOAN disbursement
  useEffect(() => {
    if (newLoanCcy === "INR") return;
    const r = Number(newLoanFxRate || 0);
    if (!(r > 0)) return;
    if (newLoanFxAmt) setNewLoan(String(Math.round(Number(newLoanFxAmt) * r * 100) / 100));
  }, [newLoanFxAmt, newLoanFxRate, newLoanCcy]);


  // Carry-forward: monthly due minus interest paid this entry
  const monthlyDue = info?.monthlyInterest ?? 0;
  const paidInterest = Number(interest || 0);
  const carryForward = Math.max(0, Math.round((monthlyDue - paidInterest) * 100) / 100);

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
      setIdNo(res.member.member_code ?? code);
      setSearchInput(`${res.member.name} (${res.member.member_code ?? code})`);
      setShowSuggest(false);
      setInterest(String(Math.round(res.monthlyInterest * 100) / 100));
    } catch (e: any) {
      toast.error(e?.message ?? "Lookup failed");
    } finally { setBusy(false); }
  }

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    const list = (membersQ.data?.members ?? []) as Array<{ id: string; name: string; member_code: string | null }>;
    // If it exactly matches the selected value, don't show suggestions
    if (info && searchInput === `${info.member.name} (${info.member.member_code ?? ""})`) return [];
    return list
      .filter((m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.member_code ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchInput, membersQ.data, info]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);


  async function onSave() {
    if (!info) { toast.error("Look up a member first"); return; }
    const p = Number(principal || 0), i = Number(interest || 0);
    const nl = Number(newLoan || 0), nr = Number(newLoanRate || 0);
    if (p + i + nl <= 0) { toast.error("ఏదైనా మొత్తం నమోదు చేయండి"); return; }
    // Compose remarks with FX + next-due metadata
    const meta: string[] = [];
    if (payCcy !== "INR" && Number(payRate) > 0) {
      meta.push(`Paid in ${payCcy} @ ${payRate} → INR`);
      if (payPrincipalFx) meta.push(`Principal ${payPrincipalFx} ${payCcy}`);
      if (payInterestFx) meta.push(`Interest ${payInterestFx} ${payCcy}`);
    }
    if (nl > 0) {
      if (newLoanCcy !== "INR" && Number(newLoanFxRate) > 0) {
        meta.push(`Disbursed ${newLoanFxAmt} ${newLoanCcy} @ ${newLoanFxRate} → INR`);
      }
      meta.push(`Next due: ${nextDueMonths} month(s)`);
    }
    const combinedRemarks = [remarks, ...meta].filter(Boolean).join(" • ");
    setBusy(true);
    try {
      const res = await record({
        data: {
          member_code: idNo, payment_date: date,
          principal_amount: p, interest_amount: i,
          new_loan_amount: nl > 0 ? nl : undefined,
          new_loan_interest_rate: nl > 0 ? nr : undefined,
          remarks: combinedRemarks || undefined,
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
  async function downloadPersonalPdf() {
    if (!info) { toast.error(lt("Look up a member first", "మొదట సభ్యుని వెతకండి")); return; }
    setBusy(true);
    try {
      const { downloadPersonalStatementPdf } = await import("@/lib/loan-pdf");
      const safeSym = sym === "₹" ? "Rs." : sym === "د.إ" ? "AED" : sym === "د.ك" ? "KWD" : sym;
      const fmtAmt = (n: number) => `${safeSym} ${Number(n || 0).toLocaleString("en-IN")}`;
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
          </div>
          <Link
            to="/org/master-ledger"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-bold shadow-lg hover:shadow-xl hover:brightness-110 transition-all border border-amber-300"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm md:text-base">మాస్టర్ లెడ్జర్ చూడండి / View Master Ledger</span>
            </span>
            <span className="text-lg">→</span>
          </Link>
        </Card>

        {/* Lookup row */}
        <Card className="p-4 bg-white/95 border-white shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label>సభ్యుని ID / పేరు</Label>
              <div ref={searchWrapRef} className="relative">
                <div className="flex gap-2">
                  <Input
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowSuggest(true);
                      const v = e.target.value.trim();
                      if (/^[A-Za-z]?\/?\d+$/.test(v)) setIdNo(v.toUpperCase());
                    }}
                    onFocus={() => setShowSuggest(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (suggestions.length > 0) {
                          const m = suggestions[0];
                          if (m.member_code) doLookup(m.member_code);
                        } else if (idNo) {
                          doLookup(idNo);
                        }
                      }
                    }}
                    placeholder="ఉదా. A/0001 లేదా పేరు"
                    disabled={locked}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const q = searchInput.trim();
                      if (/^[A-Za-z]?\/?\d+$/.test(q)) doLookup(q);
                      else if (suggestions[0]?.member_code) doLookup(suggestions[0].member_code);
                      else if (idNo) doLookup(idNo);
                    }}
                    disabled={busy || locked}
                  >
                    {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {showSuggest && suggestions.length > 0 && !locked && (
                  <ul className="absolute z-20 mt-1 left-0 right-0 max-h-64 overflow-auto rounded-md border bg-white shadow-lg">
                    {suggestions.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between gap-2 border-b last:border-b-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (m.member_code) doLookup(m.member_code);
                          }}
                        >
                          <span className="font-medium text-foreground truncate">{m.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{m.member_code ?? "—"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showSuggest && searchInput.trim() && suggestions.length === 0 && membersQ.data && !locked && (
                  <div className="absolute z-20 mt-1 left-0 right-0 rounded-md border bg-white shadow-lg px-3 py-2 text-xs text-muted-foreground">
                    సరిపోలిక లేదు / No matches
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label>గమనికలు</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={locked} placeholder="—" />
            </div>
            <div className="space-y-1.5 md:w-36 shrink-0">
              <Label className="text-xs">తేదీ</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} disabled={locked} className="text-sm" />
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
              <p className="text-xs font-bold text-red-600 tracking-wide">పాత అప్పు (Rs.)</p>
              <div>
                <p className="text-[11px] text-muted-foreground">అసలు బాకీ / Outstanding Principal</p>
                <p className="font-bold text-lg">{info ? fmtINR(info.totalOutstanding) : "Rs. 0"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">చెల్లించవలసిన వడ్డీ / Interest Due (this month)</p>
                <p className="font-bold text-lg text-orange-700">{info ? fmtINR(info.monthlyInterest) : "Rs. 0"}</p>
              </div>

              {/* Payment currency */}
              <div className="pt-2 border-t border-orange-200 space-y-2">
                <Label className="text-xs">చెల్లింపు కరెన్సీ / Payment currency</Label>
                <div className="flex gap-2">
                  <select
                    value={payCcy}
                    onChange={(e) => setPayCcy(e.target.value as FxCode)}
                    disabled={locked}
                    className="flex-1 rounded-md border px-2 py-2 text-sm bg-white"
                  >
                    <option value="INR">INR (Rs.)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="KWD">KWD (د.ك)</option>
                    <option value="MYR">MYR (RM)</option>
                  </select>
                  {payCcy !== "INR" && (
                    <Input
                      inputMode="decimal" value={payRate} disabled={locked}
                      onChange={(e) => setPayRate(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="1 = ? Rs."
                      className="w-32"
                    />
                  )}
                </div>
                {payCcy !== "INR" && Number(payRate) > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    1 {payCcy} = Rs. {Number(payRate).toLocaleString("en-IN")}
                  </p>
                )}
              </div>

              {payCcy !== "INR" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">అసలు జమ ({payCcy})</Label>
                    <Input inputMode="decimal" value={payPrincipalFx} disabled={locked}
                      onChange={(e) => setPayPrincipalFx(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                    <p className="text-[10px] text-green-700">= {fmtINR(Number(principal || 0))}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">వడ్డీ జమ ({payCcy})</Label>
                    <Input inputMode="decimal" value={payInterestFx} disabled={locked}
                      onChange={(e) => setPayInterestFx(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                    <p className="text-[10px] text-green-700">= {fmtINR(Number(interest || 0))}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">అసలు జమ (Rs.)</Label>
                    <Input inputMode="decimal" value={principal} disabled={locked}
                      onChange={(e) => setPrincipal(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">వడ్డీ జమ (Rs.)</Label>
                    <Input inputMode="decimal" value={interest} disabled={locked}
                      onChange={(e) => setInterest(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                  </div>
                </>
              )}

              {info && paidInterest < monthlyDue && paidInterest >= 0 && (
                <div className="text-[11px] rounded-md bg-yellow-100 border border-yellow-300 p-2 text-yellow-900">
                  Carry-forward: <b>{fmtINR(carryForward)}</b> unpaid interest — వచ్చే నెల బాకీలో జమ అవుతుంది
                </div>
              )}
            </div>

            {/* TODAY NEW LOAN */}
            <div className="rounded-lg border-2 border-red-300 bg-red-50/40 p-3 space-y-3">
              <p className="text-xs font-bold text-red-600 tracking-wide">ఈ రోజు కొత్త అప్పు</p>

              <div className="space-y-2">
                <Label className="text-xs">కరెన్సీ / Disburse currency</Label>
                <div className="flex gap-2">
                  <select
                    value={newLoanCcy}
                    onChange={(e) => setNewLoanCcy(e.target.value as FxCode)}
                    disabled={locked}
                    className="flex-1 rounded-md border px-2 py-2 text-sm bg-white"
                  >
                    <option value="INR">INR (Rs.)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="KWD">KWD (د.ك)</option>
                    <option value="MYR">MYR (RM)</option>
                  </select>
                  {newLoanCcy !== "INR" && (
                    <Input
                      inputMode="decimal" value={newLoanFxRate} disabled={locked}
                      onChange={(e) => setNewLoanFxRate(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="1 = ? Rs." className="w-32"
                    />
                  )}
                </div>
              </div>

              {newLoanCcy !== "INR" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-green-700 font-semibold">కొత్త అప్పు ({newLoanCcy})</Label>
                  <Input inputMode="decimal" value={newLoanFxAmt} disabled={locked}
                    onChange={(e) => setNewLoanFxAmt(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                  <p className="text-[10px] text-green-700">= {fmtINR(Number(newLoan || 0))}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-green-700 font-semibold">కొత్త అప్పు మొత్తం (Rs.)</Label>
                  <Input inputMode="decimal" value={newLoan} disabled={locked}
                    onChange={(e) => setNewLoan(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-green-700 font-semibold">వడ్డీ రేటు (% నెలవారీ)</Label>
                <Input inputMode="decimal" value={newLoanRate} disabled={locked}
                  onChange={(e) => setNewLoanRate(e.target.value.replace(/[^\d.]/g, ""))} placeholder="2.0" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-green-700 font-semibold">తదుపరి బాకీ తేదీ / Next due</Label>
                <select
                  value={nextDueMonths}
                  onChange={(e) => setNextDueMonths(e.target.value as "1" | "3" | "6" | "12")}
                  disabled={locked}
                  className="w-full rounded-md border px-2 py-2 text-sm bg-white"
                >
                  <option value="1">1 నెల / 1 Month</option>
                  <option value="3">3 నెలలు / 3 Months</option>
                  <option value="6">6 నెలలు / 6 Months</option>
                  <option value="12">12 నెలలు / 12 Months</option>
                </select>
              </div>

              {newLoan && Number(newLoan) > 0 && (
                <div className="text-[11px] text-muted-foreground pt-2 border-t border-red-200 space-y-0.5">
                  <div>ఈ రోజు ఇవ్వబడుతుంది: <b className="text-red-700">{fmtINR(Number(newLoan))}</b></div>
                  <div>నెలవారీ వడ్డీ: <b>{fmtINR(Math.round(Number(newLoan) * Number(newLoanRate || 0)) / 100)}</b></div>
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
