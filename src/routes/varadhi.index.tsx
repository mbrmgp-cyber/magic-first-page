import { useListingImage } from "@/lib/varadhi-image";
import { formatAmount, isFreeListing } from "@/lib/varadhi-format";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listListings, type VaradhiListing } from "@/lib/varadhi.functions";
import { LanguageToggle } from "@/components/LanguageToggle";
import varadhiLogo from "@/assets/varadhi-logo.jpg.asset.json";
import banner1 from "@/assets/varadhi-banner-1.jpg";
import banner2 from "@/assets/varadhi-banner-2.jpg";
import banner3 from "@/assets/varadhi-banner-3.jpg";
import { Apple, Package, Recycle, MapPin, Truck, Wrench, Search, ChevronDown, Navigation, HeartHandshake, Boxes, Sparkles, ImageOff, Share2, Copy, Check, MessageCircle } from "lucide-react";
import QRCode from "qrcode";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-url";

export const Route = createFileRoute("/varadhi/")({
  component: VaradhiHome,
});

type Box = {
  id: string;
  te: string;
  color: string;
  Icon: typeof Apple;
  sub: string;
};

const ITEM_BOXES: Box[] = [
  { id: "fresh", te: "తాజా వస్తువులు", color: "#16a34a", Icon: Apple, sub: "కూరగాయలు, పండ్లు, పాలు" },
  { id: "new", te: "కొత్త వస్తువులు", color: "#2563eb", Icon: Package, sub: "ఎలక్ట్రానిక్స్, ఫ్యాషన్" },
  { id: "used", te: "వాడిన వస్తువులు", color: "#f97316", Icon: Recycle, sub: "సెకండ్ హ్యాండ్" },
];

const SERVICE_BOXES: Box[] = [
  { id: "services", te: "పే సర్వీస్", color: "#dc2626", Icon: Wrench, sub: "టెక్నీషియన్లు & పనులు" },
  { id: "freeservices", te: "ఫ్రీ సర్వీస్", color: "#0f9d58", Icon: HeartHandshake, sub: "ఉచిత సేవలు" },
];

const REAL_ESTATE: Box = {
  id: "realestate", te: "ఇంటి స్థలాలు & భూములు", color: "#7c3aed", Icon: MapPin, sub: "ప్లాట్లు, భూములు",
};

const TRANSPORT: Box = {
  id: "transport", te: "ట్రాన్స్‌పోర్ట్", color: "#0ea5e9", Icon: Truck, sub: "బండ్లు & రవాణా",
};

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

function CategoryTile({ box, onClick, open }: { box: Box; onClick: () => void; open?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-sm border border-black/5 active:scale-95 transition"
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${box.color}, ${box.color}cc)` }}
      >
        <box.Icon className="h-6 w-6" />
      </span>
      <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-[#1e3a8a]">{box.te}</span>
      {open !== undefined && (
        <ChevronDown className={`h-3 w-3 text-[#1e3a8a]/50 transition-transform ${open ? "rotate-180" : ""}`} />
      )}
    </button>
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


const VARADHI_SHARE_URL = `${PUBLIC_APP_ORIGIN}/varadhi`;

