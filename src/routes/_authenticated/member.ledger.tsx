import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getMyLedger } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/member/ledger")({
  head: () => ({ meta: [{ title: "My Statement — MBR App" }] }),
  component: MemberLedger,
});

function MemberLedger() {
  const fetchLedger = useServerFn(getMyLedger);
  const q = useQuery({ queryKey: ["my-ledger"], queryFn: () => fetchLedger() });
  const d = q.data;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-12">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/member/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        <Card className="p-4 bg-zinc-950 border-zinc-800">
          <h1 className="text-xl font-bold">ఆర్థిక వివరాలు / My Statement</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            విచ్చుకున్నది (Received) and పుచ్చుకున్నది (Repayments)
          </p>
        </Card>

        {q.isLoading && <p className="text-zinc-400 text-sm">Loading…</p>}

        {d && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Received" te="మొత్తం తీసుకున్నది" value={d.totals.received} accent="#fbbf24" />
              <Stat label="Total Repaid" te="మొత్తం చెల్లించినది" value={d.totals.repaid} accent="#34d399" />
              <Stat label="Outstanding" te="బాకీ" value={d.totals.balance} accent="#ff8c28" />
            </div>

            <Card className="bg-zinc-950 border-zinc-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="text-left p-2">తేది</th>
                    <th className="text-left p-2">రకం</th>
                    <th className="text-right p-2">అసలు</th>
                    <th className="text-right p-2">వడ్డీ</th>
                    <th className="text-right p-2">మొత్తం</th>
                    <th className="text-left p-2">గమనిక</th>
                  </tr>
                </thead>
                <tbody>
                  {d.entries.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No transactions yet</td></tr>
                  )}
                  {d.entries.map((e, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="p-2 whitespace-nowrap">{e.date}</td>
                      <td className="p-2">
                        {e.type === "received" ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <ArrowDownCircle className="h-3.5 w-3.5" /> విచ్చుకున్నది
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <ArrowUpCircle className="h-3.5 w-3.5" /> పుచ్చుకున్నది
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{fmt(e.principal)}</td>
                      <td className="p-2 text-right">{fmt(e.interest)}</td>
                      <td className="p-2 text-right font-semibold">{fmt(e.amount)}</td>
                      <td className="p-2 text-zinc-400 truncate max-w-[180px]">{e.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (!n) return "—";
  return `₹ ${n.toLocaleString("en-IN")}`;
}

function Stat({ label, te, value, accent }: { label: string; te: string; value: number; accent: string }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800 p-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-[10px] text-zinc-500">{te}</p>
      <p className="text-lg font-bold mt-1" style={{ color: accent }}>₹ {value.toLocaleString("en-IN")}</p>
    </Card>
  );
}
