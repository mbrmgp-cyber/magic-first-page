import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, HandCoins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getMyLedger } from "@/lib/accounts.functions";
import { useI18n, bi } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/member/ledger")({
  head: () => ({ meta: [{ title: "My Statement — MBR App" }] }),
  component: MemberLedger,
});

function MemberLedger() {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const b = (te: string, en: string) => bi(te, en, lang);
  const fetchLedger = useServerFn(getMyLedger);
  const q = useQuery({ queryKey: ["my-ledger"], queryFn: () => fetchLedger() });
  const d = q.data;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-12" translate="no">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/member/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> {b("డాష్‌బోర్డ్", "Dashboard")}
        </Link>

        <Card className="p-4 bg-zinc-950 border-zinc-800">
          <h1 className="text-xl font-bold">{b("ఆర్థిక వివరాలు", "My Statement")}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {b("విచ్చుకున్నది", "Received")} {b("మరియు", "and")} {b("పుచ్చుకున్నది", "Repayments")}
          </p>
        </Card>

        {q.isLoading && <p className="text-zinc-400 text-sm">{b("లోడ్ అవుతోంది…", "Loading…")}</p>}

        {d && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label={b("మొత్తం తీసుకున్నది", "Total Received")} value={d.totals.received} accent="#fbbf24" sym={sym} />
              <Stat label={b("మొత్తం చెల్లించినది", "Total Repaid")} value={d.totals.repaid} accent="#34d399" sym={sym} />
              <Stat label={b("బాకీ", "Outstanding")} value={d.totals.balance} accent="#ff8c28" sym={sym} />
            </div>

            <Card className="bg-zinc-950 border-zinc-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="text-left p-2">{b("తేది", "Date")}</th>
                    <th className="text-left p-2">{b("రకం", "Type")}</th>
                    <th className="text-right p-2">{b("అసలు", "Principal")}</th>
                    <th className="text-right p-2">{b("వడ్డీ", "Interest")}</th>
                    <th className="text-right p-2">{b("మొత్తం", "Amount")}</th>
                    <th className="text-left p-2">{b("గమనిక", "Note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.entries.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-zinc-500">{b("లావాదేవీలు లేవు", "No transactions yet")}</td></tr>
                  )}
                  {d.entries.map((e, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="p-2 whitespace-nowrap">{e.date}</td>
                      <td className="p-2">
                        {e.type === "received" ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <ArrowDownCircle className="h-3.5 w-3.5" /> {b("విచ్చుకున్నది", "Received")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <ArrowUpCircle className="h-3.5 w-3.5" /> {b("పుచ్చుకున్నది", "Repaid")}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{fmt(e.principal, sym)}</td>
                      <td className="p-2 text-right">{fmt(e.interest, sym)}</td>
                      <td className="p-2 text-right font-semibold">{fmt(e.amount, sym)}</td>
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

function fmt(n: number, sym: string) {
  if (!n) return "—";
  return `${sym} ${n.toLocaleString("en-IN")}`;
}

function Stat({ label, value, accent, sym }: { label: string; value: number; accent: string; sym: string }) {
  const text = `${sym} ${value.toLocaleString("en-IN")}`;
  const len = text.length;
  const sizeClass = len > 14 ? "text-[11px]" : len > 11 ? "text-xs" : len > 9 ? "text-sm" : "text-lg";
  return (
    <Card className="bg-zinc-950 border-zinc-800 p-3 overflow-hidden">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400 truncate">{label}</p>
      <p
        className={`${sizeClass} font-bold mt-1 leading-tight tabular-nums break-all`}
        style={{ color: accent }}
      >
        {text}
      </p>
    </Card>
  );
}
