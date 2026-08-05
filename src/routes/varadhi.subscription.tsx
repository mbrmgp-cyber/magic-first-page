import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMySubscriptions, createSubscription, getSubscriptionReceipt } from "@/lib/varadhi.functions";
import { printVaradhiReceipt } from "@/lib/varadhi-receipt";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/varadhi/subscription")({
  component: SubscriptionPage,
});

const PLANS: Array<{ id: "1m" | "3m" | "6m" | "1y"; te: string; amt: number; best?: boolean }> = [
  { id: "1m", te: "1 నెల", amt: 300 },
  { id: "3m", te: "3 నెలలు", amt: 800 },
  { id: "6m", te: "6 నెలలు", amt: 1500 },
  { id: "1y", te: "1 సంవత్సరం", amt: 2500, best: true },
];

function SubscriptionPage() {
  const fetchSubs = useServerFn(listMySubscriptions);
  const create = useServerFn(createSubscription);
  const [subs, setSubs] = useState<any[]>([]);

  const load = async () => setSubs((await fetchSubs()).subscriptions);
  useEffect(() => { load(); }, []);

  const buy = async (plan: "1m" | "3m" | "6m" | "1y") => {
    try {
      await create({ data: { plan } });
      toast.success("పేమెంట్ కోసం Admin కి request పంపబడింది");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const active = subs.find((s) => s.status === "active" && new Date(s.expires_at) > new Date());

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi/dashboard" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">సబ్‌స్క్రిప్షన్</h1>
      </div>

      {active && (
        <div className="mt-3 rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800">
          ✓ Active — {active.plan} · Expires {new Date(active.expires_at).toLocaleDateString()}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {PLANS.map((p) => (
          <button key={p.id} onClick={() => buy(p.id)}
            className={`w-full flex items-center justify-between rounded-2xl border-2 p-4 text-left ${
              p.best ? "border-[#f97316] bg-orange-50" : "border-[#1e3a8a]/10 bg-white"
            }`}>
            <div>
              <p className="font-semibold text-[#1e3a8a]">{p.te}</p>
              {p.best && <p className="text-[10px] text-[#f97316] font-bold">✓ ఉత్తమ విలువ</p>}
            </div>
            <span className="text-lg font-bold text-[#16a34a]">Rs. {p.amt}</span>
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">నా చెల్లింపు చరిత్ర</h2>
      <div className="mt-2 space-y-2">
        {subs.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఏ చెల్లింపు లేదు</p>}
        {subs.map((s) => (
          <div key={s.id} className="rounded-xl bg-white p-3 shadow-sm text-xs flex justify-between">
            <div>
              <p className="font-semibold">{s.plan} · Rs. {s.amount}</p>
              <p className="text-[#1e3a8a]/60">Expires {new Date(s.expires_at).toLocaleDateString()}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              s.status === "active" ? "bg-green-100 text-green-700" :
              s.status === "expired" ? "bg-gray-200 text-gray-600" :
              "bg-yellow-100 text-yellow-800"
            }`}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
