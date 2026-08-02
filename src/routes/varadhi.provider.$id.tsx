import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProviders, logClick, type VaradhiProvider } from "@/lib/varadhi.functions";
import { useListingImage } from "@/lib/varadhi-image";
import { ArrowLeft, Phone, MessageCircle, Share2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/varadhi/provider/$id")({
  component: ProviderDetail,
});

function ProviderDetail() {
  const { id } = Route.useParams();
  const fetchAll = useServerFn(listProviders);
  const click = useServerFn(logClick);
  const [p, setP] = useState<VaradhiProvider | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [place, setPlace] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await fetchAll({});
      const found = r.providers.find((x) => x.id === id) ?? null;
      setP(found);
      if (found) {
        const { data } = await supabase
          .from("varadhi_profiles")
          .select("phone, village, mandal, district, state, pincode")
          .eq("user_id", found.user_id)
          .maybeSingle();
        setPhone((data as any)?.phone ?? found.contact_phone ?? null);
        const parts = [
          (data as any)?.village || found.city,
          (data as any)?.mandal,
          (data as any)?.district,
          (data as any)?.state,
        ].filter(Boolean);
        const pin = (data as any)?.pincode;
        setPlace(parts.join(", ") + (pin ? ` - ${pin}` : ""));
        click({ data: { target_type: "provider", target_id: id } }).catch(() => {});
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const photo = useListingImage((p as any)?.photo_url);

  if (!p) return <p className="p-6 text-center text-sm">లోడ్…</p>;
  const tel = phone ? `tel:${phone}` : "#";
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "#";

  const shareText = [
    `🚚 ${p.title}`,
    p.sub_type ? `వాహనం: ${p.sub_type}` : "",
    p.vehicle_details ? `వివరాలు: ${p.vehicle_details}` : "",
    place ? `📍 ${place}` : "",
    phone ? `📞 ${phone}` : "",
    typeof window !== "undefined" ? window.location.href : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shareWhatsApp = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: p.title, text: shareText });
        return;
      } catch {
        /* user cancelled → fall through to WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-[#1e3a8a] truncate">{p.title}</h1>
      </div>

      {photo ? (
        <img
          src={photo}
          alt={`${p.title} వాహనం ఫోటో`}
          className="mt-3 w-full aspect-video rounded-2xl object-cover bg-white"
        />
      ) : (
        <div className="mt-3 w-full aspect-video rounded-2xl bg-white flex flex-col items-center justify-center gap-1 text-[#1e3a8a]/50">
          <Truck className="h-14 w-14" />
          <span className="text-xs font-semibold">వాహనం ఫోటో లేదు</span>
        </div>
      )}

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#1e3a8a]/60 uppercase">{p.provider_type} · {p.sub_type}</p>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.availability_status === "online" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
            {p.availability_status === "online" ? "అందుబాటులో" : "ఖాళీ లేదు"}
          </span>
        </div>
        {p.description && <p className="text-sm">{p.description}</p>}
        {p.vehicle_details && <p className="text-xs text-[#1e3a8a]/70">🚚 {p.vehicle_details}</p>}
        {place && <p className="text-sm font-medium text-[#1e3a8a]">📍 {place}</p>}
        {p.service_areas && <p className="text-xs text-[#1e3a8a]/70">సర్వీస్ పరిధి: {p.service_areas}</p>}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <a href={tel} className="rounded-xl bg-[#16a34a] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <Phone className="h-4 w-4" /> కాల్
          </a>
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25d366] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="mt-2 w-full rounded-xl bg-[#1e3a8a] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1"
        >
          <Share2 className="h-4 w-4" /> షేర్ చేయండి
        </button>
      </div>
    </div>
  );
}
