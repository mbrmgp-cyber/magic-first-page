import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, Gift, User } from "lucide-react";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";

export const Route = createFileRoute("/varadhi")({
  head: () => ({
    meta: [
      { title: "Varadhi (వారధి) — Sell, Buy, Transport & Local Services" },
      { name: "description", content: "Varadhi connects Buyers, Sellers, Transport Providers and Local Service Workers across Andhra Pradesh." },
      { property: "og:title", content: "Varadhi (వారధి) — Sell, Buy, Transport & Local Services" },
      { property: "og:description", content: "Varadhi connects Buyers, Sellers, Transport Providers and Local Service Workers across Andhra Pradesh." },
      { property: "og:image", content: varadhiLogo.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: varadhiLogo.url },
    ],
  }),
  component: VaradhiLayout,
});

function VaradhiLayout() {
  return (
    <div className="min-h-screen bg-[#f7f7fb] text-[#1e3a8a] pb-20">
      <Outlet />
      <VaradhiBottomNav />
      <footer className="fixed bottom-16 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-md px-3">
          <div className="pointer-events-auto rounded-t-lg bg-black/70 text-white text-[10px] leading-tight px-3 py-1.5 backdrop-blur">
            Varadhi is an informational listing platform. It is not responsible for any monetary transactions, product quality, or business agreements between users.
          </div>
        </div>
      </footer>
    </div>
  );
}

function VaradhiBottomNav() {
  const loc = useLocation();
  const items = [
    { to: "/varadhi", icon: Home, label: "హోమ్" },
    { to: "/varadhi/browse/fresh", icon: Search, label: "వెతకండి" },
    { to: "/varadhi/dashboard", icon: LayoutDashboard, label: "డాష్‌బోర్డ్" },
    { to: "/varadhi/rewards", icon: Gift, label: "బహుమతులు" },
    { to: "/varadhi/onboard", icon: User, label: "ప్రొఫైల్" },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#1e3a8a]/10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-md grid grid-cols-5">
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
}
