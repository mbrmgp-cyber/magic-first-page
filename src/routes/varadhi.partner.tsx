import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Wallet, Users, TrendingUp, Clock, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { getMyPartnerDashboard, requestPartnerPayout } from "@/lib/varadhi-partner.functions";
import { PARTNER_LEVEL_LABEL } from "@/lib/varadhi-partner";

export const Route = createFileRoute("/varadhi/partner")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vaaradhi Partner Dashboard — Referrals & Earnings" },
      { name: "description", content: "Vaaradhi partner dashboard: track your area referrals, subscription commissions, wallet balance and weekly payout requests." },
      { property: "og:title", content: "Vaaradhi Partner Dashboard — Referrals & Earnings" },
      { property: "og:description", content: "Track referrals, commission earnings and weekly payouts as a Vaaradhi Mandal, District or State partner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerDashboard,
});

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

function PartnerDashboard() {
  const qc = useQueryClient();
  const fetchDash = useServerFn(getMyPartnerDashboard);
  const requestPayout = useServerFn(requestPartnerPayout);

  const q = useQuery({ queryKey: ["varadhi-partner-dash"], queryFn: () => fetchDash() });
  const d: any = q.data;

  if (q.isLoading) return <p className="p-8 text-center text-sm">లోడ్…</p>;

  if (!d?.partner) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-center space-y-3">
        <h1 className="text-lg font-bold text-[#1e3a8a]">పార్ట్‌నర్ డాష్‌బోర్డ్</h1>
        <p className="text-sm text-[#1e3a8a]/70">
          మీరు ఇంకా వారధి పార్ట్‌నర్ (మండల / జిల్లా / రాష్ట్ర ఇన్‌ఛార్జ్) కాదు.
          పార్ట్‌నర్ కావాలంటే అడ్మిన్‌ను సంప్రదించండి.
        </p>
        <Link to="/varadhi" className="inline-block rounded-xl bg-[#1e3a8a] px-6 py-2.5 text-white font-semibold">
          హోమ్
        </Link>
      </div>
    );
  }

  const p = d.partner;
  const t = d.totals;
  const level = PARTNER_LEVEL_LABEL[p.level as keyof typeof PARTNER_LEVEL_LABEL];

  const doRequest = async () => {
    try {
      await requestPayout({ data: {} });
      toast.success("పేఅవుట్ అభ్యర్థన పంపబడింది");
      qc.invalidateQueries({ queryKey: ["varadhi-partner-dash"] });
    } catch (e: any) {
      toast.error(e.message ?? "విఫలమైంది");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-24">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">పార్ట్‌నర్ డాష్‌బోర్డ్</h1>
      </div>

      <div className="mt-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] p-4 text-white">
        <p className="text-xs opacity-80">{level?.te} · {level?.en}</p>
        <p className="text-base font-bold">{p.full_name ?? "Partner"}</p>
        <p className="text-xs opacity-90">
          📍 {[p.mandal, p.district, p.state].filter(Boolean).join(", ")} · కమిషన్ {Number(p.commission_pct)}%
        </p>
        <button
          onClick={() => { navigator.clipboard?.writeText(p.referral_code); toast.success("కోడ్ కాపీ అయింది"); }}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/15 px-3 py-2 text-sm font-bold"
        >
          <span>రెఫరల్ కోడ్: {p.referral_code}</span>
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat icon={<Users className="h-4 w-4" />} label="రెఫరల్స్" value={String(t.referrals)} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="సబ్‌స్క్రిప్షన్లు" value={String(t.subscriptions)} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="మొత్తం ఆదాయం" value={money(t.earned)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="లాక్‌లో ఉన్నవి" value={money(t.locked)} />
      </div>

      <div className="mt-3 rounded-2xl border border-[#16a34a]/30 bg-green-50 p-4">
        <p className="text-xs text-green-800">వాలెట్ బ్యాలెన్స్ (విత్‌డ్రా చేయదగినది)</p>
        <p className="text-2xl font-extrabold text-[#16a34a]">{money(t.unlocked)}</p>
        <p className="mt-1 text-[11px] text-green-800/80">
          అభ్యర్థనలో: {money(t.requested)} · చెల్లించినది: {money(t.paid)}
        </p>
        <button
          disabled={!d.canRequest}
          onClick={doRequest}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-2.5 font-bold text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> వారానికి ఒకసారి పేఅవుట్ అభ్యర్థన
        </button>
        {!d.canRequest && (
          <p className="mt-1 text-center text-[10px] text-green-900/70">
            విత్‌డ్రా చేయదగిన మొత్తం లేదు లేదా ఈ వారం అభ్యర్థన ఇప్పటికే పంపారు.
          </p>
        )}
      </div>

      <h2 className="mt-5 text-sm font-semibold text-[#1e3a8a]/80">పేఅవుట్ చరిత్ర</h2>
      <div className="mt-2 space-y-2">
        {d.payouts.length === 0 && <p className="text-xs text-[#1e3a8a]/50">ఇంకా అభ్యర్థనలు లేవు</p>}
        {d.payouts.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm">
            <div>
              <p className="font-semibold">{money(r.amount)}</p>
              <p className="text-[#1e3a8a]/60">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              r.status === "paid" ? "bg-green-100 text-green-700" :
              r.status === "approved" ? "bg-blue-100 text-blue-700" :
              r.status === "rejected" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-800"}`}>{r.status}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-5 text-sm font-semibold text-[#1e3a8a]/80">ఆదాయ చరిత్ర</h2>
      <div className="mt-2 space-y-2">
        {d.commissions.length === 0 && <p className="text-xs text-[#1e3a8a]/50">ఇంకా ఆదాయం లేదు</p>}
        {d.commissions.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm">
            <div>
              <p className="font-semibold">{money(c.amount)} <span className="font-normal text-[#1e3a8a]/60">({c.pct}% of {money(c.base_amount)})</span></p>
              <p className="text-[#1e3a8a]/60">{new Date(c.created_at).toLocaleDateString()} · {c.level}</p>
            </div>
            <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
              {c.status === "pending" && new Date(c.unlock_at) > new Date() ? "locked" : c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[#1e3a8a]/60">{icon}<span className="text-[11px]">{label}</span></div>
      <p className="mt-1 text-base font-bold text-[#1e3a8a]">{value}</p>
    </div>
  );
}
