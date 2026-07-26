import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getListing, logClick, type VaradhiListing, type VaradhiProvider, type VaradhiProfile } from "@/lib/varadhi.functions";
import { ArrowLeft, Phone, MessageCircle, Truck } from "lucide-react";

export const Route = createFileRoute("/varadhi/item/$id")({
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const fetchItem = useServerFn(getListing);
  const click = useServerFn(logClick);
  const [item, setItem] = useState<VaradhiListing | null>(null);
  const [seller, setSeller] = useState<VaradhiProfile | null>(null);
  const [nearby, setNearby] = useState<VaradhiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchItem({ data: { id } });
        setItem(r.listing);
        setSeller(r.seller as any);
        setNearby(r.nearby);
        await click({ data: { target_type: "listing", target_id: id } }).catch(() => {});
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="p-6 text-center text-sm">లోడ్ అవుతోంది…</p>;
  if (!item) return <p className="p-6 text-center text-sm">వస్తువు దొరకలేదు</p>;

  const phone = (seller as any)?.phone;
  const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "#";
  const telLink = phone ? `tel:${phone}` : "#";

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-[#1e3a8a] truncate">{item.title}</h1>
      </div>

      {item.images?.[0] && (
        <img src={item.images[0]} alt={item.title} className="mt-3 w-full aspect-video rounded-2xl object-cover" />
      )}

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-lg font-bold text-[#16a34a]">
          {item.price != null ? `Rs. ${item.price}${item.unit ? ` / ${item.unit}` : ""}` : "ధర సంప్రదించండి"}
        </p>
        {item.description && <p className="mt-2 text-sm text-[#1e3a8a]/80 whitespace-pre-wrap">{item.description}</p>}
        {item.city && <p className="mt-1 text-xs text-[#1e3a8a]/60">📍 {item.city}</p>}
      </div>

      {seller && (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-[#1e3a8a]/60">అమ్మకందారు</p>
          <p className="text-sm font-semibold text-[#1e3a8a]">{(seller as any).business_name || (seller as any).full_name}</p>
          {(seller as any).address && <p className="text-xs text-[#1e3a8a]/70">{(seller as any).address}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={telLink} className="rounded-xl bg-[#16a34a] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <Phone className="h-4 w-4" /> కాల్
            </a>
            <a href={waLink} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25d366] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      )}

      {nearby.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-[#1e3a8a] flex items-center gap-1"><Truck className="h-4 w-4" /> సమీపంలోని ట్రాన్స్‌పోర్ట్</h2>
          <div className="mt-2 space-y-2">
            {nearby.map((p) => (
              <Link key={p.id} to="/varadhi/provider/$id" params={{ id: p.id }}
                className="block rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1e3a8a]">{p.title}</p>
                    <p className="text-[11px] text-[#1e3a8a]/60">{p.sub_type} · {p.city ?? ""}</p>
                  </div>
                  <span className="text-[10px] rounded-full bg-green-100 text-green-700 px-2 py-0.5">ONLINE</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
