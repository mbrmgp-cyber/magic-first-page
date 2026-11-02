import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { passwordUpdateErrorMessage } from "@/lib/password-errors";
import { sharedTranslation } from "@/lib/language-support";
import { Lock, KeyRound } from "lucide-react";
import { useI18n, localizeText } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a New Password — MBR Platform" },
      { name: "description", content: "Choose and confirm a new password for your MBR or Vaaradhi account, then sign in again." },
      { property: "og:title", content: "Set a New Password — MBR Platform" },
      { property: "og:description", content: "Choose and confirm a new password for your MBR or Vaaradhi account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  const loginPath =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("app") === "varadhi"
      ? "/varadhi/auth"
      : "/auth";

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setValid(!!data.session?.user);
      setReady(true);
    };
    // Supabase parses the recovery link (hash or ?code=) on load; give it a tick.
    const t = setTimeout(check, 400);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setValid(true);
        setReady(true);
      }
    });
    return () => {
      active = false;
      clearTimeout(t);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(lt("Password must be at least 6 characters", "పాస్‌వర్డ్‌లో కనీసం 6 అక్షరాలు ఉండాలి"));
      return;
    }
    if (password !== password2) {
      toast.error(lt("Passwords do not match", "రెండు పాస్‌వర్డ్‌లు సరిపోలడం లేదు"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      const reason = passwordUpdateErrorMessage(error);
      toast.error(sharedTranslation(lang, reason) ?? reason, { duration: 8000 });
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    toast.success(lt("Password updated — please sign in.", "పాస్‌వర్డ్ మార్చబడింది. ఇప్పుడు లాగిన్ చేయండి."));
    navigate({ to: loginPath, replace: true });
  }

  const inputCls =
    "w-full rounded-xl border border-[#1e3a8a]/20 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#f97316]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5bdb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <KeyRound className="mx-auto h-8 w-8 text-[#f97316]" />
          <h1 className="mt-2 text-xl font-bold text-[#1e3a8a]">{lt("Set a new password", "కొత్త పాస్‌వర్డ్ సెట్ చేయండి")}</h1>
          <p className="text-xs text-[#1e3a8a]/70">{lt("Confirm password", "పాస్‌వర్డ్ నిర్ధారించండి")}</p>
        </div>

        {!ready && <p className="mt-6 text-center text-sm text-[#1e3a8a]/70">{lt("Loading", "లోడ్ అవుతోంది")}</p>}

        {ready && !valid && (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-red-600">
              {lt("This reset link is invalid or expired.", "ఈ పాస్‌వర్డ్ రీసెట్ లింక్ చెల్లదు లేదా గడువు ముగిసింది.")}
            </p>
            <button
              onClick={() => navigate({ to: loginPath, replace: true })}
              className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg"
            >
              {lt("Go to login", "లాగిన్ పేజీకి వెళ్లండి")}
            </button>
          </div>
        )}

        {ready && valid && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{lt("New password", "కొత్త పాస్‌వర్డ్")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={lt("Minimum 6 characters", "కనీసం 6 అక్షరాలు")} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1e3a8a]/80 mb-1">{lt("Confirm password", "పాస్‌వర్డ్ నిర్ధారించండి")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1e3a8a]/50" />
                <input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="••••••" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#f97316] py-3 font-semibold text-white shadow-lg disabled:opacity-60">
              {busy ? lt("Saving…", "భద్రపరుస్తున్నాం…") : lt("Save password", "పాస్‌వర్డ్ భద్రపరచండి")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
