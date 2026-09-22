import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRewards } from "@/lib/varadhi.functions";
import { ArrowLeft, Gift } from "lucide-react";

export const Route = createFileRoute("/varadhi/rewards")({
  head: () => ({
    meta: [
      { title: "Vaaradhi Reward Points — Earn & Redeem | MBR Platform" },
      {
        name: "description",
        content: "వారధిలో పాయింట్లు సంపాదించండి, చరిత్ర చూడండి మరియు బహుమతులుగా వాడుకోండి.",
      },
      { property: "og:title", content: "Vaaradhi Reward Points" },
      { property: "og:description", content: "వారధిలో పాయింట్లు సంపాదించండి మరియు బహుమతులుగా వాడుకోండి." },
      { property: "og:url", content: "https://mbrplatform.com/varadhi/rewards" },
    ],
    links: [{ rel: "canonical", href: "https://mbrplatform.com/varadhi/rewards" }],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const fetchR = useServerFn(getMyRewards);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetchR().then((r) => { setTotal(r.total); setRows(r.rewards); }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/varadhi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold text-[#1e3a8a]">బహుమతులు</h1>
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#dc2626] p-5 text-white shadow-md text-center">
        <Gift className="h-8 w-8 mx-auto opacity-90" />
        <p className="mt-2 text-xs opacity-90">నా పాయింట్స్</p>
        <p className="text-4xl font-bold">{total}</p>
        <button className="mt-3 rounded-xl bg-white text-[#f97316] px-4 py-2 text-sm font-bold">
          పాయింట్లు వాడండి
        </button>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-[#1e3a8a]/80">చరిత్ర</h2>
      <div className="mt-2 space-y-2">
        {rows.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఇంకా పాయింట్స్ లేవు</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-3 shadow-sm text-xs flex justify-between">
            <span>{r.source}</span>
            <span className={r.points >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {r.points >= 0 ? "+" : ""}{r.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
