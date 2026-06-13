import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/mbr-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBR App — Organization & Member Registration" },
      { name: "description", content: "Register your organization, share a unique QR code, and let members join with approval." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a14_60%,_#000_100%)]">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[#ff8c28]/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#ff8c28]/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-[1]">
        <header className="text-center space-y-3">
          <img src={logo.url} alt="MBR" className="mx-auto w-32 drop-shadow-[0_0_24px_rgba(255,140,40,0.35)]" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Management of <span className="text-[#ff8c28]">Board</span> Resources
          </h1>
          <p className="text-white/60 text-sm">{t("appTagline")}</p>
        </header>

        <div className="space-y-4">
          <Link to="/org/register">
            <Card className="p-5 bg-white/5 border-white/10 backdrop-blur hover:border-[#ff8c28] hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#ff8c28]/15 p-3 group-hover:bg-[#ff8c28]/25 transition-colors">
                  <Building2 className="h-6 w-6 text-[#ff8c28]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-white">{t("org")}</h2>
                  <p className="text-sm text-white/60 mt-1">{t("orgDesc")}</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/member/register">
            <Card className="p-5 bg-white/5 border-white/10 backdrop-blur hover:border-[#ff8c28] hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#ff8c28]/15 p-3 group-hover:bg-[#ff8c28]/25 transition-colors">
                  <Users className="h-6 w-6 text-[#ff8c28]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-white">{t("member")}</h2>
                  <p className="text-sm text-white/60 mt-1">{t("memberDesc")}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/auth">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              {t("haveAccount")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
