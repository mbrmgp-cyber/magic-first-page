import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listListings, listProviders, type VaradhiListing, type VaradhiProvider } from "@/lib/varadhi.functions";
import { ArrowLeft, Search, Apple, Package, Recycle, MapPin, Truck, Wrench } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { STATES, districtsFor } from "@/lib/ap-locations";

export const Route = createFileRoute("/varadhi/browse/$category")({
  validateSearch: zodValidator(z.object({ q: fallback(z.string(), "").default("") })),
  component: BrowsePage,
});

const BOXES = [
  { id: "fresh", te: "తాజా వస్తువులు", color: "#16a34a", Icon: Apple },
  { id: "new", te: "కొత్త వస్తువులు", color: "#2563eb", Icon: Package },
  { id: "used", te: "వాడిన వస్తువులు", color: "#f97316", Icon: Recycle },
  { id: "realestate", te: "ఇంటి స్థలాలు & భూములు", color: "#7c3aed", Icon: MapPin },
  { id: "transport", te: "ట్రాన్స్‌పోర్ట్", color: "#0ea5e9", Icon: Truck },
  { id: "services", te: "సర్వీసులు", color: "#dc2626", Icon: Wrench },
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

  const countFor = (id: string) =>
    id === "transport" || id === "services"
      ? areaProviders.filter((p) => p.provider_type === (id === "transport" ? "transport" : "service")).length
      : areaListings.filter((l) => l.category === id).length;

  const shownListings = areaListings
    .filter((l) => l.category === category)
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

      {/* 6 category boxes — counts reflect the selected area */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {BOXES.map((b) => {
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
        })}
      </div>

      {loading && <p className="mt-6 text-sm text-center text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}

      {!loading && !isProviderPage && (
        <div className="mt-4 space-y-3">
          {shownListings.length === 0 && <EmptyState msg="ఈ ఏరియాలో ఏ వస్తువులు లేవు" />}
          {shownListings.map((l) => (
            <Link key={l.id} to="/varadhi/item/$id" params={{ id: l.id }}
              className="block rounded-2xl bg-white p-3 shadow-sm border border-black/5 active:scale-[.99]">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-[#f7f7fb] flex items-center justify-center overflow-hidden">
                  {l.images?.[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl">🛒</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e3a8a] truncate">{l.title}</p>
                  {(l.village || l.mandal || l.district || l.city) && (
                    <p className="text-[11px] text-[#1e3a8a]/60">
                      📍 {[l.village, l.mandal, l.district].filter(Boolean).join(", ") || l.city}
                    </p>
                  )}
                  <p className="text-sm font-bold text-[#16a34a] mt-0.5">
                    {l.price != null ? `Rs. ${l.price}${l.unit ? ` / ${l.unit}` : ""}` : "ధర సంప్రదించండి"}
                  </p>
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
            <Link key={p.id} to="/varadhi/provider/$id" params={{ id: p.id }}
              className="block rounded-2xl bg-white p-3 shadow-sm border border-black/5 active:scale-[.99]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1e3a8a]">{p.title}</p>
                  <p className="text-[11px] text-[#1e3a8a]/60">{p.sub_type} · {p.city ?? ""}</p>
                </div>
                <span className="text-[10px] rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-semibold">ONLINE</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="mt-8 text-center text-sm text-[#1e3a8a]/60">{msg}</div>;
}
