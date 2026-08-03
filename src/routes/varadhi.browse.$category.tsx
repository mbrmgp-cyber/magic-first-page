import { useListingImage } from "@/lib/varadhi-image";
import { formatAmount } from "@/lib/varadhi-format";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listListings, listProviders, type VaradhiListing, type VaradhiProvider } from "@/lib/varadhi.functions";
import { ArrowLeft, Search, Apple, Package, Recycle, MapPin, Truck, Wrench, HeartHandshake, Boxes, ChevronDown, ImageOff } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { STATES, districtsFor } from "@/lib/ap-locations";

export const Route = createFileRoute("/varadhi/browse/$category")({
  validateSearch: zodValidator(z.object({ q: fallback(z.string(), "").default("") })),
  component: BrowsePage,
});

type Box = { id: string; te: string; color: string; Icon: typeof Apple };

const ITEM_BOXES: Box[] = [
  { id: "fresh", te: "తాజా వస్తువులు", color: "#16a34a", Icon: Apple },
  { id: "new", te: "కొత్త వస్తువులు", color: "#2563eb", Icon: Package },
  { id: "used", te: "వాడిన వస్తువులు", color: "#f97316", Icon: Recycle },
];

const SERVICE_BOXES: Box[] = [
  { id: "services", te: "పే సర్వీస్", color: "#dc2626", Icon: Wrench },
  { id: "freeservices", te: "ఫ్రీ సర్వీస్", color: "#0f9d58", Icon: HeartHandshake },
];

type Group =
  | { kind: "single"; box: Box }
  | { kind: "group"; id: string; te: string; color: string; Icon: typeof Apple; boxes: Box[] };

const GROUPS: Group[] = [
  { kind: "group", id: "items", te: "వస్తువులు", color: "#1e3a8a", Icon: Boxes, boxes: ITEM_BOXES },
  { kind: "single", box: { id: "realestate", te: "ఇంటి స్థలాలు & భూములు", color: "#7c3aed", Icon: MapPin } },
  { kind: "single", box: { id: "transport", te: "ట్రాన్స్‌పోర్ట్", color: "#0ea5e9", Icon: Truck } },
  { kind: "group", id: "svc", te: "సర్వీసులు", color: "#dc2626", Icon: Wrench, boxes: SERVICE_BOXES },
];


