import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listListings, listProviders, type VaradhiListing, type VaradhiProvider } from "@/lib/varadhi.functions";
import { ArrowLeft, Search } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

export const Route = createFileRoute("/varadhi/browse/$category")({
  validateSearch: zodValidator(z.object({ q: fallback(z.string(), "").default("") })),
  component: BrowsePage,
});

const CATEGORY_LABEL: Record<string, string> = {
  fresh: "తాజా వస్తువులు",
  new: "కొత్త వస్తువులు",
  used: "వాడిన వస్తువులు",
  realestate: "ఇంటి స్థలాలు & భూములు",
  transport: "ట్రాన్స్‌పోర్ట్",
  services: "సర్వీసులు",
};

function BrowsePage() {
  const { category } = Route.useParams();
  const { q } = Route.useSearch();
  const [term, setTerm] = useState(q);
  useEffect(() => { setTerm(q); }, [q]);
  const isProviderPage = category === "transport" || category === "services";
  const fetchListings = useServerFn(listListings);
  const fetchProviders = useServerFn(listProviders);
  const [listings, setListings] = useState<VaradhiListing[]>([]);
  const [providers, setProviders] = useState<VaradhiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isProviderPage) {
          const r = await fetchProviders({ data: { provider_type: category === "transport" ? "transport" : "service" } });
          setProviders(r.providers);
        } else {
          const r = await fetchListings({ data: { category } });
          setListings(r.listings);
        }
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");

  const uniq = (vals: (string | null | undefined)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort();

  const states = uniq(listings.map((l) => l.state));
  const districts = uniq(listings.filter((l) => !state || l.state === state).map((l) => l.district));
  const mandals = uniq(
    listings.filter((l) => (!state || l.state === state) && (!district || l.district === district)).map((l) => l.mandal),
  );

  const needle = term.trim().toLowerCase();
  const shownListings = listings
    .filter((l) => (!state || l.state === state) && (!district || l.district === district) && (!mandal || l.mandal === mandal))
    .filter((l) =>
      !needle ||
      [l.title, l.description, l.sub_category, l.city, l.village, l.mandal, l.district, l.state].some((v) =>
        (v ?? "").toLowerCase().includes(needle)));
  const shownProviders = providers
    .filter((p) => {
      const hay = `${p.city ?? ""} ${p.service_areas ?? ""}`.toLowerCase();
      return [state, district, mandal].every((v) => !v || hay.includes(v.toLowerCase()));
    })
    .filter((p) =>
      !needle || [p.title, p.description, p.sub_type, p.city].some((v) => (v ?? "").toLowerCase().includes(needle)));

  const selectCls =
    "min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[#1e3a8a] outline-none";

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">{CATEGORY_LABEL[category] ?? category}</h1>
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


      {loading && <p className="mt-6 text-sm text-center text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}

      {!loading && !isProviderPage && (
        <div className="mt-4 space-y-3">
          {shownListings.length === 0 && <EmptyState msg="ఏ వస్తువులు లేవు" />}
          {shownListings.map((l) => (
            <Link key={l.id} to="/varadhi/item/$id" params={{ id: l.id }}
              className="block rounded-2xl bg-white p-3 shadow-sm border border-black/5 active:scale-[.99]">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-[#f7f7fb] flex items-center justify-center overflow-hidden">
                  {l.images?.[0] ? <img src={l.images[0]} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl">🛒</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e3a8a] truncate">{l.title}</p>
                  {l.city && <p className="text-[11px] text-[#1e3a8a]/60">📍 {l.city}</p>}
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
          {shownProviders.length === 0 && <EmptyState msg="ఏ సర్వీసులు లేవు" />}
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
