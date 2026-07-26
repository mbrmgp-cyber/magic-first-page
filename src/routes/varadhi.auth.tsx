import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendVaradhiLoginLink } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Mail, ExternalLink } from "lucide-react";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";

export const Route = createFileRoute("/varadhi/auth")({
  head: () => ({ meta: [{ title: "Varadhi — Login" }] }),
  component: VaradhiAuthPage,
});

function VaradhiAuthPage() {
  const navigate = useNavigate();
  const sendLink = useServerFn(sendVaradhiLoginLink);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);

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
    const res = await sendLink({ data: { email } }).catch((err) => ({
      sent: false as const,
      reason: err instanceof Error ? err.message : String(err),
    }));
    setLoading(false);
    if (!res?.sent) {
      toast.error((res as any)?.reason || "Failed to send login link");
      return;
    }
    setStep("sent");
    toast.success("Login link sent to your email");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5bdb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <img src={varadhiLogo.url} alt="Varadhi" className="mx-auto h-16 w-16 rounded-2xl object-contain bg-white p-1 shadow" />
          <h1 className="mt-3 text-2xl font-bold text-[#1e3a8a]">వారధి</h1>
          <p className="text-xs text-[#1e3a8a]/70">Varadhi Login</p>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#f97316]" />
        </div>

        {step === "email" ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
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
              {loading ? "పంపిస్తున్నాం…" : "లాగిన్ లింక్ పంపండి"}
            </button>
            <p className="text-center text-[11px] text-[#1e3a8a]/60">
              Varadhi has its own login — separate from MBR App.
            </p>
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
