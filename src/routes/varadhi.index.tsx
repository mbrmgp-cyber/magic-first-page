import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listListings, type VaradhiListing } from "@/lib/varadhi.functions";
import { LanguageToggle } from "@/components/LanguageToggle";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";
import { Apple, Package, Recycle, MapPin, Truck, Wrench, Search, ChevronDown, Navigation } from "lucide-react";

export const Route = createFileRoute("/varadhi/")({
  component: VaradhiHome,
});

type Box = {
  id: string;
  te: string;
  en: string;
  color: string;
  Icon: typeof Apple;
  sub: string;
  options: string[];
};

const CATEGORIES: Box[] = [
  {
    id: "fresh", te: "తాజా వస్తువులు", en: "Fresh Items", color: "#16a34a", Icon: Apple,
    sub: "కూరగాయలు, పండ్లు, పాలు",
    options: ["కూరగాయలు", "పండ్లు", "ఆకుకూరలు", "పాలు & పాల ఉత్పత్తులు", "చేపలు & మాంసం", "కోడిగుడ్లు", "ధాన్యం & పప్పులు", "పూలు"],
  },
  {
    id: "new", te: "కొత్త వస్తువులు", en: "New Items", color: "#2563eb", Icon: Package,
    sub: "ఎలక్ట్రానిక్స్, ఫ్యాషన్",
    options: ["మొబైల్స్", "ఎలక్ట్రానిక్స్", "గృహోపకరణాలు", "ఫర్నిచర్", "బట్టలు & ఫ్యాషన్", "వ్యవసాయ పరికరాలు", "బిల్డింగ్ మెటీరియల్", "ఇతర"],
  },
  {
    id: "used", te: "వాడిన వస్తువులు", en: "Used Items", color: "#f97316", Icon: Recycle,
    sub: "సెకండ్ హ్యాండ్",
    options: ["సెకండ్ హ్యాండ్ బండ్లు", "మొబైల్స్", "ఫర్నిచర్", "ఎలక్ట్రానిక్స్", "వ్యవసాయ పరికరాలు", "ఇతర"],
  },
  {
    id: "realestate", te: "ఇంటి స్థలాలు & భూములు", en: "Real Estate", color: "#7c3aed", Icon: MapPin,
    sub: "ప్లాట్లు, వ్యవసాయ భూములు",
    options: ["ఇంటి స్థలాలు (ప్లాట్లు)", "వ్యవసాయ భూములు", "ఇళ్లు / అపార్ట్‌మెంట్లు", "షాపులు / కమర్షియల్", "అద్దెకు"],
  },
];

const SERVICES: Box[] = [
  {
    id: "transport", te: "ట్రాన్స్‌పోర్ట్", en: "Transport", color: "#0ea5e9", Icon: Truck,
    sub: "బండ్లు & రవాణా",
    options: ["2 వీలర్", "3 వీలర్ (ఆటో)", "4 వీలర్", "6 వీలర్", "8+ వీలర్ లారీ", "ట్రాక్టర్", "హార్వెస్టర్", "ఇతర"],
  },
  {
    id: "services", te: "సర్వీసులు", en: "Local Services", color: "#dc2626", Icon: Wrench,
    sub: "టెక్నీషియన్లు & పనులు",
    options: ["ఎలక్ట్రీషియన్", "ప్లంబర్", "కార్పెంటర్", "మేస్త్రీ / బిల్డింగ్ పని", "పెయింటర్", "మెకానిక్", "ఇంటి పని", "వ్యవసాయ పని", "షాప్ పని", "ఆఫీసు పని", "ఇతర"],
  },
];

