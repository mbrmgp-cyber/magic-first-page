import { useListingImage } from "@/lib/varadhi-image";
import { formatAmount, isFreeListing, stockLabel } from "@/lib/varadhi-format";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listListings, getVaradhiTicker, type VaradhiListing } from "@/lib/varadhi.functions";
import { useI18n, bi } from "@/lib/i18n";
import { VARADHI_DEFAULT_TICKER } from "@/lib/varadhi-ticker-defaults";
import { LanguageToggle } from "@/components/LanguageToggle";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";
import banner1 from "@/assets/varadhi-banner-1.jpg";
import banner2 from "@/assets/varadhi-banner-2.jpg";
import banner3 from "@/assets/varadhi-banner-3.jpg";
import { Sparkles, ImageOff } from "lucide-react";
import { currentAppPageUrl } from "@/lib/app-host-context";

export const Route = createFileRoute("/varadhi/")({
  head: () => ({
    meta: [
      { title: "Vaaradhi (వారధి) — Telugu Local Marketplace for Buying, Selling & Transport" },
      {
        name: "description",
        content:
          "వారధి — మీ ఊరిలో వస్తువులు అమ్మండి, కొనండి, రవాణా వాహనాలు మరియు టెక్నీషియన్ సేవలు కనుగొనండి.",
      },
      { property: "og:title", content: "Vaaradhi (వారధి) — Telugu Local Marketplace" },
      {
        property: "og:description",
        content: "మీ ఊరిలో వస్తువులు అమ్మండి, కొనండి, రవాణా మరియు స్థానిక సేవలు కనుగొనండి.",
      },
      { property: "og:url", content: currentAppPageUrl("/varadhi") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: VARADHI_SHARE_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Vaaradhi (వారధి) logo" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: VARADHI_SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: currentAppPageUrl("/varadhi") }],
  }),
  component: VaradhiHome,
});






const BANNERS = [
  { src: banner1, te: "తాజా వస్తువులు మీ ఊరిలోనే", color: "#16a34a" },
  { src: banner2, te: "ట్రాన్స్‌పోర్ట్ ఇప్పుడు సులభం", color: "#0ea5e9" },
  { src: banner3, te: "సర్వీసులు — ఒక్క టచ్‌లో", color: "#7c3aed" },
];

function BannerCarousel() {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setI((v) => (v + 1) % BANNERS.length), 3500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl shadow-lg">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {BANNERS.map((b) => (
          <div key={b.src} className="relative w-full shrink-0">
            <img src={b.src} alt={b.te} width={1200} height={600} className="h-36 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
              <p className="text-sm font-bold text-white drop-shadow">{b.te}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 right-3 flex gap-1.5">
        {BANNERS.map((b, idx) => (
          <button
            key={b.src}
            type="button"
            aria-label={`banner ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
          />
        ))}
      </div>
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

function ListingCard({ l, note }: { l: VaradhiListing; note?: string }) {
  const [failed, setFailed] = useState(false);
  const src = useListingImage(l.images?.[0]);
  const showImg = !!src && !failed;
  const amount = formatAmount(l.price);
  const unit = l.unit === "కేజీలు" ? "కేజీ" : l.unit;

  const stockQty = (l as unknown as { stock_qty?: number | string | null }).stock_qty;
  const inStock = l.stock_status !== "closed";
  return (
    <Link
      to="/varadhi/item/$id"
      params={{ id: l.id }}
      className="overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5 active:scale-[.98] transition"
    >
      <div className="h-24 w-full bg-[#f2f4fb] flex items-center justify-center overflow-hidden">
        {showImg ? (
          <img
            src={src}
            alt={l.title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-[#1e3a8a]/30" />
        )}
      </div>
      <div className="p-2">
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-[11px] font-semibold text-[#1e3a8a]">{l.title}</p>
          <span className="shrink-0 text-[9px] text-[#1e3a8a]/45">
            {new Date(l.created_at).toLocaleDateString("te-IN", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
          <p className="text-[12px] font-extrabold text-[#16a34a]">
            {amount ? `రేటు: Rs. ${amount}` : isFreeListing(l) ? "సంప్రదించండి" : "రేటు: ధర సంప్రదించండి"}
          </p>
          {amount && unit && (
            <span className="text-[10px] font-semibold text-[#16a34a]">/ {unit}</span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              inStock ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {inStock && stockQty && !isFreeListing(l)
              ? `స్టాక్: ${stockQty}${unit ? ` ${unit}` : ""}`
              : stockLabel(inStock, isFreeListing(l))}
          </span>
        </div>
        <p className="truncate text-[10px] text-[#1e3a8a]/60">
          📍 {[l.village, l.mandal, l.district].filter(Boolean).join(", ") || l.city || "—"}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
    </Link>
  );
}


function VaradhiHome() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { lang } = useI18n();
  const loadTicker = useServerFn(getVaradhiTicker);
  const [ticker, setTicker] = useState(VARADHI_DEFAULT_TICKER);
  const tickerText = lang === "te" ? ticker.te : ticker.en;

  useEffect(() => {
    loadTicker()
      .then((r) => setTicker({ te: r.ticker_te, en: r.ticker_en }))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fetchListings = useServerFn(listListings);

  const [recent, setRecent] = useState<VaradhiListing[]>([]);
  const [nearby, setNearby] = useState<Array<VaradhiListing & { km: number }>>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const askLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  useEffect(() => { if (signedIn) askLocation(); }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchListings({ data: {} });
        setRecent((r.listings ?? []).slice(0, 12));
      } catch { /* ignore */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  useEffect(() => {
    if (!coords || recent.length === 0) return;
    const near = recent
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({ ...l, km: distanceKm(coords, { lat: l.lat as number, lng: l.lng as number }) }))
      .filter((l) => l.km <= 100)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 6);
    setNearby(near);
  }, [coords, recent]);

  const nearbyIds = new Set(nearby.map((l) => l.id));
  const others = recent.filter((l) => !nearbyIds.has(l.id));

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-8">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={varadhiLogo.url} alt="Vaaradhi" className="h-12 w-12 shrink-0 rounded-2xl object-contain bg-white shadow-sm p-1" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-[#1e3a8a]">
              వారధి <span className="sr-only">— Telugu Local Marketplace for Buying, Selling, Transport & Services</span>
            </h1>
            <p className="truncate text-[11px] text-[#1e3a8a]/70">అమ్మండి, కొనండి, రవాణా & సేవలు</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Banner carousel */}
      <BannerCarousel />

      {/* Running disclaimer ticker + small admin apply button */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-full bg-[#fff7ed] px-2 py-1.5 ring-1 ring-[#f97316]/25">
          <div className="varadhi-marquee whitespace-nowrap text-[11px] font-semibold text-[#9a3412]" data-notranslit>
            {tickerText}
          </div>
        </div>
        <Link
          to="/varadhi/admin-apply"
          data-notranslit
          className="shrink-0 rounded-full bg-[#1e3a8a] px-3 py-1.5 text-[11px] font-semibold text-white shadow active:scale-95"
        >
          {bi("అడ్మిన్‌గా దరఖాస్తు చేయండి", "Apply as Admin", lang)}
        </Link>
      </div>



      {/* CTA */}
      {signedIn === false && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b5bdb] p-4 text-white shadow-md">
          <p className="text-sm font-medium">ప్రారంభించడానికి లాగిన్ అవ్వండి</p>
          <p className="mt-0.5 text-[11px] opacity-90">ఆధార్ & లొకేషన్ ధృవీకరించి — అమ్మండి, కొనండి, సేవలు అందించండి.</p>
          <button
            onClick={() => navigate({ to: "/varadhi/auth" })}
            className="mt-3 w-full rounded-xl bg-[#f97316] py-2.5 font-semibold text-white shadow"
          >
            లాగిన్ / సైన్ అప్
          </button>
        </div>
      )}

      {/* Updates: nearby first (newest on top), then the rest */}
      <div className="mt-6">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-semibold text-[#1e3a8a]/80">కొత్త అప్‌డేట్‌లు</h2>
        </div>
        {!signedIn && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లాగిన్ అయితే కొత్త అప్‌డేట్‌లు కనిపిస్తాయి.</p>}
        {signedIn && loading && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}
        {signedIn && !loading && recent.length === 0 && (
          <p className="mt-2 text-[11px] text-[#1e3a8a]/60">ఇంకా అప్‌డేట్‌లు లేవు.</p>
        )}
        {signedIn && recent.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {nearby.map((l) => <ListingCard key={l.id} l={l} note={`${l.km.toFixed(0)} కి.మీ.`} />)}
            {others.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>






      <p className="mt-8 text-center text-[10px] text-[#1e3a8a]/50">
        © MBR Platform · <Link to="/" className="underline">పోర్టల్‌కి తిరిగి</Link>
      </p>
    </div>
  );
}
