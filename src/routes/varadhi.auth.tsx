import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendVaradhiLoginLink } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { MIN_PASSWORD_LENGTH, passwordUpdateErrorMessage } from "@/lib/password-errors";
import { Mail, KeyRound, Lock, UserPlus } from "lucide-react";
import varadhiLogo from "@/assets/logos/vaaradhi-logo-english.png";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import { currentAppPageUrl } from "@/lib/app-host-context";
import { clearVaradhiAuthProgress, readVaradhiAuthProgress, saveVaradhiAuthProgress } from "@/lib/varadhi-auth-progress";

export const Route = createFileRoute("/varadhi/auth")({
  validateSearch: (search: Record<string, unknown>): { email?: string } => {
    const email = typeof search.email === "string" ? search.email.trim().toLowerCase() : "";
    return email ? { email } : {};
  },
  head: () => ({
    meta: [
      { title: "Vaaradhi — Login" },
      { name: "description", content: "Sign in to Vaaradhi (వారధి) with your email and password, or register with an email OTP." },
      { property: "og:title", content: "Vaaradhi — Login" },
      { property: "og:description", content: "Register with an email OTP, then sign in to Vaaradhi with email and password." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Vaaradhi" },
      { property: "og:url", content: currentAppPageUrl("/varadhi/auth") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: currentAppPageUrl("/varadhi/auth") }],
  }),
  component: VaradhiAuthPage,
});

type Tab = "login" | "register";
type Step = "form" | "otp" | "password";

function VaradhiAuthPage() {
  const navigate = useNavigate();
  const { email: emailFromLink } = Route.useSearch();
  const { lang } = useI18n();
  const ui = (source: string) => sharedTranslation(lang, source) ?? source;
  const sendOtp = useServerFn(sendVaradhiLoginLink);
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const pending = readVaradhiAuthProgress(window.localStorage);
    if (pending) {
      setTab("register");
      setEmail(pending.email);
      setOtpLength(pending.otpLength);
      setStep("otp");
    } else if (emailFromLink) {
      // Arrived from the Login button in the OTP email (possibly another
      // browser): show the code entry step with the email prefilled.
      setTab("register");
      setEmail(emailFromLink);
      setOtpLength(8);
      setStep("otp");
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (pending?.step === "password" && data.user?.email?.toLowerCase() === pending.email) {
        setStep("password");
      } else if (data.user) {
        clearVaradhiAuthProgress(window.localStorage);
        navigate({ to: "/varadhi/dashboard", replace: true });
      }
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [navigate, emailFromLink]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(ui("ఈమెయిల్ లేదా పాస్‌వర్డ్ సరికాదు. కొత్తవారైతే ముందు రిజిస్టర్ చేయండి."));
      return;
    }
    clearVaradhiAuthProgress(window.localStorage);
    navigate({ to: "/varadhi/dashboard", replace: true });
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const res = await sendOtp({ data: { email: email.trim().toLowerCase(), mode: "otp" } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setBusy(false);
    if (!res?.sent) {
      toast.error(ui("Could not send OTP"));
      return;
    }
    const length = res.otpLength || 6;
    saveVaradhiAuthProgress(window.localStorage, { email, step: "otp", otpLength: length });
    setOtpLength(length);
    setOtp("");
    setStep("otp");
    toast.success(ui("మీ ఈమెయిల్‌కు కోడ్ పంపాం"));
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
      toast.error(ui("కోడ్ చెల్లదు లేదా గడువు ముగిసింది"));
      return;
    }
    saveVaradhiAuthProgress(window.localStorage, { email, step: "password", otpLength });
    setStep("password");
  }

  useEffect(() => {
    if (step === "otp" && otp.length === otpLength && !busy) verifyOtp(undefined, otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, otpLength]);

  async function forgotPassword() {
    if (!email.trim()) {
      toast.error(ui("ఈమెయిల్ చిరునామా ఎంటర్ చేయండి"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password?app=varadhi`,
    });
    setBusy(false);
    if (error) {
      toast.error(ui("Could not send the reset link"));
      return;
    }
    toast.success(ui("మీ ఈమెయిల్‌కు పాస్‌వర్డ్ రీసెట్ లింక్ పంపాం"));
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(ui("Password must be at least 8 letters or digits"));
      return;
    }
    if (password !== password2) {
      toast.error(ui("రెండు పాస్‌వర్డ్‌లు ఒకేలా లేవు"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(ui(passwordUpdateErrorMessage(error)), { duration: 8000 });
      return;
    }
    toast.success(ui("రిజిస్ట్రేషన్ పూర్తి! ఇక ఈమెయిల్ + పాస్‌వర్డ్‌తో లాగిన్ కావచ్చు."));
    clearVaradhiAuthProgress(window.localStorage);
    navigate({ to: "/varadhi/dashboard", replace: true });
  }


  const inputCls =
    "w-full rounded-xl border border-[#1e3a8a]/20 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#f97316]";

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-market-ink" role="status">{ui("Loading")}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5bdb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <img src={varadhiLogo} alt="Vaaradhi" className="mx-auto h-16 w-16 rounded-2xl object-contain bg-white p-1 shadow" />
          <h1 className="mt-3 text-2xl font-bold text-[#1e3a8a]">{ui("వారధి")}</h1>
          <p className="text-xs text-[#1e3a8a]/70">{ui("వారధి లాగిన్")}</p>
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
              <UserPlus className="h-3.5 w-3.5" /> {ui("New Registration")}
            </button>
          </div>
        )}

        {step === "form" && tab === "login" && (
          <form onSubmit={doLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{ui("ఈమెయిల్")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{ui("పాస్\u200cవర్డ్")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? ui("లాగిన్ అవుతోంది…") : ui("లాగిన్")}
            </button>
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="w-full text-center text-[11px] text-blue-600 hover:text-blue-700 underline"
            >
              {ui("Forgot Password")}
            </button>
          </form>
        )}

        {step === "form" && tab === "register" && (
          <form onSubmit={requestOtp} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{ui("ఈమెయిల్")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? ui("కోడ్ పంపిస్తున్నాం…") : ui("OTP కోడ్ పంపండి")}
            </button>
            <p className="text-center text-[11px] text-[#1e3a8a]/60">
              {ui("OTP వెరిఫై అయిన తర్వాత మీ పాస్‌వర్డ్ సెట్ చేసుకోండి. తర్వాత ఈమెయిల్ + పాస్‌వర్డ్‌తో లాగిన్.")}
            </p>
            <button
              type="button"
              onClick={() => { clearVaradhiAuthProgress(window.localStorage); setTab("login"); setOtp(""); }}
              className="w-full text-center text-[11px] text-blue-600 hover:text-blue-700 underline"
            >
              {ui("Already have an account? Login")}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 p-3 text-center text-[#1e3a8a]">
              <p className="text-xs">{otpLength} {ui("digit code sent to")} <b>{email}</b></p>
            </div>
            <input
              inputMode="numeric"
              aria-label={ui("Send OTP Code")}
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
            <button type="submit" disabled={busy || otp.length < 6} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? ui("వెరిఫై చేస్తున్నాం…") : ui("వెరిఫై చేయండి")}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" disabled={busy} onClick={() => { clearVaradhiAuthProgress(window.localStorage); setTab("register"); setStep("form"); setOtp(""); }} className="text-[#1e3a8a]/70 underline">
                ← {ui("Change email")}
              </button>
              <button type="button" disabled={busy} onClick={() => requestOtp()} className="text-[#f97316] font-semibold">
                {ui("Resend code")}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={setNewPassword} className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center text-emerald-800">
              <KeyRound className="mx-auto mb-1 h-5 w-5" />
              <p className="text-xs font-semibold">{ui("ఈమెయిల్ వెరిఫై అయ్యింది. ఇప్పుడు పాస్\u200cవర్డ్ సెట్ చేయండి.")}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{ui("కొత్త పాస్\u200cవర్డ్")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={ui("Minimum 8 letters or digits")} className={inputCls} />
              </div>
              <p className="mt-1 text-xs text-market-muted">{ui("Avoid easy passwords like 12345678 or 11111111.")}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{ui("పాస్\u200cవర్డ్ మళ్లీ")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={MIN_PASSWORD_LENGTH} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="••••••" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? ui("సేవ్ అవుతోంది…") : ui("పాస్‌వర్డ్ సేవ్ చేసి కొనసాగండి")}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate({ to: "/varadhi" })}
          className="mt-6 w-full text-center text-xs text-[#1e3a8a]/60 hover:underline"
        >
          {ui("← వారధి హోమ్‌కి తిరిగి")}
        </button>
      </div>
    </div>
  );
}
