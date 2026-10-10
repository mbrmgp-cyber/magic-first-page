import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { validateOrgCode, submitMemberRequest, sendMemberIdLoginLink } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Image as ImageIcon, QrCode, ScanLine, RefreshCw, Camera, Plus, CheckCircle2, ShieldCheck, UserPlus, LogIn, ArrowLeft, KeyRound } from "lucide-react";
import mbrLogoAsset from "@/assets/mbr-logo.png.asset.json";
import { decodeQrFromFile, QrScanner } from "@/components/QrScanner";
import { localizeText, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/member/register")({
  head: () => ({
    meta: [
      { title: "Member Registration & Login — MBR App" },
      {
        name: "description",
        content:
          "Register as a society member on the MBR App: fill in your details, upload documents and get approval from your society admin.",
      },
      { property: "og:title", content: "Member Registration & Login — MBR App" },
      {
        property: "og:description",
        content: "Fill in your details, upload documents and get approval from your society admin on the MBR App.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mbrplatform.com/member/register" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mbrplatform.com/member/register" }],
  }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { code?: string } => {
    const code = typeof s.code === "string" && s.code ? s.code : undefined;
    return code ? { code } : {};
  },
  component: function MemberRegisterRoute() {
    const search = Route.useSearch();
    return <MemberRegister initialCode={search.code} />;
  },
});

export { MemberRegister };

function BiLabel({ en, te, required }: { en: string; te: string; required?: boolean }) {
  const { lang } = useI18n();
  return (
    <Label className="text-zinc-200 leading-tight block">
      <span className="font-semibold">{localizeText({ en, te }, lang)}{required && " *"}</span>
    </Label>
  );
}

function MemberRegister({ initialCode }: { initialCode?: string }) {
  const navigate = useNavigate();
  const validate = useServerFn(validateOrgCode);
  const submit = useServerFn(submitMemberRequest);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const search = { code: initialCode };

  const [stage, setStage] = useState<"code" | "scan" | "portal" | "login" | "form" | "done">(search.code ? "form" : "code");
  const [code, setCode] = useState(search.code?.toUpperCase() ?? "");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgLetter, setOrgLetter] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!search.code);
  const [memberSeq, setMemberSeq] = useState("");
  const sendLogin = useServerFn(sendMemberIdLoginLink);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const qrHostId = useRef(`qr-file-${Math.random().toString(36).slice(2)}`);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showBank, setShowBank] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    father_name: "",
    village: "",
    pin_code: "",
    email: "",
    phone: "",
    blood_group: "",
    introduced_by_name: "",
    introducer_id: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordError =
    password.length > 0 && password.length < 6
      ? lt("Password must be at least 6 characters", "పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి")
      : confirmPassword.length > 0 && password !== confirmPassword
        ? lt("Passwords do not match", "పాస్‌వర్డ్‌లు సరిపోలలేదు")
        : null;

  function normalizeCodeInput(input: string) {
    const raw = (input || "").trim();
    try {
      const parsed = JSON.parse(raw);
      const value = parsed?.code || parsed?.org_code || parsed?.orgCode;
      if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
    } catch {}
    try {
      const url = new URL(raw);
      const value = url.searchParams.get("code") || url.searchParams.get("org_code") || url.searchParams.get("orgCode");
      if (value) return value.trim().toUpperCase();
    } catch {}
    const queryMatch = raw.match(/[?&](?:code|org_code|orgCode)=([^&#]+)/i);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    return raw.toUpperCase();
  }

  async function verifyCode(c: string, opts?: { goTo?: "portal" | "form" }) {
    const normalized = normalizeCodeInput(c);
    setLoading(true);
    try {
      const res = await validate({ data: { code: normalized } });
      if (!res.valid) {
        toast.error(lt("Invalid Code", "చెల్లని కోడ్"));
        setStage("code");
        return;
      }
      setCode(res.org.org_code ?? normalized);
      setOrgName(res.org.name);
      setOrgId(res.org.id);
      setOrgLetter(res.org.letter_code ?? normalized);
      setOrgLogo(res.org.logo_url ?? null);
      setStage(opts?.goTo ?? "portal");
    } finally { setLoading(false); }
  }

  async function onSendMemberLogin() {
    if (!memberSeq.trim()) {
      toast.error(lt("Enter Member ID", "మెంబర్ ఐడి నమోదు చేయండి"));
      return;
    }
    setLoading(true);
    try {
      const res = await sendLogin({ data: { org_code: orgLetter || code, member_seq: memberSeq.trim(), lang } });
      if (!res.sent) {
        if (res.reason === "member_not_found") {
          toast.error(lt("Member ID not found in this society", "ఈ సొసైటీలో ఈ మెంబర్ ఐడి లేదు"));
        } else {
          toast.error(lt("Could not send login link", "లాగిన్ లింక్ పంపలేకపోయాం"));
        }
        return;
      }
      toast.success(lt(`Login link sent to ${res.email_hint ?? "your email"}`, `లాగిన్ లింక్ ${res.email_hint ?? "మీ ఈమెయిల్"} కు పంపబడింది`));
    } catch (e: any) {
      toast.error(e.message ?? lt("Failed", "విఫలమైంది"));
    } finally { setLoading(false); }
  }


  // Auto-verify when ?code=ABC is supplied (e.g. from ID card back QR)
  useEffect(() => {
    if (search.code && !orgId) {
      void verifyCode(search.code, { goTo: "form" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code]);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error(lt("Photo must be under 5MB", "ఫోటో 5MB లోపు ఉండాలి")); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function onQrImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const text = await decodeQrFromFile(f, qrHostId.current, false);
      await verifyCode(text);
    } catch (err: any) {
      toast.error(err?.message ?? lt("Could not read QR from image", "చిత్రం నుండి QR చదవలేకపోయాం"));
    } finally {
      setLoading(false);
      if (qrFileRef.current) qrFileRef.current.value = "";
    }
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(lt("Could not read photo", "ఫోటో చదవలేకపోయాం")));
      reader.readAsDataURL(file);
    });
  }

  const requiredMissing =
    !photoFile ||
    !form.first_name.trim() ||
    !form.last_name.trim() ||
    !form.village.trim() ||
    !form.pin_code.trim() ||
    !form.email.trim() ||
    !form.phone.trim() ||
    !form.blood_group ||
    !form.introduced_by_name.trim() ||
    password.length < 6 ||
    password !== confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requiredMissing) {
      toast.error(lt("Please fill all required fields and upload photo", "అన్ని అవసరమైన వివరాలు పూర్తి చేసి ఫోటో అప్‌లోడ్ చేయండి"));
      return;
    }
    setLoading(true);
    try {
      // Create the login account first so a weak/invalid password stops the request.
      const { supabase } = await import("@/integrations/supabase/client");
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + "/mbr" },
      });
      if (signUpError && !/already|registered|exists/i.test(signUpError.message)) {
        throw new Error(signUpError.message);
      }
      const photo_data_url = photoFile ? await fileToDataUrl(photoFile) : undefined;
      const receipt_data_url = receiptFile ? await fileToDataUrl(receiptFile) : undefined;
      await submit({
        data: {
          code,
          name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          phone: form.phone || undefined,
          photo_data_url,
          receipt_data_url,
          father_name: form.father_name || undefined,
          address: [form.village, form.pin_code].filter(Boolean).join(", ") || undefined,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          village: form.village || undefined,
          pin_code: form.pin_code || undefined,
          bank_name: showBank ? form.bank_name || undefined : undefined,
          bank_account_number: showBank ? form.bank_account_number || undefined : undefined,
          bank_ifsc: showBank ? form.bank_ifsc || undefined : undefined,
          blood_group: form.blood_group || undefined,
          introduced_by_name: form.introduced_by_name || undefined,
          introducer_id: form.introducer_id || undefined,
          preferred_lang: lang,
        },
      });
      setStage("done");
      toast.success(lt("Submitted for approval", "ఆమోదం కోసం సమర్పించబడింది"));
    } catch (e: any) {
      toast.error(e.message ?? lt("Failed", "విఫలమైంది"));
    } finally { setLoading(false); }
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 space-y-5 text-center bg-zinc-950 border-zinc-800 shadow-[0_0_40px_rgba(255,140,40,0.15)]">
          <div className="mx-auto h-16 w-16 rounded-full bg-[#ff8c28]/15 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-[#ff8c28]" />
          </div>
          <h1 className="text-2xl font-bold">{lt("Submitted for Approval", "ఆమోదం కోసం సమర్పించబడింది")}</h1>
          <p className="text-zinc-300 leading-relaxed">
            {lt("Your details are under verification. Please confirm your email using the link we sent. Once the society approves you, log in with your email and password.", "మీ వివరాలు సమీక్షలో ఉన్నాయి. మేము పంపిన లింక్‌తో మీ ఈమెయిల్‌ను నిర్ధారించండి. సొసైటీ ఆమోదించిన తర్వాత మీ ఈమెయిల్, పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.")}
          </p>

          <Button onClick={() => navigate({ to: "/member/pending" })}
            className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.4)]">
            {lt("Check Status", "స్టేటస్ చూడండి")}
          </Button>
        </Card>
      </div>
    );
  }

  if (stage === "scan") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-950 border-zinc-800">
          <h1 className="text-xl font-bold">{lt("Scan Society QR", "సొసైటీ క్యూఆర్ స్కాన్")}</h1>
          <QrScanner onScan={(t) => verifyCode(t)} onError={(e) => toast.error(e)} />
          <Button variant="outline" onClick={() => setStage("code")}
            className="w-full bg-transparent border-zinc-700 text-white hover:bg-zinc-900">
            {lt("Type code instead", "బదులుగా కోడ్ టైప్ చేయండి")}
          </Button>
        </Card>
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-12">
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <h1 className="text-xl font-bold">{lt("Member Registration", "సభ్యుని రిజిస్ట్రేషన్")}</h1>
            <p className="text-xs text-zinc-400 mt-1">{orgName}</p>
          </div>

          <Card className="p-5 space-y-5 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.1)]">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-2 border-dashed border-[#ff8c28]/50 overflow-hidden bg-zinc-900 flex items-center justify-center">
                    {photoPreview
                      ? <img src={photoPreview} className="h-full w-full object-cover" />
                      : <Camera className="w-7 h-7 text-[#ff8c28]" />}
                  </div>
                  <input type="file" accept="image/*" onChange={onPhoto}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <span className="text-xs text-zinc-400">{lt("Upload Member Photo", "సభ్యుడి ఫోటో")}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <BiLabel en="First Name" te="సభ్యుడి పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.first_name} required
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <BiLabel en="Last Name" te="ఇంటి పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.last_name} required
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Father's Name" te="తండ్రి పేరు" />
                <Input className="bg-zinc-900 border-zinc-700 text-white"
                  value={form.father_name}
                  onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <BiLabel en="Village" te="గ్రామం పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white" required
                    value={form.village}
                    onChange={(e) => setForm({ ...form, village: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <BiLabel en="Pin Code" te="పిన్ నెంబర్" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white" inputMode="numeric" required
                    value={form.pin_code}
                    onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Email Address" te="ఈమెయిల్" required />
                <Input type="email" className="bg-zinc-900 border-zinc-700 text-white"
                  value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Password" te="పాస్‌వర్డ్" required />
                <Input type="password" autoComplete="new-password" className="bg-zinc-900 border-zinc-700 text-white"
                  value={password} required minLength={6}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Confirm Password" te="పాస్‌వర్డ్ నిర్ధారించండి" required />
                <Input type="password" autoComplete="new-password" className="bg-zinc-900 border-zinc-700 text-white"
                  value={confirmPassword} required minLength={6}
                  onChange={(e) => setConfirmPassword(e.target.value)} />
                {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Phone Number" te="ఫోన్ నెంబర్" required />
                <Input className="bg-zinc-900 border-zinc-700 text-white" inputMode="tel" required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Blood Group" te="బ్లడ్ గ్రూప్" required />
                <select
                  required
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-700 text-white px-3 text-sm"
                >
                  <option value="">{lt("Select Blood Group", "బ్లడ్ గ్రూప్ ఎంచుకోండి")}</option>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-white">
                  {lt("Reference Details", "పరిచయస్తుడి వివరాలు")}
                </p>
                <div className="space-y-1.5">
                  <BiLabel en="Introduced By Name" te="పరిచయస్తుడు పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white" required
                    value={form.introduced_by_name}
                    onChange={(e) => setForm({ ...form, introduced_by_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <BiLabel en="Introducer ID Number" te="పరిచయం చేసిన వారి ఐడి నంబర్" />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.introducer_id}
                    onChange={(e) => setForm({ ...form, introducer_id: e.target.value })} />
                </div>
              </div>


              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <button type="button" onClick={() => setShowBank((v) => !v)}
                  className="w-full flex items-center justify-between text-left">
                  <div>
                    <p className="text-sm font-semibold text-white">{lt("For Loan Disbursements", "లోన్ పంపిణీ కోసం")}</p>
                    <p className="text-[11px] text-zinc-400">{lt("Optional bank details", "ఐచ్ఛిక బ్యాంకు వివరాలు")}</p>
                  </div>
                  <Plus className={`h-5 w-5 text-[#ff8c28] transition-transform ${showBank ? "rotate-45" : ""}`} />
                </button>
                {showBank && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <BiLabel en="Bank Name" te="బ్యాంకు పేరు" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <BiLabel en="Account Number" te="ఖాతా నెంబర్" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_account_number}
                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <BiLabel en="IFSC Code" te="IFSC కోడ్" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_ifsc}
                        onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                <p className="text-sm font-semibold text-white">
                  {lt("Upload Membership Fee Receipt", "సభ్యత్వం ఫీజు రసీదు అప్లోడ్")}
                  <span className="ml-2 text-[11px] text-zinc-400">{lt("(Optional · ₹5,000)", "(ఐచ్ఛికం · ₹5,000)")}</span>
                </p>
                <Input type="file" accept="image/*,application/pdf"
                  className="bg-zinc-900 border-zinc-700 text-white"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { toast.error(lt("File must be under 5MB", "ఫైల్ 5MB లోపు ఉండాలి")); return; }
                    setReceiptFile(f);
                  }} />
                {receiptFile && <p className="text-[11px] text-emerald-400">✓ {receiptFile.name}</p>}
              </div>

              {requiredMissing && (
                <p className="text-[11px] text-amber-400 text-center">
                  {lt("Please upload photo and fill all required (*) fields to submit.", "సబ్మిట్ చేయడానికి ఫోటో అప్‌లోడ్ చేసి అన్ని అవసరమైన (*) వివరాలు నింపండి.")}
                </p>
              )}
              <Button type="submit" disabled={loading || requiredMissing}
                className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold shadow-[0_0_24px_rgba(255,140,40,0.45)] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> {lt("Submitting…", "సమర్పిస్తున్నాం…")}</> : <><ShieldCheck className="h-4 w-4" /> {lt("Submit for Approval", "ఆమోదం కోసం సమర్పించండి")}</>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // stage === "portal" — after verifying short org code, show two clear actions
  if (stage === "portal") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 space-y-6 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.15)]">
          <button onClick={() => setStage("code")} className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> {lt("Change Code", "కోడ్ మార్చండి")}
          </button>
          <div className="text-center space-y-2">
            <div className="mx-auto h-20 w-20 rounded-full bg-black border-2 border-[#ff8c28]/40 overflow-hidden flex items-center justify-center shadow-[0_0_24px_rgba(255,140,40,0.35)]">
              <img
                src={orgLogo || mbrLogoAsset.url}
                alt={orgName || "MBR APP"}
                className="h-full w-full object-contain p-1.5"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = mbrLogoAsset.url; }}
              />
            </div>
            <div className="text-xs uppercase tracking-wider text-[#ff8c28]/90">{lt("Society", "సొసైటీ")} · {orgLetter || code}</div>
            <h1 className="text-xl font-bold leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{orgName}</h1>
          </div>

          <div className="space-y-3 pt-2">
            <Button onClick={() => setStage("form")}
              className="w-full h-12 bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.4)]">
              <UserPlus className="h-5 w-5 mr-2" />
              {lt("New Member Registration", "కొత్త సభ్యుడి రిజిస్ట్రేషన్")}
            </Button>
            <Button onClick={() => navigate({ to: "/auth" })} variant="outline"
              className="w-full h-12 bg-transparent border-zinc-600 text-white hover:bg-white/10">
              <KeyRound className="h-5 w-5 mr-2" />
              {lt("Login with Password", "పాస్‌వర్డ్‌తో లాగిన్ చేయండి")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // stage === "login" — member-id login flow
  if (stage === "login") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 space-y-5 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.15)]">
          <button onClick={() => setStage("portal")} className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> {lt("Back", "వెనుకకు")}
          </button>
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{lt("Member Login", "సభ్యుడి లాగిన్")}</h1>
            <p className="text-xs text-zinc-400">{orgName}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              {lt(
                "Login with your email or phone number and password.",
                "మీ ఈమెయిల్ లేదా ఫోన్ నంబర్ మరియు పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి."
              )}
            </p>
            <p className="text-[11px] text-zinc-500">
              {lt(
                "New user or forgot password? Register with an OTP sent to your registered email.",
                "కొత్తవారా లేదా పాస్‌వర్డ్ మర్చిపోయారా? మీ రిజిస్టర్డ్ ఈమెయిల్‌కు వచ్చే OTPతో రిజిస్టర్ అవ్వండి."
              )}
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/auth" })}
            className="w-full h-11 bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
            <LogIn className="h-4 w-4 mr-2" />
            {lt("Go to Login", "లాగిన్‌కు వెళ్లండి")}
          </Button>
        </Card>
      </div>
    );
  }

  // stage === "code" — simplified short-code entry portal
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-7 space-y-5 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.15)]">
        <div className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 rounded-full bg-black border-2 border-[#ff8c28]/40 overflow-hidden flex items-center justify-center shadow-[0_0_24px_rgba(255,140,40,0.35)]">
            <img src={mbrLogoAsset.url} alt="MBR APP" className="h-full w-full object-contain p-1.5" />
          </div>
          <h1 className="text-2xl font-bold text-white">{lt("Enter Society Code", "సొసైటీ కోడ్ నమోదు చేయండి")}</h1>
          <p className="text-sm text-zinc-400">
            {lt("Type your short society code (A, B, C…)", "మీ సొసైటీ యొక్క చిన్న కోడ్ టైప్ చేయండి (A, B, C…)")}
          </p>
        </div>

        <div className="space-y-2">
          <Input value={code}
            autoFocus
            className="bg-zinc-900 border-zinc-700 text-white text-center text-2xl font-bold tracking-[0.4em] h-14 uppercase"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter" && code) verifyCode(code); }}
            placeholder="A" />
        </div>

        <Button onClick={() => verifyCode(code)} disabled={!code || loading}
          className="w-full h-12 bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.45)]">
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          {lt("Verify", "ధృవీకరించండి")}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-zinc-950 px-2 text-zinc-500">{lt("or", "లేదా")}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => setStage("scan")} disabled={loading}
            className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-900">
            <ScanLine className="h-4 w-4 mr-1.5" /> {lt("Scan QR", "QR స్కాన్")}
          </Button>
          <Button type="button" variant="outline" onClick={() => qrFileRef.current?.click()} disabled={loading}
            className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-900">
            <ImageIcon className="h-4 w-4 mr-1.5" /> {lt("Upload QR", "QR అప్లోడ్")}
          </Button>
        </div>
        <div id={qrHostId.current} className="hidden" />
        <input ref={qrFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/*" className="hidden" onChange={onQrImage} />
      </Card>
    </div>
  );
}