function ShareApp() {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(VARADHI_SHARE_URL, {
      width: 240,
      margin: 1,
      color: { dark: "#1e3a8a", light: "#ffffff" },
    })
      .then(setQrUrl)
      .catch(() => undefined);
  }, []);

  const shareText = `వారధి — అమ్మండి, కొనండి, రవాణా & సర్వీసులు. ఇప్పుడే ట్రై చేయండి: ${VARADHI_SHARE_URL}`;

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "వారధి", text: shareText, url: VARADHI_SHARE_URL });
        return;
      } catch {
        /* cancelled → fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(VARADHI_SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="mt-6 rounded-2xl border border-[#1e3a8a]/15 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Share2 className="h-4 w-4 text-[#f97316]" />
        <h2 className="text-sm font-semibold text-[#1e3a8a]/80">ఫ్రెండ్స్‌కు షేర్ చేయండి</h2>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3">
        {qrUrl ? (
          <div className="rounded-xl border-2 border-[#1e3a8a]/10 p-2 bg-white">
            <img src={qrUrl} alt="Vaaradhi QR" width={160} height={160} className="h-40 w-40" />
          </div>
        ) : (
          <div className="h-40 w-40 animate-pulse rounded-xl bg-[#1e3a8a]/5" />
        )}
        <p className="text-center text-[11px] text-[#1e3a8a]/60">
          స్కాన్ చేసి వారధి ఆప్ ఓపెన్ చేయండి
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f2f4fb] px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#1e3a8a]">{VARADHI_SHARE_URL}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-[#1e3a8a] px-2.5 py-1.5 text-[11px] font-semibold text-white active:scale-95"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={share}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#16a34a] py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          <Share2 className="h-4 w-4" /> షేర్
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
    </div>
  );
}

function VaradhiHome() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navigate = useNavigate();
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
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
    setNearby(near);
  }, [coords, recent]);

  const search = () =>
    navigate({ to: "/varadhi/browse/$category", params: { category: "fresh" }, search: { q: q.trim() } });

  const goto = (id: string) =>
    navigate({ to: "/varadhi/browse/$category", params: { category: id }, search: { q: "" } });

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-8">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={varadhiLogo.url} alt="Vaaradhi" className="h-12 w-12 shrink-0 rounded-2xl object-contain bg-white shadow-sm p-1" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-[#1e3a8a]">వారధి</h1>
            <p className="truncate text-[11px] text-[#1e3a8a]/70">Sell, Buy, Transport & Services</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Banner carousel */}
      <BannerCarousel />

      {/* Main search bar */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-md">
        <Search className="h-4 w-4 shrink-0 text-[#1e3a8a]/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") search(); }}
          placeholder="ఏమి కావాలి? వెతకండి…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#1e3a8a] outline-none placeholder:text-[#1e3a8a]/40"
        />
        <button
          type="button"
          onClick={search}
          className="shrink-0 rounded-xl bg-[#f97316] px-3 py-1.5 text-[11px] font-semibold text-white shadow active:scale-95"
        >
          వెతకండి
        </button>
      </div>

      {/* CTA */}
      {signedIn === false && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b5bdb] p-4 text-white shadow-md">
          <p className="text-sm font-medium">ప్రారంభించడానికి లాగిన్ అవ్వండి</p>
          <p className="mt-0.5 text-[11px] opacity-90">Aadhaar & లొకేషన్ verify చేసి — అమ్మండి, కొనండి, సర్వీసులు అందించండి.</p>
          <button
            onClick={() => navigate({ to: "/varadhi/auth" })}
            className="mt-3 w-full rounded-xl bg-[#f97316] py-2.5 font-semibold text-white shadow"
          >
            లాగిన్ / సైన్ అప్
          </button>
        </div>
      )}

      {/* Categories — icon grid */}
      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">వర్గాలు — Categories</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <CategoryTile
          box={{ id: "items", te: "వస్తువులు", color: "#1e3a8a", Icon: Boxes, sub: "" }}
          open={openGroup === "items"}
          onClick={() => setOpenGroup(openGroup === "items" ? null : "items")}
        />
        <CategoryTile box={REAL_ESTATE} onClick={() => goto(REAL_ESTATE.id)} />
        <CategoryTile box={TRANSPORT} onClick={() => goto(TRANSPORT.id)} />
        <CategoryTile
          box={{ id: "svc", te: "సర్వీసులు", color: "#dc2626", Icon: Wrench, sub: "" }}
          open={openGroup === "svc"}
          onClick={() => setOpenGroup(openGroup === "svc" ? null : "svc")}
        />
      </div>

      {openGroup && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-2">
          {(openGroup === "items" ? ITEM_BOXES : SERVICE_BOXES).map((b) => (
            <CategoryTile key={b.id} box={b} onClick={() => goto(b.id)} />
          ))}
        </div>
      )}

      {/* Nearby */}
      {signedIn && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1e3a8a]/80">మీ చుట్టూ 100 కి.మీ.</h2>
            <button onClick={askLocation} className="flex items-center gap-1 text-[11px] font-semibold text-[#f97316]">
              <Navigation className="h-3.5 w-3.5" /> లొకేషన్
            </button>
          </div>
          {nearby.length === 0
            ? <p className="mt-2 text-[11px] text-[#1e3a8a]/60">మీ చుట్టూ అప్‌డేట్‌లు లేవు.</p>
            : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {nearby.map((l) => <ListingCard key={l.id} l={l} note={`${l.km.toFixed(0)} కి.మీ.`} />)}
              </div>
            )}
        </div>
      )}

      {/* Recent listings */}
      <div className="mt-6">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-semibold text-[#1e3a8a]/80">కొత్త అప్‌డేట్‌లు — Recent Listings</h2>
        </div>
        {!signedIn && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లాగిన్ అయితే కొత్త అప్‌డేట్‌లు కనిపిస్తాయి.</p>}
        {signedIn && loading && <p className="mt-2 text-[11px] text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}
        {signedIn && !loading && recent.length === 0 && (
          <p className="mt-2 text-[11px] text-[#1e3a8a]/60">ఇంకా అప్‌డేట్‌లు లేవు.</p>
        )}
        {signedIn && recent.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {recent.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>

      {/* Share app */}
      <ShareApp />

      <p className="mt-8 text-center text-[10px] text-[#1e3a8a]/50">
        © MBR Platform · <Link to="/" className="underline">Back to Portal</Link>
      </p>
    </div>
  );
}