function BrowsePage() {
  const { category } = Route.useParams();
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  useEffect(() => { setTerm(q); }, [q]);

  const fetchListings = useServerFn(listListings);
  const fetchProviders = useServerFn(listProviders);
  const [allListings, setAllListings] = useState<VaradhiListing[]>([]);
  const [allProviders, setAllProviders] = useState<VaradhiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [l, t, s] = await Promise.all([
          fetchListings({ data: {} }),
          fetchProviders({ data: { provider_type: "transport" } }),
          fetchProviders({ data: { provider_type: "service" } }),
        ]);
        setAllListings(l.listings ?? []);
        setAllProviders([...(t.providers ?? []), ...(s.providers ?? [])]);
      } catch { /* ignore */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isProviderPage = category === "transport" || category === "services";
  const providerType = category === "transport" ? "transport" : "service";

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    ITEM_BOXES.some((b) => b.id === category) ? "items"
      : SERVICE_BOXES.some((b) => b.id === category) ? "svc"
        : null,
  );


  const uniq = (vals: (string | null | undefined)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort();

  // States/districts come from a static list merged with whatever the data has.
  const states = useMemo(
    () => uniq([...STATES, ...allListings.map((l) => l.state)]),
    [allListings],
  );
  const districts = useMemo(
    () => uniq([
      ...districtsFor(state),
      ...allListings.filter((l) => !state || l.state === state).map((l) => l.district),
    ]),
    [allListings, state],
  );
  const mandals = useMemo(
    () => uniq(
      allListings
        .filter((l) => (!state || l.state === state) && (!district || l.district === district))
        .map((l) => l.mandal),
    ),
    [allListings, state, district],
  );

  const inArea = (l: VaradhiListing) =>
    (!state || l.state === state) && (!district || l.district === district) && (!mandal || l.mandal === mandal);
  const providerInArea = (p: VaradhiProvider) => {
    const hay = `${p.city ?? ""} ${p.service_areas ?? ""}`.toLowerCase();
    return [state, district, mandal].every((v) => !v || hay.includes(v.toLowerCase()));
  };

  const needle = term.trim().toLowerCase();
  const areaListings = allListings.filter(inArea);
  const areaProviders = allProviders.filter(providerInArea);

  const isFree = (l: VaradhiListing) => ((l as unknown as { post_type?: string }).post_type ?? "business") === "free";

  const countFor = (id: string) => {
    if (id === "transport" || id === "services") {
      return areaProviders.filter((p) => p.provider_type === (id === "transport" ? "transport" : "service")).length;
    }
    if (id === "freeservices") return areaListings.filter(isFree).length;
    return areaListings.filter((l) => l.category === id && !isFree(l)).length;
  };

  const shownListings = areaListings
    .filter((l) => (category === "freeservices" ? isFree(l) : l.category === category && !isFree(l)))
    .filter((l) =>
      !needle ||
      [l.title, l.description, l.sub_category, l.city, l.village, l.mandal, l.district, l.state].some((v) =>
        (v ?? "").toLowerCase().includes(needle)));

  const shownProviders = areaProviders
    .filter((p) => p.provider_type === providerType)
    .filter((p) =>
      !needle || [p.title, p.description, p.sub_type, p.city].some((v) => (v ?? "").toLowerCase().includes(needle)));

  const selectCls =
    "min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[#1e3a8a] outline-none";

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">ఎక్కడ ఏమి కావాలో వెతకండి</h1>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-[#1e3a8a]/50" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="వెతకండి…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#1e3a8a] outline-none placeholder:text-[#1e3a8a]/40"
        />
        {term && (
          <button type="button" onClick={() => setTerm("")} className="text-xs text-[#1e3a8a]/50">✕</button>
        )}
      </div>

      {/* Area filters */}
      <div className="mt-2 flex gap-2">
        <select className={selectCls} value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); setMandal(""); }}>
          <option value="">రాష్ట్రం</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={district} onChange={(e) => { setDistrict(e.target.value); setMandal(""); }}>
          <option value="">జిల్లా</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className={selectCls} value={mandal} onChange={(e) => setMandal(e.target.value)}>
          <option value="">మండలం</option>
          {mandals.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {(state || district || mandal) && (
        <button
          type="button"
          onClick={() => { setState(""); setDistrict(""); setMandal(""); }}
          className="mt-2 text-[11px] font-semibold text-[#f97316]"
        >
          ఫిల్టర్లు తీసేయండి ✕
        </button>
      )}

      {/* Grouped category boxes — counts reflect the selected area */}
      {(() => {
        const boxBtn = (b: Box) => {
          const active = b.id === category;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate({ to: "/varadhi/browse/$category", params: { category: b.id }, search: { q: term.trim() } })}
              className={`rounded-2xl border p-2 text-left transition active:scale-[.98] ${
                active ? "border-transparent text-white shadow" : "border-black/5 bg-white text-[#1e3a8a]"
              }`}
              style={active ? { background: b.color } : undefined}
            >
              <b.Icon className="h-4 w-4" style={active ? undefined : { color: b.color }} />
              <p className="mt-1 text-[10px] font-semibold leading-tight">{b.te}</p>
              <p className={`text-[10px] ${active ? "text-white/80" : "text-[#1e3a8a]/50"}`}>{countFor(b.id)}</p>
            </button>
          );
        };
        return (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {GROUPS.map((g) => {
                if (g.kind === "single") return boxBtn(g.box);
                const isOpen = openGroup === g.id;
                const total = g.boxes.reduce((n, b) => n + countFor(b.id), 0);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : g.id)}
                    className={`rounded-2xl border p-2 text-left transition active:scale-[.98] ${
                      isOpen ? "border-transparent text-white shadow" : "border-black/5 bg-white text-[#1e3a8a]"
                    }`}
                    style={isOpen ? { background: g.color } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <g.Icon className="h-4 w-4" style={isOpen ? undefined : { color: g.color }} />
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold leading-tight">{g.te}</p>
                    <p className={`text-[10px] ${isOpen ? "text-white/80" : "text-[#1e3a8a]/50"}`}>{total}</p>
                  </button>
                );
              })}
            </div>

            {GROUPS.filter((g): g is Extract<Group, { kind: "group" }> => g.kind === "group" && openGroup === g.id).map((g) => (
              <div key={g.id} className="grid grid-cols-3 gap-2 rounded-2xl bg-white/60 p-2">
                {g.boxes.map(boxBtn)}
              </div>
            ))}
          </div>
        );
      })()}


      {loading && <p className="mt-6 text-sm text-center text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}

      {!loading && !isProviderPage && (
        <div className="mt-4 space-y-3">
          {shownListings.length === 0 && <EmptyState msg="ఈ ఏరియాలో ఏ వస్తువులు లేవు" />}
          {shownListings.map((l) => (
            <Link key={l.id} to="/varadhi/item/$id" params={{ id: l.id }}
              className="block rounded-2xl bg-white p-2.5 shadow-sm border border-black/5 active:scale-[.99]">
              <div className="flex gap-2.5">
                <ListingThumb src={l.images?.[0]} alt={l.title} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#1e3a8a] truncate">{l.title}</p>
                    <span className="shrink-0 text-[10px] text-[#1e3a8a]/45">
                      {new Date(l.created_at).toLocaleDateString("te-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  {(l.village || l.mandal || l.district || l.city) && (
                    <p className="text-[11px] text-[#1e3a8a]/60 truncate">
                      📍 {[l.village, l.mandal, l.district].filter(Boolean).join(", ") || l.city}
                    </p>
                  )}
                   <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                     <p className="text-[13px] font-extrabold text-[#16a34a]">
                       {formatAmount(l.price)
                         ? `రేటు: Rs. ${formatAmount(l.price)}`
                         : ((l as any).post_type ?? "business") === "free"
                           ? "సంప్రదించండి"
                           : "రేటు: ధర సంప్రదించండి"}
                     </p>
                     {formatAmount(l.price) && l.unit && (
                       <span className="text-[11px] font-semibold text-[#16a34a]">/ {l.unit === "కేజీలు" ? "కేజీ" : l.unit}</span>
                     )}
                    {l.stock_status === "closed" && (
                      <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">స్టాక్ లేదు</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && isProviderPage && (
        <div className="mt-4 space-y-3">
          {shownProviders.length === 0 && <EmptyState msg="ఈ ఏరియాలో ఏ సర్వీసులు లేవు" />}
          {shownProviders.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      )}

    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="mt-8 text-center text-sm text-[#1e3a8a]/60">{msg}</div>;
}

function ListingThumb({ src, alt }: { src?: string | null; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const resolved = useListingImage(src);
  const show = resolved && !failed;
  return (
    <div className="h-14 w-14 shrink-0 rounded-xl bg-[#f7f7fb] flex items-center justify-center overflow-hidden border border-black/5">
      {show ? (
        <img src={resolved ?? undefined} alt={alt ?? ""} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="h-5 w-5 text-[#1e3a8a]/30" />
      )}
    </div>
  );
}

function ProviderCard({ p }: { p: VaradhiProvider }) {
  const [failed, setFailed] = useState(false);
  const photo = useListingImage(p.photo_url);
  const showImg = !!photo && !failed;
  const rate = formatAmount(p.price_per_km as any);
  const online = p.availability_status === "online";
  const place = p.location_full || p.city || "—";

  return (
    <Link
      to="/varadhi/provider/$id"
      params={{ id: p.id }}
      className="flex gap-3 overflow-hidden rounded-2xl bg-white p-2.5 shadow-md border border-black/5 active:scale-[.99] transition"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#e8f0ff] to-[#f7f7fb] flex items-center justify-center border border-black/5">
        {showImg ? (
          <img src={photo ?? undefined} alt={p.title} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <Truck className="h-8 w-8 text-[#1e3a8a]/30" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-bold text-[#1e3a8a]">{p.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${online ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
            {online ? "అందుబాటులో" : "ఖాళీ లేదు"}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-[#0ea5e9]">
          {p.sub_type}{p.vehicle_details ? ` · ${p.vehicle_details}` : ""}
        </p>

        <p className="mt-1 text-[12px] font-extrabold text-[#16a34a]">
          {rate ? `ధర: Rs. ${rate} / కి.మీ.` : "ధర సంప్రదించండి"}
        </p>

        <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#1e3a8a]/65">📍 {place}</p>
      </div>
    </Link>
  );
}
