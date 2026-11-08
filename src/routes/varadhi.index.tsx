import { useListingImage } from "@/lib/varadhi-image";
import { formatAmount, isFreeListing, stockLabel } from "@/lib/varadhi-format";
import { bloodStatusLabel } from "@/lib/varadhi-blood";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listListings, getVaradhiTicker, type VaradhiListing } from "@/lib/varadhi.functions";
import { useI18n } from "@/lib/i18n";
import { VARADHI_DEFAULT_TICKER } from "@/lib/varadhi-ticker-defaults";
import { LanguageToggle } from "@/components/LanguageToggle";
import varadhiLogo from "@/assets/logos/vaaradhi-logo-english.png";
import { HomeDiscovery } from "@/components/varadhi/HomeDiscovery";
import { HomeUsageGuide } from "@/components/varadhi/HomeUsageGuide";
import { Button } from "@/components/ui/button";
import { sharedTranslation } from "@/lib/language-support";
import { Sparkles, ImageOff } from "lucide-react";
import { currentAppPageUrl } from "@/lib/app-host-context";
import { VARADHI_SHARE_IMAGE } from "@/lib/app-hosts";

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
      className="overflow-hidden rounded-lg bg-market-surface shadow-market-card border border-market-border active:scale-[.98] transition"
    >
      <div className="h-24 w-full bg-market-canvas flex items-center justify-center overflow-hidden">
        {showImg ? (
          <img
            src={src}
            alt={l.title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-market-muted/50" />
        )}
      </div>
      <div className="p-2">
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-[11px] font-semibold text-market-ink">{l.title}</p>
          <span className="shrink-0 text-[9px] text-market-muted">
            {new Date(l.created_at).toLocaleDateString("te-IN", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
          <p className="text-[12px] font-extrabold text-market-fresh">
            {amount ? `రేటు: Rs. ${amount}` : isFreeListing(l) ? "సంప్రదించండి" : "రేటు: ధర సంప్రదించండి"}
          </p>
          {amount && unit && (
            <span className="text-[10px] font-semibold text-market-fresh">/ {unit}</span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              inStock ? "bg-market-fresh/10 text-market-fresh" : "bg-market-border text-market-muted"
            }`}
          >
            {inStock && stockQty && !isFreeListing(l)
              ? `స్టాక్: ${stockQty}${unit ? ` ${unit}` : ""}`
              : isFreeListing(l) && l.sub_category === "blood" ? bloodStatusLabel(l.unit, inStock) : stockLabel(inStock, isFreeListing(l))}
          </span>
        </div>
        {isFreeListing(l) && l.sub_category === "blood" && l.experience?.trim() && (
          <p className="mt-0.5 line-clamp-2 break-words text-[10px] leading-snug text-market-ink">
            {l.experience.trim()}
          </p>
        )}
        <p className="truncate text-[10px] text-market-muted">
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
  const t = (source: string) => sharedTranslation(lang, source) ?? source;
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
    <div className="market-home mx-auto max-w-3xl px-4 pb-8 sm:px-6">
      {/* Header */}
      <header className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-market-brand/20 bg-market-header px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <img src={varadhiLogo} alt="Vaaradhi" className="h-[72px] w-[72px] shrink-0 rounded-lg object-contain bg-market-surface shadow-market-card p-1 sm:h-20 sm:w-20" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-market-ink sm:text-2xl">
              వారధి <span className="sr-only">— Telugu Local Marketplace for Buying, Selling, Transport & Services</span>
            </h1>
            <p className="mt-1 text-xs font-medium leading-relaxed text-market-ink" data-no-translate data-notranslit>{t("Online Business & Services, Transport")}</p>
          </div>
        </div>
        <LanguageToggle compact />
      </header>

      {/* Banner carousel */}
      <HomeDiscovery />



      {/* Running disclaimer ticker */}
      <div className="mt-3">
        <div className="relative overflow-hidden rounded-md bg-market-notice px-3 py-1 ring-1 ring-market-border">
          <div className="varadhi-marquee whitespace-nowrap text-[11px] font-semibold text-market-notice-ink" data-notranslit>
            {tickerText}
          </div>
        </div>
      </div>



      <HomeUsageGuide />

      {/* CTA */}
      {signedIn === false && (
        <div className="mt-6 border-y border-market-border py-5 text-market-ink">
          <p className="text-sm font-medium">ప్రారంభించడానికి లాగిన్ అవ్వండి</p>
          <p className="mt-0.5 text-[11px] opacity-90">ఆధార్ & లొకేషన్ ధృవీకరించి — అమ్మండి, కొనండి, సేవలు అందించండి.</p>
          <Button
            onClick={() => navigate({ to: "/varadhi/auth" })}
            className="mt-3 w-full bg-market-brand py-2.5 font-semibold text-market-on-brand hover:bg-market-brand/90"
          >
            లాగిన్ / సైన్ అప్
          </Button>
        </div>
      )}

      {/* Updates: nearby first (newest on top), then the rest */}
      <div className="mt-6">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-market-brand" />
          <h2 className="text-sm font-semibold text-market-ink">{t("Latest updates")}</h2>
        </div>
        {!signedIn && <p className="mt-2 text-[11px] text-market-muted">లాగిన్ అయితే కొత్త అప్‌డేట్‌లు కనిపిస్తాయి.</p>}
        {signedIn && loading && <p className="mt-2 text-[11px] text-market-muted">లోడ్ అవుతోంది…</p>}
        {signedIn && !loading && recent.length === 0 && (
          <p className="mt-2 text-[11px] text-market-muted">ఇంకా అప్‌డేట్‌లు లేవు.</p>
        )}
        {signedIn && recent.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {nearby.map((l) => <ListingCard key={l.id} l={l} note={`${l.km.toFixed(0)} కి.మీ.`} />)}
            {others.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
