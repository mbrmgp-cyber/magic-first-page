import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIVaradhiAdmin, getMyVaradhiScope } from "@/lib/varadhi.functions";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";
import { VaradhiAppIcons } from "@/components/VaradhiAppIcons";
import { VARADHI_SHARE_IMAGE } from "@/lib/app-hosts";

export const Route = createFileRoute("/varadhi")({
  head: () => ({
    meta: [
      { title: "Vaaradhi (వారధి) — Sell, Buy, Transport & Local Services | MBR Platform" },
      { name: "description", content: "వారధి అనేది స్థానిక కొనుగోళ్లు, అమ్మకాలు, రవాణా సౌకర్యాలు మరియు టెక్నీషియన్ సేవలను ఒకే చోట అందించే సమగ్ర వేదిక. వివరాల కోసం ఇప్పుడే చూడండి." },
      { property: "og:title", content: "Vaaradhi (వారధి) — Sell, Buy, Transport & Local Services | MBR Platform" },
      { property: "og:description", content: "వారధి అనేది స్థానిక కొనుగోళ్లు, అమ్మకాలు, రవాణా సౌకర్యాలు మరియు టెక్నీషియన్ సేవలను ఒకే చోట అందించే సమగ్ర వేదిక. వివరాల కోసం ఇప్పుడే చూడండి." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Vaaradhi" },
      { property: "og:image", content: VARADHI_SHARE_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Vaaradhi (వారధి) logo" },
      { name: "twitter:image", content: VARADHI_SHARE_IMAGE },
      { name: "application-name", content: "Vaaradhi" },
      { name: "apple-mobile-web-app-title", content: "Vaaradhi" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/varadhi-manifest.webmanifest" },
      { rel: "icon", href: "/varadhi-icon-192.png", type: "image/png" },
      { rel: "shortcut icon", href: "/varadhi-icon-192.png" },
      { rel: "apple-touch-icon", href: "/varadhi-apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/varadhi-apple-touch-icon.png" },
    ],
  }),
  component: VaradhiLayout,
});

function VaradhiLayout() {
  const loc = useLocation();
  const showDisclaimer = loc.pathname === "/varadhi";
  const checkAdmin = useServerFn(amIVaradhiAdmin);
  const checkScope = useServerFn(getMyVaradhiScope);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const [res, sc] = await Promise.all([checkAdmin(), checkScope()]);
        if (active) setIsAdmin(!!res?.isAdmin || !!sc?.level);
      } catch { /* not admin */ }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  return (
    <div className={`min-h-screen pb-16 ${showDisclaimer ? "bg-market-canvas text-market-ink" : "bg-[#f7f7fb] text-[#1e3a8a]"}`}>
      <VaradhiAppIcons />
      {isAdmin && !loc.pathname.startsWith("/varadhi/admin") && (
        <Link
          to="/varadhi/admin"
          className="flex items-center justify-center gap-1.5 bg-[#1e3a8a] py-2 text-xs font-semibold text-white"
        >
          <ShieldCheck className="h-4 w-4" /> వారధి అడ్మిన్ ప్యానెల్ తెరవండి
        </Link>
      )}
      <Outlet />
      {showDisclaimer && (
        <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
          <div className="border-t border-market-border text-market-muted text-[10px] leading-relaxed py-3">
            వారధి కేవలం సమాచార వేదిక. వినియోగదారుల మధ్య జరిగే డబ్బు లావాదేవీలు, వస్తువుల నాణ్యత లేదా ఒప్పందాలకు వారధి బాధ్యత వహించదు.
          </div>
        </div>
      )}
      <VaradhiBottomNav isAdmin={isAdmin} />
    </div>
  );
}



function VaradhiBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const loc = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Registration/profile lives on the Profile page, and the admin
  // panel is only offered to users with admin access.
  const items = [
    { to: "/varadhi", icon: Home, label: "హోమ్" },
    { to: "/varadhi/browse/fresh", icon: Search, label: "వెతకండి" },
    { to: "/varadhi/dashboard", icon: LayoutDashboard, label: "అప్‌డేట్ బోర్డు" },
    { to: "/varadhi/profile", icon: User, label: "ప్రొఫైల్" },
    ...(isAdmin ? [{ to: "/varadhi/admin", icon: ShieldCheck, label: "అడ్మిన్ ప్యానెల్" }] : []),
  ];
  const nav = (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-[#1e3a8a]/10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ position: "fixed", insetInline: 0, bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const active = it.to === "/varadhi" ? loc.pathname === "/varadhi" : loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-[#f97316]" : "text-[#1e3a8a]/70"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
  if (!mounted) return nav;
  return createPortal(nav, document.body);
}
