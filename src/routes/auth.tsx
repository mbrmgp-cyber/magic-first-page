import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/mbr-logo.png.asset.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, Mail, KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — MBR App" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "info" | "error" | "success"; title: string; message: string } | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", title: "OTP పంపుతున్నాం", message: `${email} కి 6-అంకెల code పంపుతున్నాం.` });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase().includes("signups not allowed")
        ? "ఈ Email కు ఖాతా లేదు. ముందుగా Society Registration చేయండి."
        : error.message;
      setStatus({ type: "error", title: "OTP పంపలేకపోయాం", message: msg });
      toast.error(msg);
      return;
    }
    setStep("otp");
    setStatus({ type: "success", title: "OTP పంపబడింది", message: "మీ Email Inbox / Spam folder చెక్ చేయండి. 6-అంకెల code ఇక్కడ enter చేయండి." });
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", title: "OTP verify చేస్తున్నాం", message: "" });
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
        ? "OTP తప్పు లేదా expire అయింది. మళ్లీ కొత్త code పంపండి."
        : error.message;
      setStatus({ type: "error", title: "Verify కాలేదు", message: msg });
      toast.error(msg);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    setLoading(false);
    if (!user) return;
    // MBR admin shortcut
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (roles?.some((r) => r.role === "mbr_admin")) {
      navigate({ to: "/admin" });
      return;
    }
    const { data: org } = await supabase.from("organizations").select("id, approval_status").eq("admin_user_id", user.id).maybeSingle();
    if (org) {
      navigate({ to: "/org/dashboard" });
      return;
    }
    const { data: member } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
    if (member) navigate({ to: "/member/pending" });
    else {
      toast.info("Society Registration పూర్తి చేయండి");
      navigate({ to: "/org/register" });
    }
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
          <p className="text-sm text-muted-foreground">Email OTP తో సురక్షితంగా లాగిన్</p>
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
              {loading ? "OTP పంపుతున్నాం…" : "OTP పంపండి"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label>6-అంకెల OTP</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  placeholder="123456"
                  className="pl-9 tracking-[0.5em] text-center font-mono text-lg focus-visible:ring-[#FF9933]"
                />
              </div>
              <p className="text-xs text-muted-foreground">{email} కి పంపబడింది</p>
            </div>
            <Button type="submit" className="w-full btn-saffron-green font-semibold border-0" disabled={loading || otp.length < 6}>
              {loading ? "Verify…" : "Verify & Login"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { setStep("email"); setOtp(""); setStatus(null); }}>
              ← Email మార్చండి
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-[#138808] font-medium hover:underline">{t("noAccount")}</Link>
        </div>
      </Card>
    </div>
  );
}
