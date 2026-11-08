import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOOD_DONOR, bloodNeedOf, bloodPlaceLabel, bloodPosterLabel, bloodStatusLabel } from "@/lib/varadhi-blood";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getListing, getListingShareMeta, logClick, type VaradhiListing, type VaradhiProvider, type VaradhiProfile } from "@/lib/varadhi.functions";
import { useListingImage } from "@/lib/varadhi-image";
import { PostModerationActions } from "@/components/varadhi/PostModerationActions";
import { formatAmount, formatPrice, isFreeListing, noPriceLabel, stockLabel } from "@/lib/varadhi-format";
import { priceLabel } from "@/lib/varadhi-property";
import { isServiceListing, serviceChargeText, serviceDetailRows } from "@/lib/varadhi-service-details";

import { ArrowLeft, Phone, MessageCircle, Truck, Share2 } from "lucide-react";

export const Route = createFileRoute("/varadhi/item/$id")({
  loader: async ({ params }) => {
    try {
      const r = await getListingShareMeta({ data: { id: params.id } });
      return r.share;
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const url = `https://vaaradhi.mbrplatform.com/varadhi/item/${params.id}`;
    const share = loaderData as {
      title: string; price: number | null; unit: string | null;
      place: string; stock_status: string; post_type?: string;
    } | null;
    const amount = share ? formatAmount(share.price) : null;
    const unit = share?.unit === "కేజీలు" ? "కేజీ" : share?.unit;
    const priceText = share
      ? (isFreeListing(share) ? "ఉచిత సేవ" : amount ? `రేటు: Rs. ${amount}${unit ? ` / ${unit}` : ""}` : noPriceLabel(false))
      : "";
    const title = share
      ? `${priceText ? `${priceText} — ` : ""}${share.title} | వారధి`
      : "Item Details — Vaaradhi (వారధి) Local Marketplace";
    const desc = share
      ? `${share.place ? `📍 ${share.place} · ` : ""}వారధి స్థానిక మార్కెట్‌లో ఈ పోస్ట్ చూడండి — vaaradhi.mbrplatform.com`
      : "వారధిలో ఈ వస్తువు వివరాలు — ధర, ఫోటోలు, అమ్మకందారు సమాచారం మరియు సమీప రవాణా సౌకర్యాలు.";
    const image = `https://vaaradhi.mbrplatform.com/api/public/varadhi/item-image/${params.id}?v=4`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:image", content: image },
        { property: "og:image:secure_url", content: image },
        { property: "og:image:width", content: "800" },
        { property: "og:image:height", content: "800" },
        { property: "og:image:alt", content: share ? `${share.title} — వారధి పోస్ట్ ఫోటో` : "Vaaradhi (వారధి) logo" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
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
  if (!item) return <div className="p-6 text-center text-sm"><p>వస్తువు దొరకలేదు</p><PostModerationActions target={{ target_type: "listing", target_id: id }} unavailable /></div>;

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

      <PostModerationActions target={{ target_type: "listing", target_id: id }} onRemoved={() => setItem(null)} />
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
          <p className="text-xs font-semibold text-green-700">{isFreeListing(item) ? "ఉచిత సేవ" : priceLabel(item.category, item.sub_category ?? "")}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[#16a34a]">
            {amount ? `Rs. ${amount}${unit ? ` / ${unit}` : ""}` : serviceChargeText(item as any) ?? noPriceLabel(isFreeListing(item))}
          </p>
        </div>


        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${inStock ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
            {isFreeListing(item) && item.sub_category === "blood" ? bloodStatusLabel(item.unit, inStock) : stockLabel(inStock, isServiceListing(item as any))}
          </span>
          {(item as any).stock_qty && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1e3a8a]">
              స్టాక్: {(item as any).stock_qty}{unit ? ` ${unit}` : ""}
            </span>
          )}
          {item.sub_category && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#f97316]">{item.sub_category}</span>
          )}
          {isFreeListing(item) && item.sub_category === "blood" && (
            <>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-machine-lettering ${
                bloodNeedOf(item.unit) === BLOOD_DONOR ? "bg-blood-donor" : "bg-blood-wanted"
              }`}>{bloodNeedOf(item.unit)}</span>
              {(item as any).blood_group && (
                <span className="rounded-full bg-blood-wanted/10 px-2.5 py-1 text-[11px] font-bold text-blood-wanted">🩸 {(item as any).blood_group}</span>
              )}
            </>
          )}
        </div>

        <dl className="mt-1 divide-y divide-black/5 text-sm">
          {serviceDetailRows(item as any).map((row) => (
            <div key={row.label} className="flex justify-between gap-3 py-1.5">
              <dt className="shrink-0 text-[#1e3a8a]/60">{row.label}</dt>
              <dd className="text-right font-medium break-words">{row.value}</dd>
            </div>
          ))}
          {place && (
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-[#1e3a8a]/60">📍 ప్రాంతం</dt><dd className="text-right font-medium">{place}</dd>
            </div>
          )}
          {(item as any).pickup_location && (
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-[#1e3a8a]/60">{isFreeListing(item) && item.sub_category === "blood" ? bloodPlaceLabel(item.unit) : "దొరుకు చోటు"}</dt><dd className="text-right font-medium">{(item as any).pickup_location}</dd>
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
          <p className="text-xs text-[#1e3a8a]/60">{isFreeListing(item) && item.sub_category === "blood" ? bloodPosterLabel(item.unit) : "అమ్మకందారు"}</p>
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
              // Share only the link: WhatsApp builds one card (photo + price, logo strip, link)
              // from the page's preview tags, so repeating the details would duplicate it.
              const text = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
              if (typeof navigator !== "undefined" && (navigator as any).share) {
                (navigator as any).share({ text }).catch(() => {
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
