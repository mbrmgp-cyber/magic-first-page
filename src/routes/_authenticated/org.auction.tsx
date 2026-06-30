import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gavel, TrendingDown, Wallet, Percent } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/org/auction")({
  head: () => ({ meta: [{ title: "Live Chit Auction — MBR App" }] }),
  component: AuctionRoom,
});

function AuctionRoom() {
  const { fmt, symbol } = useCurrency();
  const [chitValue, setChitValue] = useState<number>(100000);
  const [totalMonths, setTotalMonths] = useState<number>(20);
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [commissionPct, setCommissionPct] = useState<number>(5);
  const [bid, setBid] = useState<number>(0);

  const calc = useMemo(() => {
    const cv = Math.max(0, Number(chitValue) || 0);
    const b = Math.max(0, Number(bid) || 0);
    const commission = (cv * (Number(commissionPct) || 0)) / 100;
    const loss = b; // discount given up by the winner
    const net = Math.max(0, cv - b - commission);
    const remaining = Math.max(1, (Number(totalMonths) || 1) - (Number(currentMonth) || 1) + 1);
    // Effective monthly interest rate that this discount costs the borrower
    // monthly cost ≈ loss / remaining months; rate = monthlyCost / net * 100
    const monthlyPct = net > 0 ? (loss / remaining) / net * 100 : 0;
    const annualPct = monthlyPct * 12;
    const maxBid = cv * 0.4; // chit fund cap (40%)
    const overCap = b > maxBid;
    return { commission, loss, net, remaining, monthlyPct, annualPct, maxBid, overCap };
  }, [chitValue, bid, commissionPct, totalMonths, currentMonth]);

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0a0a0a)] text-foreground p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/org/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Gavel className="size-7 text-amber-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Live Online Chit Auction</h1>
            <p className="text-xs text-muted-foreground">లైవ్ చిట్ ఆక్షన్ రూమ్</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Bidding area */}
          <Card className="lg:col-span-3 p-4 md:p-6 space-y-4 bg-card">
            <h2 className="font-semibold flex items-center gap-2">
              <Gavel className="size-4" /> Bidding Area / బిడ్డింగ్
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Chit Value / చిట్ విలువ</Label>
                <Input type="number" inputMode="decimal" value={chitValue}
                  onChange={(e) => setChitValue(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Foreman Commission %</Label>
                <Input type="number" inputMode="decimal" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Months</Label>
                <Input type="number" inputMode="numeric" value={totalMonths}
                  onChange={(e) => setTotalMonths(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Month</Label>
                <Input type="number" inputMode="numeric" value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm font-semibold text-amber-400">
                Your Challenge / Bid Amount (సవాలు)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={bid || ""}
                onChange={(e) => setBid(Number(e.target.value))}
                placeholder={`${symbol} 0`}
                className="text-2xl font-bold h-14"
              />
              {calc.overCap && (
                <p className="text-xs text-red-400">
                  ⚠️ Bid exceeds typical 40% cap (max {fmt(calc.maxBid)})
                </p>
              )}
              <Button className="w-full h-12 text-base font-bold mt-2" disabled={!bid || calc.overCap}>
                Submit Bid / బిడ్ సమర్పించండి
              </Button>
            </div>
          </Card>

          {/* Live Calculator Widget */}
          <Card className="lg:col-span-2 p-4 md:p-5 space-y-4 bg-gradient-to-b from-zinc-900 to-black border-amber-500/30">
            <div>
              <h2 className="font-bold text-amber-400 flex items-center gap-2">
                <Percent className="size-4" /> Live Interest & Loss Calculator
              </h2>
              <p className="text-[11px] text-muted-foreground">పడిన వడ్డీ & నష్టం లెక్క</p>
            </div>

            <MetricRow
              icon={<TrendingDown className="size-5 text-red-400" />}
              label="Total Loss"
              sub="నష్టపోయిన అమౌంట్"
              value={fmt(calc.loss)}
              tone="loss"
            />
            <MetricRow
              icon={<Wallet className="size-5 text-emerald-400" />}
              label="Net Received"
              sub="వచ్చిన అమౌంట్"
              value={fmt(calc.net)}
              tone="gain"
              hint={`After ${commissionPct}% commission (${fmt(calc.commission)})`}
            />
            <MetricRow
              icon={<Percent className="size-5 text-amber-400" />}
              label="Effective Interest"
              sub="పడిన వడ్డీ శాతం"
              value={`${calc.monthlyPct.toFixed(2)}% / month`}
              tone="rate"
              hint={`≈ ${calc.annualPct.toFixed(2)}% per year • over ${calc.remaining} months`}
            />

            <div className="text-[11px] text-muted-foreground border-t border-border pt-3 leading-relaxed">
              💡 Tip: లాస్ ఎక్కువ ఇస్తే మీకు తక్కువ అమౌంట్ వస్తుంది, వడ్డీ శాతం పెరుగుతుంది. తెలివిగా బిడ్ చేయండి.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  icon, label, sub, value, tone, hint,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  tone: "loss" | "gain" | "rate";
  hint?: string;
}) {
  const toneClass =
    tone === "loss" ? "text-red-400" : tone === "gain" ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="rounded-lg border border-border bg-black/40 p-3 flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-500">{sub}</p>
        <p className={`mt-1 text-lg font-bold tabular-nums ${toneClass} truncate`}>{value}</p>
        {hint && <p className="text-[10px] text-zinc-500 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
