import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyVaradhiProfile } from "@/lib/varadhi.functions";
import { CreditCard, Handshake, Gift, LogOut } from "lucide-react";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export const Route = createFileRoute("/varadhi/profile")({
  head: () => ({
    meta: [
      { title: "నా ప్రొఫైల్ — Vaaradhi" },
      { name: "description", content: "Vaaradhi profile: subscription, renewal and partner referral dashboard." },
      { property: "og:title", content: "నా ప్రొఫైల్ — Vaaradhi" },
      { property: "og:description", content: "Vaaradhi profile: subscription, renewal and partner referral dashboard." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VaradhiProfilePage,
});

function VaradhiProfilePage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const [p, setP] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      try { const r = await getProfile(); setP(r.profile); } catch { /* ignore */ }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <p className="p-6 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8 space-y-3">
      <h1 className="text-xl font-bold text-[#1e3a8a]">నా ప్రొఫైల్</h1>

      <div className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b5bdb] p-4 text-white shadow">
        <p className="text-base font-semibold">{p?.full_name || "వినియోగదారు"}</p>
        <p className="mt-0.5 text-[11px] opacity-90">
          {[p?.occupation, p?.village || p?.city, p?.mandal, p?.district].filter(Boolean).join(" • ") || "వివరాలు లేవు"}
        </p>
        {p?.verification_status && (
          <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold">
            Status: {p.verification_status}
          </span>
        )}
        <p className="mt-2 text-[10px] opacity-80">
          రిజిస్ట్రేషన్ వివరాలు మార్చాలంటే “అప్‌డేట్ బోర్డు”లో చూడండి.
        </p>
      </div>

      <Link to="/varadhi/subscription"
        className="flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-3 text-white font-semibold shadow">
        <CreditCard className="h-4 w-4" /> సబ్‌స్క్రిప్షన్ & రిన్యూవల్
      </Link>

      <Link to="/varadhi/partner"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#0d9488] px-4 py-3 text-white font-semibold shadow">
        <Handshake className="h-4 w-4" /> పార్ట్‌నర్ డాష్‌బోర్డ్ (రెఫరల్ & కమిషన్)
      </Link>

      <Link to="/varadhi/rewards"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#dc2626] px-4 py-3 text-white font-semibold shadow">
        <Gift className="h-4 w-4" /> బహుమతులు & పాయింట్లు
      </Link>

      <button
        onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/varadhi/auth" }); }}
        className="flex w-full items-center gap-2 rounded-xl border border-[#1e3a8a]/15 bg-white px-4 py-3 text-sm font-semibold text-[#1e3a8a]">
        <LogOut className="h-4 w-4" /> లాగ్ అవుట్
      </button>

      <DeleteAccountButton redirectTo="/varadhi" />
    </div>
  );
}
