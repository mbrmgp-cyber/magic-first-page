import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getListing, logClick, type VaradhiListing, type VaradhiProvider, type VaradhiProfile } from "@/lib/varadhi.functions";
import { useListingImage } from "@/lib/varadhi-image";
import { formatAmount, formatPrice, isFreeListing, noPriceLabel, stockLabel } from "@/lib/varadhi-format";

import { ArrowLeft, Phone, MessageCircle, Truck, Share2 } from "lucide-react";

export const Route = createFileRoute("/varadhi/item/$id")({
  head: ({ params }) => {
    const url = `https://mbrplatform.com/varadhi/item/${params.id}`;
    const title = "Item Details — Vaaradhi (వారధి) Local Marketplace";
    const desc =
      "వారధిలో ఈ వస్తువు వివరాలు — ధర, ఫోటోలు, అమ్మకందారు సమాచారం మరియు సమీప రవాణా సౌకర్యాలు.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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

  const img0 = useListingImage(item?.images?.[0]);
  const img1 = useListingImage(item?.images?.[1]);

  if (loading) return <p className="p-6 text-center text-sm">లోడ్ అవుతోంది…</p>;
  if (!item) return <p className="p-6 text-center text-sm">వస్తువు దొరకలేదు</p>;

  const phone = (seller as any)?.phone;
  const waLink = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "#";
  const telLink = phone ? `tel:${phone}` : "#";

  const place = [(item as any).village, (item as any).mandal, (item as any).district, (item as any).state]
    .filter(Boolean).join(", ") || item.city || "";
  const inStock = item.stock_status !== "closed";
  const amount = formatAmount(item.price);
  const unit = item.unit === "కేజీలు" ? "కేజీ" : item.unit;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-[#1e3a8a] truncate">{item.title}</h1>
      </div>

      {img0 ? (
        <img src={img0} alt={item.title} className="mt-3 w-full aspect-square rounded-2xl object-cover bg-white" />
      ) : (
        <div className="mt-3 w-full aspect-square rounded-2xl bg-white flex items-center justify-center text-5xl">🛒</div>
      )}
      {img1 && (
        <img src={img1} alt="లొకేషన్" className="mt-2 w-full aspect-video rounded-2xl object-cover bg-white" />
      )}

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <p className="text-base font-bold text-[#1e3a8a]">{item.title}</p>
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-xs font-semibold text-green-700">{isFreeListing(item) ? "ఉచిత సేవ" : "వస్తువు రేటు"}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[#16a34a]">
            {amount ? `Rs. ${amount}${unit ? ` / ${unit}` : ""}` : noPriceLabel(isFreeListing(item))}
          </p>
        </div>


        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${inStock ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
            {stockLabel(inStock, isFreeListing(item))}
          </span>
          {(item as any).stock_qty && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1e3a8a]">
              స్టాక్: {(item as any).stock_qty}{unit ? ` ${unit}` : ""}
            </span>
          )}
          {item.sub_category && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#f97316]">{item.sub_category}</span>
          )}
        </div>

        <dl className="mt-1 divide-y divide-black/5 text-sm">
          {place && (
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-[#1e3a8a]/60">📍 ప్రాంతం</dt><dd className="text-right font-medium">{place}</dd>
            </div>
          )}
          {(item as any).pickup_location && (
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-[#1e3a8a]/60">దొరుకు చోటు</dt><dd className="text-right font-medium">{(item as any).pickup_location}</dd>
            </div>
          )}
          {(item as any).pincode && (
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-[#1e3a8a]/60">పిన్ కోడ్</dt><dd className="text-right font-medium">{(item as any).pincode}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 py-1.5">
            <dt className="text-[#1e3a8a]/60">పోస్ట్ చేసిన తేదీ</dt>
            <dd className="text-right font-medium">{new Date(item.created_at).toLocaleDateString("te-IN")}</dd>
          </div>
        </dl>

        {item.description && <p className="pt-1 text-sm text-[#1e3a8a]/80 whitespace-pre-wrap">{item.description}</p>}
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
          <button
            type="button"
            onClick={() => {
              const text = [
                item.title,
                isFreeListing(item) ? "సంప్రదించండి" : `రేటు: ${formatPrice(item.price, item.unit)}`,
                place ? `📍 ${place}` : "",
                phone ? `📞 ${phone}` : "",
                typeof window !== "undefined" ? window.location.href : "",
              ].filter(Boolean).join("\n");
              if (typeof navigator !== "undefined" && (navigator as any).share) {
                (navigator as any).share({ title: item.title, text }).catch(() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                });
                return;
              }
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="mt-2 w-full rounded-xl bg-[#1e3a8a] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1"
          >
            <Share2 className="h-4 w-4" /> షేర్ చేయండి
          </button>
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
