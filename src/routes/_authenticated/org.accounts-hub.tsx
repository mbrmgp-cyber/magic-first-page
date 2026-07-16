import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Wallet, PieChart, Coins, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CurrencySelector } from "@/lib/currency-context";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/org/accounts-hub")({
  head: () => ({ meta: [{ title: "Accounts Hub / అకౌంట్స్ బాక్స్" }] }),
  component: () => <RoleGate need="accounts"><AccountsHub /></RoleGate>,
});

const TILES = [
  { to: "/org/loan-requests", en: "Member Loan Requests", te: "సభ్యుల అప్పు అభ్యర్థనలు", icon: Wallet, color: "#ff8c28" },
  { to: "/org/cashflow", en: "Society Cash Flow Statement", te: "నగదు ప్రవాహ నివేదిక", icon: PieChart, color: "#3b82f6" },
  { to: "/org/accounts", en: "Currency & Loan Entry", te: "కరెన్సీ & అప్పు నమోదు", icon: Coins, color: "#eab308" },
  { to: "/org/bank-details", en: "Society Bank Details", te: "సొసైటీ బ్యాంక్ వివరాలు", icon: Building2, color: "#06b6d4" },
] as const;

function AccountsHub() {
  const { lang } = useI18n();
  const lt = (en: string, te: string) => lang === "te" ? te : en;

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/org/dashboard" className="p-2 rounded-lg hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{lt("Accounts Hub", "ఖాతాల కేంద్రం")}</h1>
              <p className="text-xs text-white/60">{lt("Central navigation for all financial tasks", "అన్ని ఆర్థిక పనుల కోసం కేంద్ర నావిగేషన్")}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase tracking-wide text-white/50">{lt("Base Currency", "బేస్ కరెన్సీ")}</span>
            <CurrencySelector />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
            >
              <Card
                className="p-4 bg-zinc-950 border-white/10 hover:border-[#ff8c28] transition-all cursor-pointer h-full"
                style={{ boxShadow: `0 0 0 transparent` }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 24px ${t.color}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ``; }}
              >
                <div className="flex flex-col items-center text-center gap-2 py-2">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border"
                    style={{ background: `${t.color}1f`, borderColor: `${t.color}66` }}
                  >
                    <t.icon className="w-6 h-6" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-white">{lt(t.en, t.te)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-[11px] text-white/40 pt-2">
          {lt("Tap any tile to open the detailed module.", "వివరమైన మాడ్యూల్ తెరవడానికి ఏదైనా టైల్ నొక్కండి.")}
        </p>
      </div>
    </div>
  );
}
