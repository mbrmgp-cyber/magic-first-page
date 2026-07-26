import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProviders, logClick, type VaradhiProvider } from "@/lib/varadhi.functions";
import { ArrowLeft, Phone, MessageCircle } from "lucide-react";
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

  useEffect(() => {
    (async () => {
      const r = await fetchAll({});
      const found = r.providers.find((x) => x.id === id) ?? null;
      setP(found);
      if (found) {
        const { data } = await supabase.from("varadhi_profiles").select("phone").eq("user_id", found.user_id).maybeSingle();
        setPhone(data?.phone ?? null);
        click({ data: { target_type: "provider", target_id: id } }).catch(() => {});
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) return <p className="p-6 text-center text-sm">లోడ్…</p>;
  const tel = phone ? `tel:${phone}` : "#";
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "#";

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-[#1e3a8a]">{p.title}</h1>
      </div>
      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <p className="text-xs text-[#1e3a8a]/60 uppercase">{p.provider_type} · {p.sub_type}</p>
        {p.description && <p className="text-sm">{p.description}</p>}
        {p.vehicle_details && <p className="text-xs text-[#1e3a8a]/70">🚚 {p.vehicle_details}</p>}
        {p.service_areas && <p className="text-xs text-[#1e3a8a]/70">📍 {p.service_areas}</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <a href={tel} className="rounded-xl bg-[#16a34a] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <Phone className="h-4 w-4" /> కాల్
          </a>
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25d366] py-2.5 text-white text-sm font-semibold flex items-center justify-center gap-1">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
