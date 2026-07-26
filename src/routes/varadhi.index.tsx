import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";
import { Apple, Package, Recycle, MapPin, Truck, Wrench } from "lucide-react";

export const Route = createFileRoute("/varadhi/")({
  component: VaradhiHome,
});

const CATEGORIES = [
  { id: "fresh", te: "తాజా వస్తువులు", en: "Fresh Items", color: "#16a34a", Icon: Apple, sub: "కూరగాయలు, పండ్లు, పాలు" },
  { id: "new", te: "కొత్త వస్తువులు", en: "New Items", color: "#2563eb", Icon: Package, sub: "ఎలక్ట్రానిక్స్, ఫ్యాషన్" },
  { id: "used", te: "వాడిన వస్తువులు", en: "Used Items", color: "#f97316", Icon: Recycle, sub: "సెకండ్ హ్యాండ్" },
  { id: "realestate", te: "ఇంటి స్థలాలు & భూములు", en: "Real Estate", color: "#7c3aed", Icon: MapPin, sub: "ప్లాట్లు, వ్యవసాయ భూములు" },
];

const SERVICES = [
  { id: "transport", te: "ట్రాన్స్‌పోర్ట్", en: "Transport", color: "#0ea5e9", Icon: Truck, to: "/varadhi/browse/transport" },
  { id: "services", te: "సర్వీసులు", en: "Local Services", color: "#dc2626", Icon: Wrench, to: "/varadhi/browse/services" },
];

function VaradhiHome() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={varadhiLogo.url} alt="Varadhi" className="h-14 w-14 rounded-2xl object-contain bg-white shadow-sm p-1" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a]">వారధి</h1>
          <p className="text-xs text-[#1e3a8a]/70">Sell, Buy, Transport & Local Services</p>
        </div>
      </div>

      {/* CTA */}
      {signedIn === false && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b5bdb] p-4 text-white shadow-md">
          <p className="text-sm font-medium">ప్రారంభించడానికి లాగిన్ అవ్వండి</p>
          <p className="text-[11px] opacity-90 mt-0.5">Aadhaar & లొకేషన్ verify చేసి — అమ్మండి, కొనండి, సర్వీసులు అందించండి.</p>
          <button
            onClick={() => navigate({ to: "/varadhi/auth" })}
            className="mt-3 w-full rounded-xl bg-[#f97316] py-2.5 font-semibold text-white shadow"
          >
            లాగిన్ / సైన్ అప్
          </button>
        </div>
      )}

      {/* Categories */}
      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">వర్గాలు — Categories</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to="/varadhi/browse/$category" params={{ category: c.id }}
            className="rounded-2xl bg-white p-4 shadow-sm border border-black/5 active:scale-[.98] transition">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: c.color }}>
              <c.Icon className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#1e3a8a]">{c.te}</p>
            <p className="text-[10px] text-[#1e3a8a]/60">{c.sub}</p>
          </Link>
        ))}
      </div>

      {/* Services */}
      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">సర్వీసులు — Services</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {SERVICES.map((s) => (
          <Link key={s.id} to={s.to as any}
            className="rounded-2xl bg-white p-4 shadow-sm border border-black/5 active:scale-[.98] transition">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: s.color }}>
              <s.Icon className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#1e3a8a]">{s.te}</p>
            <p className="text-[10px] text-[#1e3a8a]/60">{s.en}</p>
          </Link>
        ))}
      </div>

      {/* Role tiles */}
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          { key: "seller", te: "అమ్మకందారు", color: "#16a34a" },
          { key: "buyer", te: "కొనుగోలుదారు", color: "#2563eb" },
          { key: "provider", te: "ట్రాన్స్‌పోర్ట్ / సర్వీస్", color: "#f97316" },
        ].map((r) => (
          <Link key={r.key} to="/varadhi/onboard"
            className="rounded-xl p-3 text-white shadow-sm"
            style={{ background: r.color }}>
            <p className="text-[11px] font-semibold leading-tight">{r.te}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-[10px] text-[#1e3a8a]/50">
        © MBR Platform · <Link to="/" className="underline">Back to Portal</Link>
      </p>
    </div>
  );
}
