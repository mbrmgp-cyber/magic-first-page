import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listListings, listProviders, type VaradhiListing, type VaradhiProvider } from "@/lib/varadhi.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/varadhi/browse/$category")({
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

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">{CATEGORY_LABEL[category] ?? category}</h1>
      </div>

      {loading && <p className="mt-6 text-sm text-center text-[#1e3a8a]/60">లోడ్ అవుతోంది…</p>}

      {!loading && !isProviderPage && (
        <div className="mt-4 space-y-3">
          {listings.length === 0 && <EmptyState msg="ఏ వస్తువులు లేవు" />}
          {listings.map((l) => (
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
          {providers.length === 0 && <EmptyState msg="ఏ సర్వీసులు లేవు" />}
          {providers.map((p) => (
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
