import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
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
  Lock, RotateCcw, PartyPopper, Printer, CheckCircle2, ShieldCheck, Clock,
} from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { listApprovedMembers } from "@/lib/members.functions";
import { getMyRoles, getMyMembership, getMyOrg } from "@/lib/org.functions";
import { getAuctionState, saveAuctionState, submitAuctionConsent, type AuctionStateDTO } from "@/lib/auction.functions";
import { useSimRole } from "@/lib/rbac";
import { RoleGate } from "@/components/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/org/auction")({
  head: () => ({ meta: [{ title: "Live Chit Auction — MBR App" }] }),
  component: () => <RoleGate need="auction"><AuctionRoom /></RoleGate>,
});

type MemberLite = { id: string; name: string; member_code?: string | null };
type BidEntry = {
  id: string;
  memberId: string;
  memberName: string;
  memberCode?: string | null;
  amount: number;
  submittedAt: number;
};
type PastWinner = {
  month: number;
  memberId: string;
  memberCode?: string | null;
  memberName: string;
  amount: number;
  net: number;
  dividend: number;
  closedAt: number;
};
type Consent = {
  memberId: string;
  memberName: string;
  signatureTag: string;
  signedAt: number;
};

function AuctionRoom() {
  const { fmt, symbol } = useCurrency();
  const fetchMembers = useServerFn(listApprovedMembers);
  const fetchRoles = useServerFn(getMyRoles);
  const fetchMe = useServerFn(getMyMembership);
  const fetchMyOrg = useServerFn(getMyOrg);

  const { data: memberData } = useQuery({
    queryKey: ["approved-members-auction"],
    queryFn: () => fetchMembers({}),
  });
  const rolesQ = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchRoles() });
  const meQ = useQuery({ queryKey: ["my-membership"], queryFn: () => fetchMe() });
  const myOrgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchMyOrg() });
  const me: any = meQ.data?.membership;
  // Prefer org from membership; fall back to org owned by this user (org admin has no member row).
  const org: any = me?.organizations ?? myOrgQ.data?.org ?? null;

  const { role: simRole } = useSimRole();
  // Real admin = platform admin (mbr_admin role) OR the org's admin_user_id.
  const realAdmin =
    (rolesQ.data?.roles?.includes("mbr_admin") ?? false) ||
    (!!org?.admin_user_id && !!rolesQ.data?.userId && org.admin_user_id === rolesQ.data.userId);
  const isAdmin = realAdmin && (simRole === "super_admin" || simRole === "chit_admin");
  const allMembers: MemberLite[] = memberData?.members ?? [];

  const myCode = me?.member_code ?? "";
  const myName = me?.name ?? [me?.first_name, me?.last_name].filter(Boolean).join(" ");
  const myId = me?.id ?? "";

  // Chit group participant selection
  const [participants, setParticipants] = useState<MemberLite[]>([]);
  const [pickerValue, setPickerValue] = useState<string>("");

  // Chit filter (A / C / F / All) — extracts the letter prefix of member_code
  const [chitFilter, setChitFilter] = useState<string>("ALL");
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMembers) {
      const c = (m.member_code || "").trim();
      const letter = c.match(/^[A-Za-z]/)?.[0]?.toUpperCase();
      if (letter) set.add(letter);
    }
    return Array.from(set).sort();
  }, [allMembers]);

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
  const [chitGroupName, setChitGroupName] = useState<string>("Group A");
  const [chitValue, setChitValue] = useState<number>(100000);
  const [totalMonths, setTotalMonths] = useState<number>(20);
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [commissionPct, setCommissionPct] = useState<number>(5);
  const [bid, setBid] = useState<number>(0);
  const [activeBidder, setActiveBidder] = useState<string>("");

  // Live bids + turn timestamps
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [turnStart, setTurnStart] = useState<number | null>(null);
  const [turnEnd, setTurnEnd] = useState<number | null>(null);

  // Auction lifecycle
  const [auctionClosed, setAuctionClosed] = useState(false);
  const [winner, setWinner] = useState<BidEntry | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [consents, setConsents] = useState<Record<string, Consent>>({});
  const [groups, setGroups] = useState<NonNullable<AuctionStateDTO["groups"]>>([]);

  // ─────────── Realtime sync with admin (DB-backed) ───────────
  const orgId: string | undefined = me?.org_id;
  const loadState = useServerFn(getAuctionState);
  const saveState = useServerFn(saveAuctionState);
  const submitConsent = useServerFn(submitAuctionConsent);

  const hydratedRef = useRef(false);
  const lastRemoteJsonRef = useRef<string>("");
  const skipNextPushRef = useRef(false);

  const applyRemote = (s: AuctionStateDTO | null | undefined) => {
    if (!s) return;
    skipNextPushRef.current = true;
    if (typeof s.groupName === "string") setChitGroupName(s.groupName);
    if (typeof s.chitValue === "number") setChitValue(s.chitValue);
    if (typeof s.totalMonths === "number") setTotalMonths(s.totalMonths);
    if (typeof s.currentMonth === "number") setCurrentMonth(s.currentMonth);
    if (typeof s.commissionPct === "number") setCommissionPct(s.commissionPct);
    if (Array.isArray(s.participants)) setParticipants(s.participants);
    if (Array.isArray(s.bids)) setBids(s.bids);
    if (Array.isArray(s.pastWinners)) setPastWinners(s.pastWinners);
    if (s.consents && typeof s.consents === "object") setConsents(s.consents as any);
    if (Array.isArray(s.groups)) setGroups(s.groups);
    if (typeof s.auctionClosed === "boolean") setAuctionClosed(s.auctionClosed);
    setWinner(s.winner ?? null);
    setTurnStart(s.turnStart ?? null);
    setTurnEnd(s.turnEnd ?? null);
  };

  // Initial load + Supabase realtime subscription
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await loadState({ data: { orgId } });
        if (cancelled) return;
        if (res?.state) {
          lastRemoteJsonRef.current = JSON.stringify(res.state);
          applyRemote(res.state);
        }
      } catch (e) { /* ignore */ }
      hydratedRef.current = true;
    })();

    const channel = supabase
      .channel(`chit-auction-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chit_auctions", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const next = (payload.new?.state ?? null) as AuctionStateDTO | null;
          if (!next) return;
          const js = JSON.stringify(next);
          if (js === lastRemoteJsonRef.current) return;
          lastRemoteJsonRef.current = js;
          applyRemote(next);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Admin writes: push state whenever it changes (debounced)
  useEffect(() => {
    if (!orgId || !isAdmin || !hydratedRef.current) return;
    if (skipNextPushRef.current) { skipNextPushRef.current = false; return; }
    const snapshot: AuctionStateDTO = {
      groupName: chitGroupName,
      chitValue, totalMonths, currentMonth, commissionPct,
      participants, bids, pastWinners, consents,
      winner, auctionClosed, turnStart, turnEnd,
    };
    const js = JSON.stringify(snapshot);
    if (js === lastRemoteJsonRef.current) return;
    const t = setTimeout(async () => {
      try {
        lastRemoteJsonRef.current = js;
        await saveState({ data: { orgId, state: snapshot } });
      } catch (e: any) {
        console.error("Auction sync failed:", e?.message || e);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [
    orgId, isAdmin, chitGroupName, chitValue, totalMonths, currentMonth,
    commissionPct, participants, bids, pastWinners, consents, winner,
    auctionClosed, turnStart, turnEnd, saveState,
  ]);

  const startTurn = () => setTurnStart(Date.now());

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

  // Per-participant sequential bid timeline (rows = participants, cells = ordered bids)
  const perMember = useMemo(() => {
    const map: Record<string, BidEntry[]> = {};
    for (const p of participants) map[p.id] = [];
    for (const b of [...bids].sort((a, b) => a.submittedAt - b.submittedAt)) {
      if (!map[b.memberId]) map[b.memberId] = [];
      map[b.memberId].push(b);
    }
    return map;
  }, [bids, participants]);

  const maxCols = useMemo(() => {
    let m = 0;
    for (const k of Object.keys(perMember)) m = Math.max(m, perMember[k].length);
    return Math.max(m, 1);
  }, [perMember]);

  const winnerCalc = useMemo(() => {
    if (!winner) return null;
    const cv = Math.max(0, Number(chitValue) || 0);
    const commission = (cv * (Number(commissionPct) || 0)) / 100;
    const net = Math.max(0, cv - winner.amount - commission);
    const others = Math.max(1, participants.length - 1);
    const dividend = Math.max(0, (winner.amount - commission)) / others;
    return { commission, net, dividend, others };
  }, [winner, chitValue, commissionPct, participants.length]);

  const submitBid = () => {
    if (auctionClosed) return;
    if (!activeBidder || !bid || calc.overCap) return;
    const m = participants.find((p) => p.id === activeBidder);
    if (!m) return;
    if (!turnStart) setTurnStart(Date.now());
    setBids((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        memberId: m.id,
        memberName: m.name,
        memberCode: m.member_code ?? null,
        amount: bid,
        submittedAt: Date.now(),
      },
    ]);
    setBid(0);
  };

  const clearBids = () => { setBids([]); setTurnStart(null); setTurnEnd(null); };

  const finalizeAuction = () => {
    if (sortedBids.length === 0) return;
    const w = sortedBids[0];
    setWinner(w);
    setAuctionClosed(true);
    setTurnEnd(Date.now());
    setWinnerOpen(true);
    const cv = Math.max(0, Number(chitValue) || 0);
    const commission = (cv * (Number(commissionPct) || 0)) / 100;
    const net = Math.max(0, cv - w.amount - commission);
    const others = Math.max(1, participants.length - 1);
    const dividend = Math.max(0, (w.amount - commission)) / others;
    setPastWinners((prev) => [
      ...prev.filter((p) => p.month !== currentMonth),
      {
        month: currentMonth, memberId: w.memberId, memberCode: w.memberCode,
        memberName: w.memberName, amount: w.amount, net, dividend, closedAt: Date.now(),
      },
    ]);
  };

  const resetAuction = () => {
    setBids([]);
    setWinner(null);
    setAuctionClosed(false);
    setBid(0);
    setActiveBidder("");
    setTurnStart(null);
    setTurnEnd(null);
    setCurrentMonth((m) => m + 1);
  };

  const giveConsent = async () => {
    if (!myId || !auctionClosed || !orgId) return;
    const tag = `e-sig:${(myCode || myId.slice(0, 6)).toString()}:${Date.now().toString(36)}`;
    // Optimistic local update for the signer
    setConsents((prev) => ({
      ...prev,
      [myId]: { memberId: myId, memberName: myName || "Member", signatureTag: tag, signedAt: Date.now() },
    }));
    try {
      const res = await submitConsent({ data: { orgId, signatureTag: tag } });
      if (res?.state?.consents) {
        skipNextPushRef.current = true;
        setConsents(res.state.consents as any);
        lastRemoteJsonRef.current = JSON.stringify({ ...res.state });
      }
      toast.success("నాకు సమ్మతము — Consent recorded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit consent");
    }
  };

  const myConsent = consents[myId];

  // PDF / Print
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgRegNo = org?.gov_reg_number || "";
  const orgPhone = org?.phone || "";
  const orgEmail = org?.email || "";
  const orgPresident = org?.president_name || "";

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0a0a0a)] text-foreground p-4 md:p-6">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-area, .print-area * { color: #000 !important; }
          .print-area { background: #fff !important; padding: 24px; }
          .print-page { page-break-after: always; }
        }
        @media screen { .print-only { display: none; } }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-4 no-print">
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
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">C H S Live Online Chit Auction</h1>
            <p className="text-xs text-muted-foreground">లైవ్ చిట్ ఆక్షన్ రూమ్</p>
          </div>
        </div>

        {/* Logged-in Member Info */}
        {me && (
          <Card className="p-3 md:p-4 bg-card flex items-center gap-3 flex-wrap">
            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs">
              {myCode || "—"}
            </Badge>
            <span className="font-semibold text-sm">{myName || "Member"}</span>
            <span className="text-[11px] text-muted-foreground">Logged-in Member · లాగిన్ సభ్యుడు</span>
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="opacity-80">Chit Filters:</span>
              {(["ALL", ...availableLetters]).map((l) => (
                <button
                  key={l}
                  onClick={() => setChitFilter(l)}
                  className={`size-7 rounded-md border text-xs font-bold transition ${
                    chitFilter === l
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "border-border hover:border-amber-500/50"
                  }`}
                >
                  {l === "ALL" ? "All" : l}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Admin-only controls: Participants + Bidding form + Calculator */}
        {isAdmin && (<>
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
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-muted-foreground">Group Name</Label>
              <Input
                value={chitGroupName}
                onChange={(e) => setChitGroupName(e.target.value)}
                className="h-8 w-32 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={pickerValue} onValueChange={setPickerValue}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a member to add…" />
              </SelectTrigger>
              <SelectContent>
                {allMembers
                  .filter((m) => !participants.some((p) => p.id === m.id))
                  .filter((m) => {
                    if (chitFilter === "ALL") return true;
                    const letter = (m.member_code || "").match(/^[A-Za-z]/)?.[0]?.toUpperCase();
                    return letter === chitFilter;
                  })
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.member_code ? `${m.member_code} — ` : ""}{m.name}
                    </SelectItem>
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
                  <span className="font-mono opacity-80">{p.member_code || "—"}</span>
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Gavel className="size-4" /> Bidding Area / బిడ్డింగ్
              </h2>
              {isAdmin && !turnStart && !auctionClosed && (
                <Button size="sm" variant="outline" onClick={startTurn} className="gap-1">
                  <Clock className="size-3.5" /> Start Turn
                </Button>
              )}
            </div>

            {/* Turn timestamps */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>Start: <b className="text-foreground">{turnStart ? new Date(turnStart).toLocaleTimeString() : "—"}</b></span>
              <span>Close: <b className="text-foreground">{turnEnd ? new Date(turnEnd).toLocaleTimeString() : "—"}</b></span>
              <span>Month: <b className="text-foreground">{currentMonth}/{totalMonths}</b></span>
            </div>

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
                    <SelectItem key={p.id} value={p.id}>
                      {p.member_code ? `${p.member_code} — ` : ""}{p.name}
                    </SelectItem>
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
                disabled={auctionClosed}
              />
              {calc.overCap && !auctionClosed && (
                <p className="text-xs text-red-400">
                  ⚠️ Bid exceeds typical 40% cap (max {fmt(calc.maxBid)})
                </p>
              )}
              {auctionClosed && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <Lock className="size-3.5" /> Auction closed — bidding frozen.
                </p>
              )}
              <Button
                onClick={submitBid}
                className="w-full h-12 text-base font-bold mt-2"
                disabled={auctionClosed || !bid || calc.overCap || !activeBidder}
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
        </>)}

        {/* Live Bidding Board: per-member sequential bids */}
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" />
            <h2 className="font-semibold">Live Bidding Board · లైవ్ బిడ్డింగ్ బోర్డు</h2>
            <Badge variant="secondary" className="text-xs">Month {currentMonth}</Badge>
          </div>
          {participants.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Add chit group members to see the live board.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Member</TableHead>
                  {Array.from({ length: maxCols }).map((_, i) => (
                    <TableHead key={i} className="text-right">Bid {i + 1}</TableHead>
                  ))}
                  <TableHead className="text-right">Latest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => {
                  const list = perMember[p.id] || [];
                  const latest = list[list.length - 1];
                  const isWinner = auctionClosed && winner?.memberId === p.id;
                  return (
                    <TableRow key={p.id} className={isWinner ? "bg-emerald-500/10" : ""}>
                      <TableCell className="font-mono text-xs">{p.member_code || "—"}</TableCell>
                      <TableCell className="font-medium">
                        {p.name}
                        {isWinner && (
                          <Badge className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Winner
                          </Badge>
                        )}
                      </TableCell>
                      {Array.from({ length: maxCols }).map((_, i) => (
                        <TableCell key={i} className="text-right tabular-nums text-xs">
                          {list[i] ? fmt(list[i].amount) : "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold tabular-nums">
                        {latest ? fmt(latest.amount) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Past Winners */}
        {pastWinners.length > 0 && (
          <Card className="p-4 md:p-5 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <h2 className="font-semibold">Past Month Winners · గత నెల విజేతలు</h2>
            </div>
            <ul className="space-y-1.5 text-sm">
              {[...pastWinners].sort((a, b) => a.month - b.month).map((w) => (
                <li key={w.month} className="flex items-center justify-between gap-3 rounded-md border border-border bg-black/30 px-3 py-2">
                  <span>
                    <span className="font-mono text-xs opacity-80">{w.memberCode || "—"}</span>
                    {" "}
                    <b>{w.memberName}</b>
                    <span className="text-muted-foreground"> — {ordinal(w.month)} Month Winner</span>
                  </span>
                  <span className="text-amber-400 font-bold tabular-nums">({fmt(w.amount)})</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Live Bids Activity Table (sorted by amount) */}
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <h2 className="font-semibold">Live Bids Activity</h2>
              <Badge variant="secondary" className="text-xs">{bids.length}</Badge>
              {auctionClosed && (
                <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Finalized
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {bids.length > 0 && !auctionClosed && (
                <Button variant="ghost" size="sm" onClick={clearBids} className="text-xs">
                  Clear All
                </Button>
              )}
              {isAdmin && !auctionClosed && (
                <Button
                  size="sm"
                  onClick={finalizeAuction}
                  disabled={sortedBids.length === 0}
                  className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Lock className="size-3.5" /> End Auction & Finalize Winner
                </Button>
              )}
              {isAdmin && auctionClosed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetAuction}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="size-3.5" /> Reset / Schedule Next Month
                </Button>
              )}
            </div>
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
                          {b.memberCode || b.memberId.slice(0, 8)}
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

        {/* Digital Consent (member view) */}
        {auctionClosed && winner && winnerCalc && me && (
          <Card className="p-4 md:p-5 space-y-3 bg-card border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <h2 className="font-semibold">Winner Confirmation & Digital Consent</h2>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Winner: </span>
                <b className="font-mono">{winner.memberCode || "—"}</b> · <b>{winner.memberName}</b>
              </p>
              <p className="text-muted-foreground mt-1">
                Winning Bid <b className="text-foreground tabular-nums">{fmt(winner.amount)}</b> ·
                {" "}Foreman Commission <b className="text-foreground tabular-nums">{fmt(winnerCalc.commission)}</b> ·
                {" "}Net Paid <b className="text-emerald-400 tabular-nums">{fmt(winnerCalc.net)}</b> ·
                {" "}Dividend per Member <b className="text-amber-400 tabular-nums">{fmt(winnerCalc.dividend)}</b>
              </p>
            </div>

            {myConsent ? (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/40 p-3 text-sm">
                <p className="font-semibold text-emerald-300">
                  ✓ నాకు సమ్మతము — Consent recorded
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Signed at {new Date(myConsent.signedAt).toLocaleString()} ·{" "}
                  <span className="font-mono">{myConsent.signatureTag}</span>
                </p>
              </div>
            ) : (
              <Button onClick={giveConsent} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <CheckCircle2 className="size-4" /> నాకు సమ్మతము (I Agree / Consent)
              </Button>
            )}

            {Object.keys(consents).length > 0 && (
              <div className="pt-2 text-[11px] text-muted-foreground">
                Consents received: <b className="text-foreground">{Object.keys(consents).length}</b> / {participants.length}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Winner Declaration Dialog */}
      <Dialog open={winnerOpen} onOpenChange={setWinnerOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-zinc-900 to-black border-amber-500/40">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40">
              <PartyPopper className="size-7 text-amber-400" />
            </div>
            <DialogTitle className="text-center text-xl text-amber-400">
              Auction Finalized 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              ఈ నెల చిట్ ఆక్షన్ విజేత ప్రకటించబడింది
            </DialogDescription>
          </DialogHeader>

          {winner && winnerCalc && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wide text-amber-300/80">Winner ID & Name</p>
                <p className="text-lg font-bold text-white mt-0.5">
                  <span className="font-mono mr-2 opacity-80">{winner.memberCode || "—"}</span>
                  {winner.memberName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-black/40 p-3">
                  <p className="text-[10px] uppercase text-zinc-400">Winning Bid</p>
                  <p className="text-base font-bold text-red-400 tabular-nums">{fmt(winner.amount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-black/40 p-3">
                  <p className="text-[10px] uppercase text-zinc-400">Net Paid</p>
                  <p className="text-base font-bold text-emerald-400 tabular-nums">{fmt(winnerCalc.net)}</p>
                </div>
                <div className="rounded-lg border border-border bg-black/40 p-3 col-span-2">
                  <p className="text-[10px] uppercase text-zinc-400">
                    Dividend per Member · డివిడెండ్ ({winnerCalc.others} సభ్యులకు)
                  </p>
                  <p className="text-lg font-bold text-amber-400 tabular-nums">{fmt(winnerCalc.dividend)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={() => setWinnerOpen(false)}>Close</Button>
            <Button onClick={handlePrint} className="gap-1">
              <Printer className="size-4" /> Print PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE OFFICIAL PDF VIEW */}
      <div ref={printRef} className="print-only print-area" style={{ display: "none" }}>
        <div style={{ fontFamily: "Georgia, serif" }}>
          {/* Letterhead */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 16 }}>
            {org?.logo_url && (
              <img src={org.logo_url} alt="" style={{ height: 64, marginBottom: 6 }} />
            )}
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{orgName}</h1>
            <p style={{ fontSize: 12, margin: "4px 0" }}>{org?.slogan || ""}</p>
            <p style={{ fontSize: 11, margin: 0 }}>
              {orgRegNo && <>Reg No: {orgRegNo} · </>}
              {orgPhone && <>Phone: {orgPhone} · </>}
              {orgEmail && <>Email: {orgEmail}</>}
            </p>
            <h2 style={{ fontSize: 16, marginTop: 10, textDecoration: "underline" }}>
              OFFICIAL CHIT AUCTION REPORT
            </h2>
          </div>

          {/* Chit Group details */}
          <table style={{ width: "100%", fontSize: 12, marginBottom: 12 }}>
            <tbody>
              <tr>
                <td><b>Chit Group:</b> {chitGroupName}</td>
                <td><b>Chit Value:</b> {fmt(chitValue)}</td>
                <td><b>Month:</b> {currentMonth} / {totalMonths}</td>
              </tr>
              <tr>
                <td><b>Foreman Commission:</b> {commissionPct}%</td>
                <td><b>Turn Started:</b> {turnStart ? new Date(turnStart).toLocaleString() : "—"}</td>
                <td><b>Turn Closed:</b> {turnEnd ? new Date(turnEnd).toLocaleString() : "—"}</td>
              </tr>
              <tr>
                <td colSpan={3}><b>Participants:</b> {participants.length}</td>
              </tr>
            </tbody>
          </table>

          {/* Sequential bid history */}
          <h3 style={{ fontSize: 13, margin: "10px 0 4px" }}>Sequential Bid History</h3>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Member</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Bid Amount</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...bids].sort((a, b) => a.submittedAt - b.submittedAt).map((b, i) => (
                <tr key={b.id}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{b.memberCode || "—"}</td>
                  <td style={tdStyle}>{b.memberName}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(b.amount)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {new Date(b.submittedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Winner / Net Paid */}
          {winner && winnerCalc && (
            <div style={{ marginTop: 16, padding: 10, border: "1px solid #000" }}>
              <h3 style={{ fontSize: 13, margin: "0 0 6px" }}>Winner Declaration</h3>
              <p style={{ margin: "2px 0", fontSize: 12 }}>
                <b>Winner ID:</b> {winner.memberCode || "—"} &nbsp;·&nbsp;
                <b>Name:</b> {winner.memberName}
              </p>
              <p style={{ margin: "2px 0", fontSize: 12 }}>
                <b>Winning Bid:</b> {fmt(winner.amount)} &nbsp;·&nbsp;
                <b>Foreman Commission:</b> {fmt(winnerCalc.commission)}
              </p>
              <p style={{ margin: "2px 0", fontSize: 12 }}>
                <b>Net Paid to Winner:</b> {fmt(winnerCalc.net)} &nbsp;·&nbsp;
                <b>Dividend / Member:</b> {fmt(winnerCalc.dividend)} (across {winnerCalc.others} members)
              </p>
            </div>
          )}

          {/* Consents */}
          {Object.keys(consents).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 13, margin: "0 0 4px" }}>Digital Consents</h3>
              <ul style={{ fontSize: 11, paddingLeft: 18, margin: 0 }}>
                {Object.values(consents).map((c) => (
                  <li key={c.memberId}>
                    {c.memberName} — {new Date(c.signedAt).toLocaleString()} — <span style={{ fontFamily: "monospace" }}>{c.signatureTag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signatures */}
          <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
                <b>CHS Accountant</b>
              </div>
            </div>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
                <b>Society President</b>
                {orgPresident && <div style={{ fontSize: 11 }}>{orgPresident}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  textAlign: "left",
  background: "#eee",
};
const tdStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
