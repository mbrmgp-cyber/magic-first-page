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
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a14_60%,_#000_100%)]">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[#ff8c28]/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#ff8c28]/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-6 space-y-6 bg-white/5 border-white/10 backdrop-blur-xl relative z-[1]">
        <div className="text-center space-y-3">
          <img src={logo.url} alt="MBR" className="mx-auto w-24 drop-shadow-[0_0_20px_rgba(255,140,40,0.35)]" />
          <h1 className="text-2xl font-bold text-white">{t("login")}</h1>
          <p className="text-sm text-white/60">{t("loginSubtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-[#ff8c28]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">{t("password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-[#ff8c28]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#ff8c28] to-[#ff6a00] text-black font-semibold hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(255,140,40,0.6)]"
            disabled={loading}
          >
            {loading ? "..." : t("login")}
          </Button>
        </form>
        <div className="text-center text-sm text-white/60">
          <Link to="/" className="text-[#ff8c28] hover:underline">{t("noAccount")}</Link>
        </div>
      </Card>
    </div>
  );
}
