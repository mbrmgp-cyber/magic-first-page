import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendMbrOtp, verifyMbrOtp } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n, localizeText } from "@/lib/i18n";
import logo from "@/assets/mbr-logo.png.asset.json";
import { Mail, Lock, KeyRound } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — MBR App" },
      { name: "description", content: "Reset your MBR App password with an email OTP, then sign in again." },
      { property: "og:title", content: "Forgot Password — MBR App" },
      { property: "og:description", content: "Verify your email with an OTP and set a new MBR App password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

type Step = "email" | "otp" | "password";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestOtpFn = useServerFn(sendMbrOtp);
  const verifyOtpFn = useServerFn(verifyMbrOtp);
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpEmailHint, setOtpEmailHint] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const res = await requestOtpFn({ data: { identifier: email.trim() } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setBusy(false);
    if (!res?.sent) {
      const reason = (res as any)?.reason;
      toast.error(
        reason === "not_found"
          ? lt("No member account found for this email", "ఈ ఈమెయిల్‌కు ఖాతా లేదు")
          : lt("Could not send OTP", "OTP పంపలేకపోయాం")
      );
      return;
    }
    setOtpEmailHint((res as any).emailHint ?? "");
    setOtpLength(Number((res as any).otpLength) || 6);
    setOtp("");
    setStep("otp");
    toast.success(lt("Code sent to your email", "మీ ఈమెయిల్‌కు కోడ్ పంపాం"));
  }

  async function verifyOtp(e?: React.FormEvent, code?: string) {
    e?.preventDefault();
    const token = (code ?? otp).trim();
    if (token.length < otpLength) return;
    setBusy(true);
    const res = await verifyOtpFn({ data: { identifier: email.trim(), token } }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      toast.error(lt("Code is invalid or expired", "కోడ్ చెల్లదు లేదా గడువు ముగిసింది"));
      return;
    }
    const { error } = await supabase.auth.setSession(res.session);
    setBusy(false);
    if (error) {
      toast.error(lt("Could not verify. Please try again.", "వెరిఫై కాలేకపోయాం. మళ్లీ ప్రయత్నించండి."));
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
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      toast.error(lt("Could not save password", "పాస్‌వర్డ్ సేవ్ కాలేదు"));
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    toast.success(lt("Password updated! Please log in.", "పాస్‌వర్డ్ మారింది! ఇప్పుడు లాగిన్ కండి."));
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[#ff8c28]/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#ff8c28]/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-6 space-y-6 bg-zinc-950 border-zinc-800 shadow-[0_0_60px_rgba(255,140,40,0.15)] text-white relative z-[1]">
        <div className="text-center space-y-3">
          <img src={logo.url} alt="MBR" className="mx-auto w-24 rounded-md bg-black p-2" />
          <h1 className="text-2xl font-bold text-white">{lt("Forgot Password", "పాస్‌వర్డ్ మర్చిపోయారా")}</h1>
          <div className="h-[3px] w-24 mx-auto rounded-full bg-[#ff8c28]" />
        </div>

        {step === "email" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Registered email", "రిజిస్టర్ చేసిన ఈమెయిల్")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]"
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0">
              {busy ? lt("Sending code…", "కోడ్ పంపిస్తున్నాం…") : lt("Send OTP code", "OTP కోడ్ పంపండి")}
            </Button>
            <p className="text-center text-[11px] text-zinc-400">
              {lt("We will send a verification code to this email.", "ఈ ఈమెయిల్‌కు వెరిఫికేషన్ కోడ్ పంపుతాం.")}
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="rounded-xl border border-[#ff8c28]/30 bg-[#ff8c28]/10 p-3 text-center">
              <p className="text-xs text-zinc-200">
                {otpLength} {lt("digit code sent to", "అంకెల కోడ్ పంపాం —")} <b>{otpEmailHint}</b>
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
              <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="text-zinc-400 underline">
                ← {lt("Change email", "వేరే ఈమెయిల్")}
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
              <p className="text-xs font-semibold">{lt("Verified. Now set your new password.", "వెరిఫై అయ్యింది. ఇప్పుడు కొత్త పాస్‌వర్డ్ సెట్ చేయండి.")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("New password", "కొత్త పాస్‌వర్డ్")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="••••••" className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">{lt("Confirm password", "పాస్‌వర్డ్ నిర్ధారించండి")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="••••••" className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]" />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0">
              {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Update password", "పాస్‌వర్డ్ అప్‌డేట్ చేయండి")}
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-zinc-400">
          <Link to="/auth" className="text-[#ff8c28] font-medium hover:underline">{lt("Back to login", "లాగిన్‌కి తిరిగి")}</Link>
        </div>
      </Card>
    </div>
  );
}
