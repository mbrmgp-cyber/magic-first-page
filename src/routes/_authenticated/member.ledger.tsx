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
  const { fmtBase } = useCurrency();
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
            {b("ఇచ్చుకున్నది", "Received")} {b("మరియు", "and")} {b("పుచ్చుకున్నది", "Repayments")}
          </p>
        </Card>

        <Link
          to="/member/loan-request"
          className="flex items-center justify-between gap-3 rounded-xl p-4 border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <HandCoins className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{b("కొత్త అప్పు కోసం అభ్యర్థన", "Request a New Loan")}</p>
              <p className="text-[11px] text-white/60">{b("కార్యవర్గం ఆమోదం కోసం అభ్యర్థన పంపండి", "Apply — sent to committee for approval")}</p>
            </div>
          </div>
          <span className="text-amber-300 text-lg">→</span>
        </Link>

        {q.isLoading && <p className="text-zinc-400 text-sm">{b("లోడ్ అవుతోంది…", "Loading…")}</p>}

        {d && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label={b("మొత్తం తీసుకున్నది", "Total Received")} text={fmtBase(d.totals.received)} accent="#fbbf24" />
              <Stat label={b("మొత్తం చెల్లించినది", "Total Repaid")} text={fmtBase(d.totals.repaid)} accent="#34d399" />
              <Stat label={b("బాకీ", "Outstanding")} text={fmtBase(d.totals.balance)} accent="#ff8c28" />
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
                            <ArrowDownCircle className="h-3.5 w-3.5" /> {b("ఇచ్చుకున్నది", "Received")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <ArrowUpCircle className="h-3.5 w-3.5" /> {b("పుచ్చుకున్నది", "Repaid")}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{e.principal ? fmtBase(e.principal) : "—"}</td>
                      <td className="p-2 text-right">{e.interest ? fmtBase(e.interest) : "—"}</td>
                      <td className="p-2 text-right font-semibold">{e.amount ? fmtBase(e.amount) : "—"}</td>
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

function Stat({ label, text, accent }: { label: string; text: string; accent: string }) {
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
