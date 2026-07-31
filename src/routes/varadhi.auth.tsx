import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendVaradhiLoginLink } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Mail, ExternalLink, KeyRound, Link2 } from "lucide-react";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";

export const Route = createFileRoute("/varadhi/auth")({
  head: () => ({ meta: [{ title: "Vaaradhi — Login" }] }),
  component: VaradhiAuthPage,
});

type Mode = "link" | "otp";

function VaradhiAuthPage() {
  const navigate = useNavigate();
  const sendLink = useServerFn(sendVaradhiLoginLink);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("otp");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) navigate({ to: "/varadhi/onboard", replace: true });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
        navigate({ to: "/varadhi/onboard", replace: true });
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await sendLink({ data: { email, mode } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setLoading(false);
    if (!res?.sent) {
      toast.error((res as any)?.reason || "Failed to send");
      return;
    }
    setStep("sent");
    toast.success(mode === "otp" ? "OTP sent to your email" : "Login link sent to your email");
  }

  async function verifyOtp(e?: React.FormEvent, code?: string) {
    e?.preventDefault();
    const token = (code ?? otp).trim();
    if (token.length !== 6) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message || "Invalid or expired OTP");
      return;
    }
    // onAuthStateChange will navigate
  }

  // Auto-verify as soon as 6 digits are entered/pasted
  useEffect(() => {
    if (step === "sent" && mode === "otp" && otp.length === 6 && !verifying) {
      verifyOtp(undefined, otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, mode]);

  // WebOTP API (SMS on Android Chrome; harmless for email — no-op elsewhere)
  useEffect(() => {
    if (step !== "sent" || mode !== "otp") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any)
      ?.get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((c: any) => { if (c?.code) setOtp(String(c.code).replace(/\D/g, "").slice(0, 6)); })
      .catch(() => {});
    return () => ac.abort();
  }, [step, mode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5bdb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <img src={varadhiLogo.url} alt="Vaaradhi" className="mx-auto h-16 w-16 rounded-2xl object-contain bg-white p-1 shadow" />
          <h1 className="mt-3 text-2xl font-bold text-[#1e3a8a]">వారధి</h1>
          <p className="text-xs text-[#1e3a8a]/70">Vaaradhi Login</p>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#f97316]" />
        </div>

        {step === "email" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#1e3a8a]/5 p-1">
              <button
                type="button"
                onClick={() => setMode("otp")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === "otp" ? "bg-[#f97316] text-white shadow" : "text-[#1e3a8a]/70"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" /> OTP కోడ్
              </button>
              <button
                type="button"
                onClick={() => setMode("link")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === "link" ? "bg-[#f97316] text-white shadow" : "text-[#1e3a8a]/70"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" /> Magic Link
              </button>
            </div>

            <label className="block text-xs font-medium text-[#1e3a8a]/80">ఈమెయిల్ / Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#1e3a8a]/20 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#f97316]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60"
            >
              {loading
                ? "పంపిస్తున్నాం…"
                : mode === "otp"
                ? "OTP కోడ్ పంపండి"
                : "లాగిన్ లింక్ పంపండి"}
            </button>
            <p className="text-center text-[11px] text-[#1e3a8a]/60">
              Vaaradhi has its own login — separate from MBR App.
            </p>
          </form>
        ) : mode === "otp" ? (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 p-3 text-center text-[#1e3a8a]">
              <p className="text-xs">
                6-digit OTP sent to <b>{email}</b>
              </p>
            </div>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                if (t) { e.preventDefault(); setOtp(t); }
              }}
              placeholder="123456"
              className="w-full rounded-xl border border-[#1e3a8a]/20 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] font-bold text-[#1e3a8a] outline-none focus:border-[#f97316]"
            />
            <button
              type="submit"
              disabled={verifying || otp.length !== 6}
              className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60"
            >
              {verifying ? "వెరిఫై చేస్తున్నాం…" : "వెరిఫై & లాగిన్"}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="text-[#1e3a8a]/70 underline">
                ← వేరే ఈమెయిల్
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const res = await sendLink({ data: { email, mode: "otp" } }).catch(() => ({ sent: false as const }));
                  setLoading(false);
                  if (res?.sent) toast.success("New OTP sent");
                  else toast.error("Failed to resend");
                }}
                className="text-[#f97316] font-semibold"
              >
                Resend OTP
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 p-4 text-[#1e3a8a]">
              <ExternalLink className="mx-auto mb-2 h-6 w-6 text-[#f97316]" />
              <p className="font-semibold">మీ ఈమెయిల్ చెక్ చేయండి</p>
              <p className="mt-1 text-xs">Click the login link we sent to <b>{email}</b>.</p>
            </div>
            <button
              onClick={() => { setStep("email"); }}
              className="text-xs text-[#1e3a8a]/70 underline"
            >
              వేరే ఈమెయిల్ ఉపయోగించండి
            </button>
          </div>
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
