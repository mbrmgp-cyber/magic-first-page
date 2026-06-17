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

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — MBR App" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: org } = await supabase.from("organizations").select("id").eq("admin_user_id", user.id).maybeSingle();
    if (org) navigate({ to: "/org/dashboard" });
    else navigate({ to: "/member/pending" });
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
          <img src={logo.url} alt="MBR" className="mx-auto w-24" />
          <h1 className="text-2xl font-bold text-foreground">{t("login")}</h1>
          <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          <div className="h-[3px] w-24 mx-auto rounded-full" style={{ background: "var(--gradient-saffron-green)" }} />
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-visible:ring-[#FF9933]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus-visible:ring-[#FF9933]"
            />
          </div>
          <Button
            type="submit"
            className="w-full btn-saffron-green font-semibold border-0"
            disabled={loading}
          >
            {loading ? "..." : t("login")}
          </Button>
        </form>
        <div className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-[#138808] font-medium hover:underline">{t("noAccount")}</Link>
        </div>
      </Card>
    </div>
  );
}
