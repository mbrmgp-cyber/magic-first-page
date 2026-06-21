import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data: member } = await supabase.from("members").select("id").eq("user_id", userId).maybeSingle();
    if (member) navigate({ to: "/member/pending" });
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth?lang=${encodeURIComponent(lang)}` },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase().includes("signups not allowed")
        ? t("noAccountErr")
        : error.message;
      setStatus({ type: "error", title: t("sendFailedTitle"), message: msg });
      toast.error(msg);
      return;
    }
    setStep("linkSent");
    setStatus({ type: "success", title: t("linkSentTitle"), message: t("linkSentMsg") });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-tricolor">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[#FF9933]/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#138808]/25 blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-6 space-y-6 bg-white/90 backdrop-blur-xl border-white shadow-2xl relative z-[1]">
        <div className="text-center space-y-3">
          <img src={logo.url} alt="MBR" className="mx-auto w-24 rounded-md bg-black p-2" />
          <h1 className="text-2xl font-bold text-foreground">{t("login")}</h1>
          <p className="text-sm text-muted-foreground">{t("authSubtitle")}</p>
          <div className="h-[3px] w-24 mx-auto rounded-full" style={{ background: "var(--gradient-saffron-green)" }} />
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
              <Label>{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="pl-9 focus-visible:ring-[#FF9933]"
                />
              </div>
            </div>
            <Button type="submit" className="w-full btn-saffron-green font-semibold border-0" disabled={loading}>
              {loading ? t("sendingLink") : t("sendLink")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-md border border-green-600/30 bg-green-50 p-4 text-green-900">
              <ExternalLink className="mx-auto mb-2 h-6 w-6" />
              <p className="font-semibold">{t("clickLoginInEmail")}</p>
              <p className="mt-1 text-sm">{t("oneTimeLink")}</p>
            </div>
            <Button type="button" className="w-full btn-saffron-green font-semibold border-0" onClick={() => navigate({ to: "/" })}>
              {t("continueAfterClick")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { setStep("email"); setStatus(null); }}>
              {t("changeEmail")}
            </Button>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-[#138808] font-medium hover:underline">{t("noAccount")}</Link>
        </div>
      </Card>
    </div>
  );
}
