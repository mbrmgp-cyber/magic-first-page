import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Gavel, TrendingDown, Wallet, Percent, Users, Plus, X, Trophy,
  Lock, RotateCcw, PartyPopper,
} from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { listApprovedMembers } from "@/lib/members.functions";
import { getMyRoles } from "@/lib/org.functions";

export const Route = createFileRoute("/_authenticated/org/auction")({
  head: () => ({ meta: [{ title: "Live Chit Auction — MBR App" }] }),
  component: AuctionRoom,
});

type MemberLite = { id: string; name: string };
type BidEntry = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  submittedAt: number;
};

function AuctionRoom() {
  const { fmt, symbol } = useCurrency();
  const fetchMembers = useServerFn(listApprovedMembers);
  const fetchRoles = useServerFn(getMyRoles);

  const { data: memberData } = useQuery({
    queryKey: ["approved-members-auction"],
    queryFn: () => fetchMembers({}),
  });
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const isAdmin = rolesQ.data?.roles?.includes("mbr_admin") ?? false;
  const allMembers: MemberLite[] = memberData?.members ?? [];

  // Chit group participant selection
  const [participants, setParticipants] = useState<MemberLite[]>([]);
  const [pickerValue, setPickerValue] = useState<string>("");

  const addParticipant = () => {
    if (!pickerValue) return;
    const m = allMembers.find((x) => x.id === pickerValue);
    if (!m || participants.some((p) => p.id === m.id)) {
      setPickerValue("");
      return;
    }
    setParticipants((prev) => [...prev, m]);
    setPickerValue("");
  };
  const removeParticipant = (id: string) =>
    setParticipants((prev) => prev.filter((p) => p.id !== id));

  // Bidding inputs
  const [chitValue, setChitValue] = useState<number>(100000);
  const [totalMonths, setTotalMonths] = useState<number>(20);
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [commissionPct, setCommissionPct] = useState<number>(5);
  const [bid, setBid] = useState<number>(0);
  const [activeBidder, setActiveBidder] = useState<string>("");

  // Live bids
  const [bids, setBids] = useState<BidEntry[]>([]);

  const calc = useMemo(() => {
    const cv = Math.max(0, Number(chitValue) || 0);
    const b = Math.max(0, Number(bid) || 0);
    const commission = (cv * (Number(commissionPct) || 0)) / 100;
    const loss = b;
    const net = Math.max(0, cv - b - commission);
    const remaining = Math.max(
      1,
      (Number(totalMonths) || 1) - (Number(currentMonth) || 1) + 1,
    );
    const monthlyPct = net > 0 ? (loss / remaining) / net * 100 : 0;
    const annualPct = monthlyPct * 12;
    const maxBid = cv * 0.4;
    const overCap = b > maxBid;
    return { commission, loss, net, remaining, monthlyPct, annualPct, maxBid, overCap };
  }, [chitValue, bid, commissionPct, totalMonths, currentMonth]);

  const sortedBids = useMemo(
    () => [...bids].sort((a, b) => b.amount - a.amount || a.submittedAt - b.submittedAt),
    [bids],
  );
  const topBidId = sortedBids[0]?.id;

  const submitBid = () => {
    if (!activeBidder || !bid || calc.overCap) return;
    const m = participants.find((p) => p.id === activeBidder);
    if (!m) return;
    setBids((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        memberId: m.id,
        memberName: m.name,
        amount: bid,
        submittedAt: Date.now(),
      },
    ]);
    setBid(0);
  };

  const clearBids = () => setBids([]);

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

        {/* Participant Selection Panel */}
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-amber-400" />
              <h2 className="font-semibold">Chit Group Members</h2>
              <Badge variant="secondary" className="text-xs">
                {participants.length} selected
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              సభ్యులను ఎంచుకోండి (10–20)
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={pickerValue} onValueChange={setPickerValue}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a member to add…" />
              </SelectTrigger>
              <SelectContent>
                {allMembers
                  .filter((m) => !participants.some((p) => p.id === m.id))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                {allMembers.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No approved members found.
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button onClick={addParticipant} disabled={!pickerValue} className="gap-1">
              <Plus className="size-4" /> Add
            </Button>
          </div>

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {participants.map((p, i) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs"
                >
                  <span className="text-amber-400 font-semibold">#{i + 1}</span>
                  <span>{p.name}</span>
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="ml-0.5 opacity-60 hover:opacity-100"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Bidding area */}
          <Card className="lg:col-span-3 p-4 md:p-6 space-y-4 bg-card">
            <h2 className="font-semibold flex items-center gap-2">
              <Gavel className="size-4" /> Bidding Area / బిడ్డింగ్
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Chit Value</Label>
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
              <Label className="text-xs">Bidding Member</Label>
              <Select value={activeBidder} onValueChange={setActiveBidder}>
                <SelectTrigger>
                  <SelectValue placeholder={participants.length ? "Choose bidder…" : "Add participants first"} />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="text-sm font-semibold text-amber-400 pt-1">
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
              <Button
                onClick={submitBid}
                className="w-full h-12 text-base font-bold mt-2"
                disabled={!bid || calc.overCap || !activeBidder}
              >
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
              💡 Tip: లాస్ ఎక్కువ ఇస్తే మీకు తక్కువ అమౌంట్ వస్తుంది, వడ్డీ శాతం పెరుగుతుంది.
            </div>
          </Card>
        </div>

        {/* Live Bids Activity Table */}
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <h2 className="font-semibold">Live Bids Activity</h2>
              <Badge variant="secondary" className="text-xs">{bids.length}</Badge>
            </div>
            {bids.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearBids} className="text-xs">
                Clear All
              </Button>
            )}
          </div>

          {sortedBids.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No bids yet. Submit the first bid to start the auction.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Bid Amount</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBids.map((b, i) => {
                  const isTop = b.id === topBidId;
                  return (
                    <TableRow
                      key={b.id}
                      className={isTop ? "bg-amber-500/10 hover:bg-amber-500/15" : ""}
                    >
                      <TableCell className="font-semibold">
                        {isTop ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <Trophy className="size-3.5" />1
                          </span>
                        ) : (
                          i + 1
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{b.memberName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {b.memberId.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold tabular-nums ${isTop ? "text-amber-400" : ""}`}>
                        {fmt(b.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {new Date(b.submittedAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
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
