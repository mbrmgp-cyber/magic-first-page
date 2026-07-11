import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendLoginLink } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/mbr-logo.png.asset.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, Mail, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — MBR App" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const sendSecureLink = useServerFn(sendLoginLink);
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "linkSent">("email");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "info" | "error" | "success"; title: string; message: string } | null>(null);

  async function redirectAfterLogin(userId: string) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (roles?.some((r) => r.role === "mbr_admin")) {
      navigate({ to: "/admin" });
      return;
    }
    const { data: org } = await supabase.from("organizations").select("id, approval_status").eq("admin_user_id", userId).maybeSingle();
    if (org) {
      navigate({ to: "/org/dashboard" });
      return;
    }
    // getMyMembership auto-claims any row created by admin with matching email + null user_id.
    const { getMyMembership } = await import("@/lib/org.functions");
    const res = await getMyMembership().catch(() => ({ membership: null as any }));
    if (res?.membership) navigate({ to: "/member/pending" });
    else navigate({ to: "/org/register" });
  }



  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) redirectAfterLogin(data.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) redirectAfterLogin(session.user.id);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", title: t("sendingTitle"), message: t("sendingMsg") });
    const result = await sendSecureLink({ data: { email, lang } }).catch((error) => ({
      sent: false as const,
      reason: error instanceof Error ? error.message : String(error),
    }));
    setLoading(false);
    if (!result?.sent) {
      const msg = result?.reason === "not_found" ? t("noAccountErr") : (result?.reason || t("sendFailedTitle"));
      setStatus({ type: "error", title: t("sendFailedTitle"), message: msg });
      toast.error(msg);
      return;
    }
    setStep("linkSent");
    setStatus({ type: "success", title: t("linkSentTitle"), message: t("linkSentMsg") });
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
          <h1 className="text-2xl font-bold text-white">{t("login")}</h1>
          <p className="text-sm text-zinc-400">{t("authSubtitle")}</p>
          <div className="h-[3px] w-24 mx-auto rounded-full bg-[#ff8c28]" />
        </div>

        {status && (
          <Alert variant={status.type === "error" ? "destructive" : "default"} className={status.type === "success" ? "border-green-600/40 bg-green-50 text-green-900" : ""}>
            {status.type === "error" ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            <AlertTitle>{status.title}</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {step === "email" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-[#ff8c28]"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]" disabled={loading}>
              {loading ? t("sendingLink") : t("sendLink")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-md border border-[#ff8c28]/30 bg-[#ff8c28]/10 p-4 text-zinc-100">
              <ExternalLink className="mx-auto mb-2 h-6 w-6 text-[#ff8c28]" />
              <p className="font-semibold">{t("clickLoginInEmail")}</p>
              <p className="mt-1 text-sm text-zinc-300">{t("oneTimeLink")}</p>
            </div>
            <Button type="button" className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0" onClick={() => navigate({ to: "/" })}>
              {t("continueAfterClick")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900" onClick={() => { setStep("email"); setStatus(null); }}>
              {t("changeEmail")}
            </Button>
          </div>
        )}

        <div className="text-center text-sm text-zinc-400">
          <Link to="/" className="text-[#ff8c28] font-medium hover:underline">{t("noAccount")}</Link>
        </div>
      </Card>
    </div>
  );
}
