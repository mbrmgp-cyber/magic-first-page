import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendMbrOtp, resolveMbrLoginEmail } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n, localizeText } from "@/lib/i18n";
import logo from "@/assets/mbr-logo.png.asset.json";
import { Mail, Lock, KeyRound, UserPlus } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — MBR App" },
      { name: "description", content: "Sign in to MBR App with your email or phone number and password. New users register with an OTP." },
      { property: "og:title", content: "Login — MBR App" },
      { property: "og:description", content: "Register with an OTP, then sign in to MBR App with email/phone and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Tab = "login" | "register";
type Step = "form" | "otp" | "password";

function AuthPage() {
  const navigate = useNavigate();
  const requestOtpFn = useServerFn(sendMbrOtp);
  const resolveEmailFn = useServerFn(resolveMbrLoginEmail);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);

  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("form");
  const [identifier, setIdentifier] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [busy, setBusy] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(true);

  async function redirectAfterLogin(userId: string) {
    const { routeAfterLogin } = await import("@/lib/post-login-redirect");
    await routeAfterLogin(userId, navigate);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && allowRedirect && data.session?.user) redirectAfterLogin(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!allowRedirect) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && session?.user) {
        redirectAfterLogin(session.user.id);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [allowRedirect]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let email = identifier.trim().toLowerCase();
    if (!email.includes("@")) {
      const res = await resolveEmailFn({ data: { identifier: email } }).catch(() => null);
      if (!res?.found) {
        setBusy(false);
        toast.error(lt("No account found for this phone number", "ఈ ఫోన్ నంబర్‌కు ఖాతా కనబడలేదు"));
        return;
      }
      email = res.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(lt("Email/phone or password is incorrect. New users: register with OTP.", "ఈమెయిల్/ఫోన్ లేదా పాస్‌వర్డ్ సరికాదు. కొత్తవారైతే OTPతో రిజిస్టర్ అవ్వండి."));
    }
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    setAllowRedirect(false);
    const res = await requestOtpFn({ data: { identifier: identifier.trim() } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setBusy(false);
    if (!res?.sent) {
      const reason = (res as any)?.reason;
      toast.error(
        reason === "not_found"
          ? lt("No member account found for this email/phone", "ఈ ఈమెయిల్/ఫోన్‌కు సభ్యుడి ఖాతా లేదు")
          : reason || lt("Could not send OTP", "OTP పంపలేకపోయాం")
      );
      return;
    }
    setOtpEmail((res as any).email);
    setOtpLength(Number((res as any).otpLength) || 6);
    setOtp("");
    setStep("otp");
    toast.success(lt("Code sent to your email", "మీ ఈమెయిల్‌కు కోడ్ పంపాం"));
  }

  async function verifyOtp(e?: React.FormEvent, code?: string) {
    e?.preventDefault();
    const token = (code ?? otp).trim();
    if (token.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token, type: "email" });
    setBusy(false);
    if (error) {
      toast.error(lt("Code is invalid or expired", "కోడ్ చెల్లదు లేదా గడువు ముగిసింది"));
      return;
    }
    setPassword("");
    setPassword2("");
    setStep("password");
  }

  useEffect(() => {
    if (step === "otp" && otp.length === otpLength && !busy) verifyOtp(undefined, otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, otpLength]);

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(lt("Password must be at least 6 characters", "పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి"));
      return;
    }
    if (password !== password2) {
      toast.error(lt("Passwords do not match", "రెండు పాస్‌వర్డ్‌లు ఒకేలా లేవు"));
      return;
    }
    setBusy(true);
    const { data: userRes, error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message || lt("Could not save password", "పాస్‌వర్డ్ సేవ్ కాలేదు"));
      return;
    }
    toast.success(lt("Registration complete! Log in with your password next time.", "రిజిస్ట్రేషన్ పూర్తి! ఇక పాస్‌వర్డ్‌తో లాగిన్ కావచ్చు."));
    setAllowRedirect(true);
    const uid = userRes.user?.id;
    if (uid) await redirectAfterLogin(uid);
  }

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
      active ? "bg-[#ff8c28] text-white shadow" : "text-zinc-400"
    }`;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[#ff8c28]/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#ff8c28]/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-6 space-y-6 bg-zinc-950 border-zinc-800 shadow-[0_0_60px_rgba(255,140,40,0.15)] text-white relative z-[1]">
        <div className="text-center space-y-3">
          <img src={logo.url} alt="MBR" className="mx-auto w-24 rounded-md bg-black p-2" />
          <h1 className="text-2xl font-bold text-white">{lt("Login", "లాగిన్")}</h1>
          <div className="h-[3px] w-24 mx-auto rounded-full bg-[#ff8c28]" />
        </div>

        {step === "form" && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-900 p-1">
            <button type="button" onClick={() => setTab("login")} className={tabBtn(tab === "login")}>
              <Lock className="h-3.5 w-3.5" /> {lt("Login", "లాగిన్")}
            </button>
            <button type="button" onClick={() => setTab("register")} className={tabBtn(tab === "register")}>
              <UserPlus className="h-3.5 w-3.5" /> {lt("Register / OTP", "రిజిస్ట్రేషన్ / OTP")}
            </button>
          </div>
        )}

        {step === "form" && tab === "login" && (
          <form onSubmit={doLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Email or phone number", "ఈమెయిల్ లేదా ఫోన్ నంబర్")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="you@example.com / 9876543210"
                  autoComplete="username"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Password", "పాస్‌వర్డ్")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]"
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]">
              {busy ? lt("Logging in…", "లాగిన్ అవుతోంది…") : lt("Login", "లాగిన్")}
            </Button>
            <button type="button" onClick={() => setTab("register")} className="w-full text-center text-[11px] text-zinc-400 underline">
              {lt("Forgot password? / New user? — register with OTP", "పాస్‌వర్డ్ మర్చిపోయారా? / కొత్తవారా? — OTPతో రిజిస్టర్ చేయండి")}
            </button>
          </form>
        )}

        {step === "form" && tab === "register" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Email or phone number", "ఈమెయిల్ లేదా ఫోన్ నంబర్")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="you@example.com / 9876543210"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]"
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0">
              {busy ? lt("Sending code…", "కోడ్ పంపిస్తున్నాం…") : lt("Send OTP code", "OTP కోడ్ పంపండి")}
            </Button>
            <p className="text-center text-[11px] text-zinc-400">
              {lt(
                "The OTP goes to the email registered for this member. After verifying, set your password.",
                "OTP ఈ సభ్యుడి రిజిస్టర్ ఈమెయిల్‌కు వెళ్తుంది. వెరిఫై అయ్యాక మీ పాస్‌వర్డ్ సెట్ చేసుకోండి."
              )}
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="rounded-xl border border-[#ff8c28]/30 bg-[#ff8c28]/10 p-3 text-center">
              <p className="text-xs text-zinc-200">
                {otpLength} {lt("digit code sent to", "అంకెల కోడ్ పంపాం —")} <b>{otpEmail}</b>
              </p>
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
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-center text-2xl tracking-[0.5em] font-bold text-white outline-none focus:border-[#ff8c28]"
            />
            <Button type="submit" disabled={busy || otp.length !== otpLength} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0">
              {busy ? lt("Verifying…", "వెరిఫై చేస్తున్నాం…") : lt("Verify", "వెరిఫై చేయండి")}
            </Button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => { setStep("form"); setOtp(""); }} className="text-zinc-400 underline">
                ← {lt("Change email/phone", "వేరే ఈమెయిల్/ఫోన్")}
              </button>
              <button type="button" onClick={() => requestOtp()} className="text-[#ff8c28] font-semibold">
                {lt("Resend code", "మళ్లీ కోడ్ పంపండి")}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={setNewPassword} className="space-y-4">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center text-emerald-300">
              <KeyRound className="mx-auto mb-1 h-5 w-5" />
              <p className="text-xs font-semibold">{lt("Verified. Now set your password.", "వెరిఫై అయ్యింది. ఇప్పుడు పాస్‌వర్డ్ సెట్ చేయండి.")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("New password", "కొత్త పాస్‌వర్డ్")}</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Repeat password", "పాస్‌వర్డ్ మళ్లీ")}</Label>
              <Input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" className="bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0">
              {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save password & continue", "పాస్‌వర్డ్ సేవ్ చేసి కొనసాగండి")}
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-zinc-400">
          <Link to="/" className="text-[#ff8c28] font-medium hover:underline">{lt("Back to home", "హోమ్‌కి తిరిగి")}</Link>
        </div>
      </Card>
    </div>
  );
}
