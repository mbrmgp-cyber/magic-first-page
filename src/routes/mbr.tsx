import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Building2, Users, LogIn, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import logo from "@/assets/mbr-logo.png.asset.json";


export const Route = createFileRoute("/mbr")({
  head: () => ({
    meta: [
      { title: "MBR App — Society & Committee Administration" },
      { name: "description", content: "Register your organization, share a unique QR code, and let members join with approval." },
      { property: "og:title", content: "MBR App — Society & Committee Administration" },
      { property: "og:description", content: "Register your organization, share a unique QR code, and let members join with approval." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { code?: string } => {
    const code = typeof s.code === "string" && s.code.trim() ? s.code.trim() : undefined;
    return code ? { code } : {};
  },
  component: MbrHome,
});

function MbrHome() {
  const { t, lang } = useI18n();
  const L = (te: string, en: string, hi: string) => (lang === "te" ? te : lang === "hi" ? hi : en);
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (code) {
      navigate({ to: "/member/register", search: { code }, replace: true });
    }
  }, [code, navigate]);
  if (code) return null;

  return (
    <div key={lang} data-notranslit className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden bg-black">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur px-3 py-1.5 text-xs text-white/90 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{L("ప్లాట్‌ఫారమ్", "Platform", "प्लेटफ़ॉर्म")}</span>
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 backdrop-blur px-3 py-1.5 text-xs text-white/90">
          <span aria-hidden>🙏</span>
          <span className="font-medium">{t("welcome")}</span>
        </span>
      </div>
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
            {lang === "en" ? (<>Management of <span className="text-[#ff8c28]">Board</span> Resources</>)
              : lang === "hi" ? (<>बोर्ड <span className="text-[#ff8c28]">संसाधन</span> प्रबंधन</>)
              : (<>బోర్డు <span className="text-[#ff8c28]">వనరుల</span> నిర్వహణ</>)}
            <span className="mt-1 block text-sm font-normal text-white/70">
              {L("MBR యాప్ — సొసైటీ మరియు కమిటీ నిర్వహణ", "MBR App — Society and Committee Administration", "MBR ऐप — सोसाइटी और समिति प्रशासन")}
            </span>
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

          <Link to="/auth">
            <Card className="p-5 bg-white/5 border-white/10 backdrop-blur hover:border-[#ff8c28] hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#ff8c28]/15 p-3 group-hover:bg-[#ff8c28]/25 transition-colors">
                  <LogIn className="h-6 w-6 text-[#ff8c28]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-white">{t("loginWithEmail")}</h2>
                  <p className="text-sm text-white/60 mt-1">{t("loginWithEmailDesc")}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
