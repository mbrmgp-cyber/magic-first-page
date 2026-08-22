import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendVaradhiLoginLink } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Mail, KeyRound, Lock, UserPlus } from "lucide-react";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";

export const Route = createFileRoute("/varadhi/auth")({
  head: () => ({
    meta: [
      { title: "Vaaradhi — Login" },
      { name: "description", content: "Sign in to Vaaradhi (వారధి) with your email and password, or register with an email OTP." },
      { property: "og:title", content: "Vaaradhi — Login" },
      { property: "og:description", content: "Register with an email OTP, then sign in to Vaaradhi with email and password." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Vaaradhi" },
      { property: "og:url", content: "https://mbrplatform.com/varadhi/auth" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mbrplatform.com/varadhi/auth" }],
  }),
  component: VaradhiAuthPage,
});

type Tab = "login" | "register";
type Step = "form" | "otp" | "password";

function VaradhiAuthPage() {
  const navigate = useNavigate();
  const sendOtp = useServerFn(sendVaradhiLoginLink);
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [busy, setBusy] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user && allowRedirect) navigate({ to: "/varadhi/onboard", replace: true });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!allowRedirect) return;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
        navigate({ to: "/varadhi/onboard", replace: true });
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [allowRedirect]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("ఈమెయిల్ లేదా పాస్‌వర్డ్ సరికాదు. కొత్తవారైతే ముందు రిజిస్టర్ చేయండి.");
      return;
    }
    // onAuthStateChange navigates
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setAllowRedirect(false);
    const res = await sendOtp({ data: { email: email.trim().toLowerCase(), mode: "otp" } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setBusy(false);
    if (!res?.sent) {
      toast.error((res as any)?.reason || "OTP పంపడం విఫలమైంది");
      return;
    }
    setOtpLength(Number((res as any)?.otpLength) || 6);
    setStep("otp");
    toast.success("మీ ఈమెయిల్‌కు కోడ్ పంపాం");
  }

  async function verifyOtp(e?: React.FormEvent, code?: string) {
    e?.preventDefault();
    const token = (code ?? otp).trim();
    if (token.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    setBusy(false);
    if (error) {
      toast.error("కోడ్ చెల్లదు లేదా గడువు ముగిసింది");
      return;
    }
    setStep("password");
  }

  useEffect(() => {
    if (step === "otp" && otp.length === otpLength && !busy) verifyOtp(undefined, otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, otpLength]);

  async function forgotPassword() {
    if (!email.trim()) {
      toast.error("ఈమెయిల్ చిరునామా ఎంటర్ చేయండి");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/varadhi/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Reset link పంపలేకపోయాం");
      return;
    }
    toast.success("మీ ఈమెయిల్‌కు పాస్‌వర్డ్ రీసెట్ లింక్ పంపాం");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి");
      return;
    }
    if (password !== password2) {
      toast.error("రెండు పాస్‌వర్డ్‌లు ఒకేలా లేవు");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message || "పాస్‌వర్డ్ సేవ్ కాలేదు");
      return;
    }
    toast.success("రిజిస్ట్రేషన్ పూర్తి! ఇక ఈమెయిల్ + పాస్‌వర్డ్‌తో లాగిన్ కావచ్చు.");
    setAllowRedirect(true);
    navigate({ to: "/varadhi/onboard", replace: true });
  }


  const inputCls =
    "w-full rounded-xl border border-[#1e3a8a]/20 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#f97316]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5bdb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <img src={varadhiLogo.url} alt="Vaaradhi" className="mx-auto h-16 w-16 rounded-2xl object-contain bg-white p-1 shadow" />
          <h1 className="mt-3 text-2xl font-bold text-[#1e3a8a]">వారధి</h1>
          <p className="text-xs text-[#1e3a8a]/70">వారధి లాగిన్</p>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#f97316]" />
        </div>

        {step === "form" && (
          <div className="mt-5">
            <button
              type="button"
              disabled={tab === "register"}
              onClick={() => { setTab("register"); setPassword(""); setPassword2(""); setOtp(""); }}
              className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
                tab === "register"
                  ? "bg-[#f97316] text-white shadow"
                  : "bg-[#1e3a8a]/5 text-[#1e3a8a] hover:bg-[#1e3a8a]/10"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> New Registration
            </button>
          </div>
        )}

        {step === "form" && tab === "login" && (
          <form onSubmit={doLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">ఈమెయిల్</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">పాస్‌వర్డ్</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? "లాగిన్ అవుతోంది…" : "లాగిన్"}
            </button>
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="w-full text-center text-[11px] text-blue-600 hover:text-blue-700 underline"
            >
              Forgot Password?
            </button>
          </form>
        )}

        {step === "form" && tab === "register" && (
          <form onSubmit={requestOtp} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">ఈమెయిల్</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? "కోడ్ పంపిస్తున్నాం…" : "OTP కోడ్ పంపండి"}
            </button>
            <p className="text-center text-[11px] text-[#1e3a8a]/60">
              OTP వెరిఫై అయిన తర్వాత మీ పాస్‌వర్డ్ సెట్ చేసుకోండి. తర్వాత ఈమెయిల్ + పాస్‌వర్డ్‌తో లాగిన్.
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 p-3 text-center text-[#1e3a8a]">
              <p className="text-xs">{otpLength} అంకెల కోడ్ పంపాం — <b>{email}</b></p>
            </div>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus
              maxLength={otpLength}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, otpLength))}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, otpLength);
                if (t) { e.preventDefault(); setOtp(t); }
              }}
              placeholder={"1".repeat(otpLength)}
              className="w-full rounded-xl border border-[#1e3a8a]/20 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] font-bold text-[#1e3a8a] outline-none focus:border-[#f97316]"
            />
            <button type="submit" disabled={busy || otp.length !== otpLength} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? "వెరిఫై చేస్తున్నాం…" : "వెరిఫై చేయండి"}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => { setStep("form"); setOtp(""); }} className="text-[#1e3a8a]/70 underline">
                ← వేరే ఈమెయిల్
              </button>
              <button type="button" onClick={() => requestOtp()} className="text-[#f97316] font-semibold">
                మళ్లీ కోడ్ పంపండి
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={setNewPassword} className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center text-emerald-800">
              <KeyRound className="mx-auto mb-1 h-5 w-5" />
              <p className="text-xs font-semibold">ఈమెయిల్ వెరిఫై అయ్యింది. ఇప్పుడు పాస్‌వర్డ్ సెట్ చేయండి.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">కొత్త పాస్‌వర్డ్</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="కనీసం 6 అక్షరాలు" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">పాస్‌వర్డ్ మళ్లీ</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="••••••" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? "సేవ్ అవుతోంది…" : "పాస్‌వర్డ్ సేవ్ చేసి కొనసాగండి"}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate({ to: "/varadhi" })}
          className="mt-6 w-full text-center text-xs text-[#1e3a8a]/60 hover:underline"
        >
          ← వారధి హోమ్‌కి తిరిగి
        </button>
      </div>
    </div>
  );
}