function BoxCard({ box }: { box: Box }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const go = (term: string) =>
    navigate({
      to: "/varadhi/browse/$category",
      params: { category: box.id },
      search: { q: term.trim() },
    });

  const filtered = box.options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-black/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="block w-full text-left active:scale-[.98] transition"
      >
        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: box.color }}>
          <box.Icon className="h-5 w-5" />
        </div>
        <p className="mt-2 text-sm font-semibold text-[#1e3a8a]">{box.te}</p>
        <p className="text-[10px] text-[#1e3a8a]/60">{box.sub}</p>
      </button>


      {/* Search bar */}
      <div className="mt-3 flex items-center gap-1 rounded-xl border border-black/10 bg-[#f7f8fc] px-2 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-[#1e3a8a]/50" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") go(q); }}
          placeholder="వెతకండి…"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-[#1e3a8a] outline-none placeholder:text-[#1e3a8a]/40"
        />
        <button
          type="button"
          aria-label="ఆప్షన్లు చూపించు"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg p-0.5 text-[#1e3a8a]/70 active:scale-90"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-black/10 bg-white">
          {filtered.length === 0 && (
            <p className="px-2 py-2 text-[10px] text-[#1e3a8a]/50">ఏమీ లేదు</p>
          )}
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => go(o)}
              className="block w-full truncate px-2 py-1.5 text-left text-[11px] text-[#1e3a8a] hover:bg-[#f2f4fb]"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function NearbyFeed({ signedIn }: { signedIn: boolean | null }) {
  const fetchListings = useServerFn(listListings);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [denied, setDenied] = useState(false);
  const [items, setItems] = useState<Array<VaradhiListing & { km: number }>>([]);
  const [loading, setLoading] = useState(false);

  const ask = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  useEffect(() => { if (signedIn) ask(); /* eslint-disable-next-line */ }, [signedIn]);

  useEffect(() => {
    if (!coords || !signedIn) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchListings({ data: {} });
        const near = (r.listings ?? [])
          .filter((l) => l.lat != null && l.lng != null)
          .map((l) => ({ ...l, km: distanceKm(coords, { lat: l.lat as number, lng: l.lng as number }) }))
          .filter((l) => l.km <= 100)
          .sort((a, b) => a.km - b.km)
          .slice(0, 20);
        setItems(near);
      } catch { /* ignore */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, signedIn]);

  if (!signedIn) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1e3a8a]/80">మీ చుట్టూ 100 కి.మీ. అప్‌డేట్‌లు</h2>
        <button onClick={ask} className="flex items-center gap-1 text-[11px] font-semibold text-[#f97316]">
          <Navigation className="h-3.5 w-3.5" /> లొకేషన్
        </button>
      </div>

      {!coords && !denied && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లొకేషన్ కోసం అనుమతి ఇవ్వండి…</p>}
      {denied && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లొకేషన్ అనుమతి లేదు. “లొకేషన్” నొక్కి మళ్లీ ప్రయత్నించండి.</p>}
      {loading && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}
      {coords && !loading && items.length === 0 && (
        <p className="mt-2 text-[11px] text-[#1e3a8a]/60">మీ చుట్టూ 100 కి.మీ. లోపు అప్‌డేట్‌లు లేవు.</p>
      )}

      <div className="mt-3 space-y-2">
        {items.map((l) => (
          <Link key={l.id} to="/varadhi/item/$id" params={{ id: l.id }}
            className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm border border-black/5 active:scale-[.99]">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-[#f7f7fb] flex items-center justify-center overflow-hidden">
              {l.images?.[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🛒</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1e3a8a]">{l.title}</p>
              <p className="text-[11px] text-[#1e3a8a]/60">
                📍 {[l.village, l.mandal, l.district].filter(Boolean).join(", ") || l.city || ""} · {l.km.toFixed(0)} కి.మీ.
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#16a34a]">
                {l.price != null ? `Rs. ${l.price}${l.unit ? ` / ${l.unit}` : ""}` : "ధర సంప్రదించండి"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

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
        <img src={varadhiLogo.url} alt="Vaaradhi" className="h-14 w-14 rounded-2xl object-contain bg-white shadow-sm p-1" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a]">వారధి</h1>
          <p className="text-xs text-[#1e3a8a]/70">Sell, Buy, Transport & Local Services</p>
        </div>
        <LanguageToggle />
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

      {/* Nearby feed */}
      <NearbyFeed signedIn={signedIn} />

      {/* Categories */}
      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">వర్గాలు — Categories</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => <BoxCard key={c.id} box={c} />)}
      </div>

      {/* Services */}
      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">సర్వీసులు — Services</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {SERVICES.map((s) => <BoxCard key={s.id} box={s} />)}
      </div>


      <p className="mt-8 text-center text-[10px] text-[#1e3a8a]/50">
        © MBR Platform · <Link to="/" className="underline">Back to Portal</Link>
      </p>
    </div>
  );
}
