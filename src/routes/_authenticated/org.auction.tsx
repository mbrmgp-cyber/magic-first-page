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
  Lock, RotateCcw, PartyPopper, Printer, CheckCircle2, ShieldCheck, Clock, Archive,
} from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { listApprovedMembers } from "@/lib/members.functions";
import { getMyRoles, getMyMembership, getMyOrg } from "@/lib/org.functions";
import { getAuctionState, saveAuctionState, submitAuctionConsent, deleteAuctionGroup, listMonthArchives, getMonthArchive, archiveAndResetMonth, type AuctionStateDTO, type MonthArchiveDTO } from "@/lib/auction.functions";
import { useSimRole } from "@/lib/rbac";
import { RoleGate } from "@/components/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuctionPaymentsPanel } from "@/components/auction/AuctionPaymentsPanel";

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

type AuctionSessionRow = {
  id: string;
  org_id: string;
  group_name: string;
  live_group_name: string | null;
  participants: unknown;
  chit_value: number;
  total_months: number;
  current_month: number;
  commission_pct: number;
  start_date: string | null;
  turn_start: string | null;
  turn_end: string | null;
  auction_closed: boolean;
  status: string;
  winner_bid_id: string | null;
  winner_member_id: string | null;
  winner_member_name: string | null;
  winner_member_code: string | null;
  winner_amount: number | null;
  winner_net: number | null;
  winner_dividend: number | null;
  past_winners: unknown;
  consents: unknown;
  created_at: string;
  updated_at: string;
};

type BidRow = {
  id: string;
  member_id: string;
  member_name: string;
  member_code: string | null;
  amount: number;
  submitted_at: string;
  auction_id?: string | null;
};

const toMs = (value?: string | null) => (value ? new Date(value).getTime() : null);
function normalizeSessionParticipants(value: unknown): MemberLite[] {
  return Array.isArray(value)
    ? value
        .map((p: any) => ({ id: String(p.id ?? ""), name: String(p.name ?? ""), member_code: p.member_code ?? null }))
        .filter((p) => p.id)
    : [];
}

function mapBidRows(rows: BidRow[] | null | undefined): BidEntry[] {
  return (rows ?? []).map((b) => ({
    id: b.id,
    memberId: b.member_id,
    memberName: b.member_name,
    memberCode: b.member_code,
    amount: Number(b.amount) || 0,
    submittedAt: new Date(b.submitted_at).getTime(),
  }));
}

function sessionGroup(row: AuctionSessionRow): NonNullable<AuctionStateDTO["groups"]>[number] {
  const members = normalizeSessionParticipants(row.participants);
  return {
    auctionId: row.id,
    name: row.group_name,
    memberIds: members.map((m) => m.id),
    memberCodes: members.map((m) => m.member_code ?? null),
    memberNames: members.map((m) => m.name),
    totalMonths: row.total_months,
    chitValue: Number(row.chit_value) || 0,
    startDate: row.start_date,
    savedAt: new Date(row.created_at || row.updated_at).getTime(),
  };
}

function sessionState(row: AuctionSessionRow, bidRows: BidRow[], allRows: AuctionSessionRow[]): AuctionStateDTO {
  return {
    activeAuctionId: row.id,
    groupName: row.group_name,
    liveGroupName: row.live_group_name ?? row.group_name,
    chitValue: Number(row.chit_value) || 0,
    totalMonths: row.total_months,
    currentMonth: row.current_month,
    commissionPct: Number(row.commission_pct) || 0,
    startDate: row.start_date ?? undefined,
    participants: normalizeSessionParticipants(row.participants),
    bids: mapBidRows(bidRows),
    pastWinners: Array.isArray(row.past_winners) ? row.past_winners as any : [],
    consents: row.consents && typeof row.consents === "object" && !Array.isArray(row.consents) ? row.consents as any : {},
    groups: allRows.map(sessionGroup),
    winner: row.winner_member_id ? {
      id: row.winner_bid_id ?? `winner-${row.winner_member_id}`,
      memberId: row.winner_member_id,
      memberName: row.winner_member_name ?? "Winner",
      memberCode: row.winner_member_code,
      amount: Number(row.winner_amount) || 0,
      submittedAt: toMs(row.turn_end) ?? Date.now(),
    } : null,
    auctionClosed: row.auction_closed || row.status === "closed",
    turnStart: toMs(row.turn_start),
    turnEnd: toMs(row.turn_end),
  };
}

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
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  const [chitStartDate, setChitStartDate] = useState<string>("");
  // Foreman / terms / auction close config
  const [foremanMode, setForemanMode] = useState<"commission" | "free_month">("commission");
  const [foremanFreeMonth, setForemanFreeMonth] = useState<number | null>(null);
  const [foremanIncluded, setForemanIncluded] = useState<boolean>(true);
  const [terms, setTerms] = useState<string>("");
  const [closeAt, setCloseAt] = useState<string>(""); // ISO string
  // Admin UX: collapse Group Setup card after save + which saved group is loaded into the Live board
  const [setupCollapsed, setSetupCollapsed] = useState<boolean>(false);
  const [liveGroupName, setLiveGroupName] = useState<string>("");
  // While the admin is drafting a brand-new group in the setup card, freeze
  // remote sync from overwriting the setup form and freeze auto-save from
  // pushing a half-built row (which was overwriting Group A back to itself).
  const [editingSetup, setEditingSetup] = useState<boolean>(false);
  const editingSetupRef = useRef(false);
  const setupCollapsedRef = useRef(false);
  useEffect(() => { editingSetupRef.current = editingSetup; }, [editingSetup]);
  useEffect(() => { setupCollapsedRef.current = setupCollapsed; }, [setupCollapsed]);

  const startNewGroup = () => {
    setEditingSetup(true);
    setSetupCollapsed(false);
    setParticipants([]);
    setChitGroupName("");
    setChitStartDate("");
  };

  const loadGroupIntoLive = async (name: string) => {
    setLiveGroupName(name);
    const g = groups.find((x) => x.name === name);
    if (!g) return;
    if (g.auctionId) {
      setActiveAuctionId(g.auctionId);
      activeAuctionIdRef.current = g.auctionId;
      try {
        const { data: session, error: sessionError } = await (supabase as any)
          .from("auction_sessions")
          .select("*")
          .eq("id", g.auctionId)
          .maybeSingle();
        if (sessionError) throw sessionError;
        if (session) {
          const { data: sessionRows } = await (supabase as any)
            .from("auction_sessions")
            .select("*")
            .eq("org_id", orgId)
            .order("updated_at", { ascending: false });
          const { data: bidRows, error: bidError } = await (supabase as any)
            .from("bids")
            .select("id, member_id, member_name, member_code, amount, submitted_at")
            .eq("auction_id", g.auctionId)
            .order("submitted_at", { ascending: true });
          if (bidError) throw bidError;
          const nextState = sessionState(session as AuctionSessionRow, bidRows ?? [], (sessionRows ?? []) as AuctionSessionRow[]);
          nextState.liveGroupName = name;
          applyRemote(nextState);
          if (orgId) await saveState({ data: { orgId, state: nextState } });
          return;
        }
      } catch (e: any) {
        console.error("Failed to load auction group:", e?.message || e);
      }
    }
    const members: MemberLite[] = (g.memberIds || []).map((id, i) => ({
      id,
      name: g.memberNames?.[i] || "",
      member_code: g.memberCodes?.[i] ?? null,
    }));
    setParticipants(members);
    const tm = (g as any).totalMonths;
    if (typeof tm === "number" && tm > 0) setTotalMonths(tm);
    if (typeof (g as any).chitValue === "number") setChitValue((g as any).chitValue);
    if (typeof (g as any).startDate === "string") setChitStartDate((g as any).startDate || "");
    setChitGroupName(name);
    if (orgId) {
      try {
        await saveState({
          data: {
            orgId,
            state: buildSessionSnapshot({
              groupName: name,
              liveGroupName: name,
              participants: members,
              totalMonths: typeof tm === "number" && tm > 0 ? tm : totalMonths,
              chitValue: typeof (g as any).chitValue === "number" ? (g as any).chitValue : chitValue,
              startDate: typeof (g as any).startDate === "string" ? (g as any).startDate : chitStartDate,
            }),
          },
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to activate live group");
      }
    }
  };

  // ─────────── Realtime sync with admin (DB-backed) ───────────
  // For org admins without a member row, fall back to org.id so they still sync.
  const orgId: string | undefined = me?.org_id ?? org?.id;
  const loadState = useServerFn(getAuctionState);
  const saveState = useServerFn(saveAuctionState);
  const submitConsent = useServerFn(submitAuctionConsent);
  const deleteGroupServer = useServerFn(deleteAuctionGroup);
  const fetchArchives = useServerFn(listMonthArchives);
  const fetchArchive = useServerFn(getMonthArchive);
  const archiveResetServer = useServerFn(archiveAndResetMonth);

  // Snapshot currently loaded into the printable PDF area. When null, the
  // print-area uses the live board state. When set, the PDF renders that
  // archived month exactly as it was closed.
  const [archivePrint, setArchivePrint] = useState<MonthArchiveDTO | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);

  const archivesQ = useQuery({
    queryKey: ["auction-month-archives", orgId ?? ""],
    queryFn: () => fetchArchives({ data: { orgId: orgId! } }),
    enabled: !!orgId,
    refetchInterval: 15000,
  });
  const allArchives: MonthArchiveDTO[] = archivesQ.data?.archives ?? [];

  // Member's own bidding input
  const [myBidAmount, setMyBidAmount] = useState<number>(0);
  const [submittingMyBid, setSubmittingMyBid] = useState(false);

  const hydratedRef = useRef(false);
  const lastRemoteJsonRef = useRef<string>("");
  const skipNextPushRef = useRef(false);
  const activeAuctionIdRef = useRef<string | null>(null);

  const applyRemote = (s: AuctionStateDTO | null | undefined) => {
    if (!s) return;
    skipNextPushRef.current = true;
    if (typeof s.activeAuctionId === "string") {
      setActiveAuctionId(s.activeAuctionId);
      activeAuctionIdRef.current = s.activeAuctionId;
    }
    // On the very first hydration we always pull remote values in, so a saved
    // custom `total_months` (e.g. 10 or 25) is not clobbered by the default 20
    // just because the setup card happens to be expanded.
    const freezeSetup = hydratedRef.current && (editingSetupRef.current || !setupCollapsedRef.current);
    if (!freezeSetup && typeof s.groupName === "string") setChitGroupName(s.groupName);
    if (typeof (s as any).liveGroupName === "string") setLiveGroupName((s as any).liveGroupName);
    if (!freezeSetup && typeof s.chitValue === "number") setChitValue(s.chitValue);
    if (!freezeSetup && typeof s.totalMonths === "number") setTotalMonths(s.totalMonths);
    if (typeof s.currentMonth === "number") setCurrentMonth(s.currentMonth);
    if (typeof s.commissionPct === "number") setCommissionPct(s.commissionPct);
    if (!freezeSetup && typeof s.startDate === "string") setChitStartDate(s.startDate);
    if (!freezeSetup && Array.isArray(s.participants)) setParticipants(s.participants);
    if (Array.isArray(s.bids)) setBids(s.bids);
    if (Array.isArray(s.pastWinners)) setPastWinners(s.pastWinners);
    if (s.consents && typeof s.consents === "object") setConsents(s.consents as any);
    if (Array.isArray(s.groups)) setGroups(s.groups);
    if (!freezeSetup && typeof (s as any).foremanMode === "string") setForemanMode((s as any).foremanMode);
    if (!freezeSetup && "foremanFreeMonth" in s) setForemanFreeMonth((s as any).foremanFreeMonth ?? null);
    if (!freezeSetup && typeof (s as any).foremanIncluded === "boolean") setForemanIncluded((s as any).foremanIncluded);
    if (!freezeSetup && typeof (s as any).terms === "string") setTerms((s as any).terms ?? "");
    if (!freezeSetup && "closeAt" in s) setCloseAt((s as any).closeAt ?? "");
    if (typeof s.auctionClosed === "boolean") setAuctionClosed(s.auctionClosed);
    setWinner(s.winner ?? null);
    setTurnStart(s.turnStart ?? null);
    setTurnEnd(s.turnEnd ?? null);
  };

  useEffect(() => { activeAuctionIdRef.current = activeAuctionId; }, [activeAuctionId]);

  // 5-minute warning toast before closeAt
  useEffect(() => {
    if (!closeAt || auctionClosed) return;
    const closeMs = new Date(closeAt).getTime();
    if (!Number.isFinite(closeMs)) return;
    const warnAt = closeMs - 5 * 60 * 1000;
    const now = Date.now();
    if (warnAt <= now) return;
    const timer = setTimeout(() => {
      toast.warning("Hurry up! The chit auction will close in 5 minutes.", { duration: 10000 });
    }, warnAt - now);
    return () => clearTimeout(timer);
  }, [closeAt, auctionClosed]);

  // Initial load + Supabase realtime subscriptions backed by auction_sessions + bids tables
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    const fetchAndApply = async (preferredAuctionId?: string | null) => {
      const { data: sessionRows, error: sessionError } = await (supabase as any)
        .from("auction_sessions")
        .select("*")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });
      if (sessionError) throw sessionError;
      const sessions = (sessionRows ?? []) as AuctionSessionRow[];
      const session =
        (preferredAuctionId ? sessions.find((s) => s.id === preferredAuctionId) : null) ||
        sessions.find((s) => s.status === "active" && !s.auction_closed) ||
        sessions[0];
      if (!session) return;

      const { data: bidRows, error: bidError } = await (supabase as any)
        .from("bids")
        .select("id, member_id, member_name, member_code, amount, submitted_at")
        .eq("auction_id", session.id)
        .order("submitted_at", { ascending: true });
      if (bidError) throw bidError;
      const next = sessionState(session, bidRows ?? [], sessions);
      const js = JSON.stringify(next);
      if (js === lastRemoteJsonRef.current) return;
      lastRemoteJsonRef.current = js;
      if (!cancelled) applyRemote(next);
    };

    (async () => {
      try {
        const res = await loadState({ data: { orgId } });
        if (cancelled) return;
        if (res?.state) {
          lastRemoteJsonRef.current = JSON.stringify(res.state);
          applyRemote(res.state);
          // Initial hydration happens before the admin auto-save effect is active;
          // clear the echo-suppression flag so the first real admin change is persisted.
          skipNextPushRef.current = false;
        }
      } catch (e) { /* ignore */ }
      hydratedRef.current = true;
    })();

    const channel = supabase
      .channel(`auction-sessions-and-bids-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_sessions", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const id = payload.new?.id ?? payload.old?.id ?? activeAuctionIdRef.current;
          fetchAndApply(id).catch((e) => console.error("Auction session realtime failed:", e?.message || e));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const row = payload.new as BidRow | undefined;
          const auctionId = row?.auction_id ?? activeAuctionIdRef.current;
          // Fast path: if the new bid belongs to the session we're currently
          // watching, append immediately so every subscriber (admin + members)
          // sees the row without waiting for the full refetch round-trip.
          if (row && auctionId && activeAuctionIdRef.current && auctionId === activeAuctionIdRef.current) {
            const entry = mapBidRows([row])[0];
            setBids((prev) => (prev.some((b) => b.id === entry.id) ? prev : [...prev, entry]));
          }
          // Only re-hydrate for the session the viewer is currently watching.
          // Otherwise a bid in another group would flip the viewer's activeAuctionId
          // and wipe out their view.
          if (auctionId && auctionId === activeAuctionIdRef.current) {
            fetchAndApply(auctionId).catch((e) => console.error("Auction bids realtime failed:", e?.message || e));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "bids", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const auctionId = payload.old?.auction_id ?? activeAuctionIdRef.current;
          if (auctionId && auctionId === activeAuctionIdRef.current) {
            fetchAndApply(auctionId).catch((e) => console.error("Auction bids realtime failed:", e?.message || e));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Member-side: ensure the member is subscribed to THEIR visible group's
  // auction session, not just whatever session was most-recently-updated
  // org-wide. Without this, a member in Group B whose activeAuctionId points
  // at Group A never renders Group B bids even though realtime delivers them.
  useEffect(() => {
    if (!orgId || isAdmin || !myId || groups.length === 0) return;
    const myGroups = groups.filter((g) => g.memberIds.includes(myId));
    if (myGroups.length === 0) return;
    const visibleName = selectedGroupName || liveGroupName || myGroups[0].name;
    const target = myGroups.find((g) => g.name === visibleName) || myGroups[0];
    if (!target?.auctionId) return;
    if (target.auctionId === activeAuctionIdRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: session, error: sessionError } = await (supabase as any)
          .from("auction_sessions")
          .select("*")
          .eq("id", target.auctionId)
          .maybeSingle();
        if (sessionError) throw sessionError;
        if (!session || cancelled) return;
        const { data: sessionRows } = await (supabase as any)
          .from("auction_sessions")
          .select("*")
          .eq("org_id", orgId)
          .order("updated_at", { ascending: false });
        const { data: bidRows, error: bidError } = await (supabase as any)
          .from("bids")
          .select("id, member_id, member_name, member_code, amount, submitted_at")
          .eq("auction_id", target.auctionId)
          .order("submitted_at", { ascending: true });
        if (bidError) throw bidError;
        if (cancelled) return;
        const nextState = sessionState(
          session as AuctionSessionRow,
          bidRows ?? [],
          (sessionRows ?? []) as AuctionSessionRow[],
        );
        lastRemoteJsonRef.current = JSON.stringify(nextState);
        applyRemote(nextState);
      } catch (e: any) {
        console.error("Member group session load failed:", e?.message || e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, isAdmin, myId, groups, selectedGroupName, liveGroupName]);

  // Admin writes: push state whenever it changes (debounced)
  useEffect(() => {
    if (!orgId || !isAdmin || !hydratedRef.current) return;
    // While the admin is drafting a new group in the setup card, do NOT push —
    // otherwise the half-built row upserts on (org_id, group_name) and wipes
    // the current live group.
    if (editingSetup) return;
    // Do not persist a half-built setup card before the admin clicks Save/Assign.
    if (!liveGroupName.trim() && !activeAuctionId && !turnStart && bids.length === 0 && !auctionClosed) return;
    if (skipNextPushRef.current) { skipNextPushRef.current = false; return; }
    // Never let the setup card's local state (participants, chit_value,
    // total_months, start_date, group_name) leak into a DIFFERENT group's row
    // via the auto-save. Those setup fields belong to whichever saved group is
    // currently live — look them up in `groups` when the setup card is showing
    // a different group.
    const liveKey = (liveGroupName || chitGroupName).toLowerCase();
    const liveEntry = groups.find((g) => g.name.toLowerCase() === liveKey);
    const setupMatchesLive = chitGroupName.trim().toLowerCase() === liveKey;
    const liveParticipants = !setupMatchesLive && liveEntry
      ? (liveEntry.memberIds || []).map((id, i) => ({
          id,
          name: liveEntry.memberNames?.[i] || "",
          member_code: liveEntry.memberCodes?.[i] ?? null,
        }))
      : participants;
    const liveTotalMonths = !setupMatchesLive && liveEntry?.totalMonths ? liveEntry.totalMonths : totalMonths;
    const liveChitValue = !setupMatchesLive && typeof (liveEntry as any)?.chitValue === "number" ? (liveEntry as any).chitValue : chitValue;
    const liveStartDate = !setupMatchesLive && typeof (liveEntry as any)?.startDate === "string" ? (liveEntry as any).startDate : chitStartDate;
    const snapshot: AuctionStateDTO = {
      activeAuctionId: activeAuctionId ?? undefined,
      groupName: liveGroupName || chitGroupName,
      liveGroupName,
      chitValue: liveChitValue,
      totalMonths: liveTotalMonths,
      currentMonth,
      commissionPct,
      startDate: liveStartDate,
      participants: liveParticipants,
      bids, pastWinners, consents, groups,
      winner, auctionClosed, turnStart, turnEnd,
    };
    const js = JSON.stringify(snapshot);
    if (js === lastRemoteJsonRef.current) return;
    const t = setTimeout(async () => {
      try {
        lastRemoteJsonRef.current = js;
        const res = await saveState({ data: { orgId, state: snapshot } });
        if (res?.state) applyRemote(res.state);
      } catch (e: any) {
        console.error("Auction sync failed:", e?.message || e);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [
    orgId, isAdmin, activeAuctionId, chitGroupName, liveGroupName, chitValue, totalMonths, currentMonth,
    commissionPct, chitStartDate, participants, bids, pastWinners, consents, groups, winner,
    auctionClosed, turnStart, turnEnd, saveState, editingSetup,
  ]);

  const buildSessionSnapshot = (overrides: Partial<AuctionStateDTO> = {}): AuctionStateDTO => {
    // Mirror the auto-save's "live-group-canonical" logic so ad-hoc writes
    // (startTurn, submitBid, clearBids, finalize, reset) never overwrite the
    // live group's saved participants/chit fields with the setup card's local
    // state. Without this, clicking Start Turn while the setup card is empty
    // upserts participants=[] onto the live row and wipes members.
    const liveName = (overrides.liveGroupName ?? liveGroupName) || chitGroupName;
    const liveKey = liveName.toLowerCase();
    const liveEntry = groups.find((g) => g.name.toLowerCase() === liveKey);
    const setupMatchesLive = chitGroupName.trim().toLowerCase() === liveKey;
    const liveParticipants = !setupMatchesLive && liveEntry
      ? (liveEntry.memberIds || []).map((id, i) => ({
          id,
          name: liveEntry.memberNames?.[i] || "",
          member_code: liveEntry.memberCodes?.[i] ?? null,
        }))
      : participants;
    const liveTotalMonths = !setupMatchesLive && liveEntry?.totalMonths ? liveEntry.totalMonths : totalMonths;
    const liveChitValue = !setupMatchesLive && typeof (liveEntry as any)?.chitValue === "number" ? (liveEntry as any).chitValue : chitValue;
    const liveStartDate = !setupMatchesLive && typeof (liveEntry as any)?.startDate === "string" ? (liveEntry as any).startDate : chitStartDate;
    return {
      activeAuctionId: overrides.activeAuctionId ?? activeAuctionId ?? undefined,
      groupName: overrides.groupName ?? liveName,
      liveGroupName: overrides.liveGroupName ?? liveGroupName,
      chitValue: overrides.chitValue ?? liveChitValue,
      totalMonths: overrides.totalMonths ?? liveTotalMonths,
      currentMonth: overrides.currentMonth ?? currentMonth,
      commissionPct: overrides.commissionPct ?? commissionPct,
      startDate: "startDate" in overrides ? overrides.startDate : liveStartDate,
      participants: overrides.participants ?? liveParticipants,
      bids: overrides.bids ?? bids,
      pastWinners: overrides.pastWinners ?? pastWinners,
      consents: overrides.consents ?? consents,
      groups: overrides.groups ?? groups,
      winner: "winner" in overrides ? overrides.winner : winner,
      auctionClosed: overrides.auctionClosed ?? auctionClosed,
      turnStart: overrides.turnStart === undefined ? turnStart : overrides.turnStart,
      turnEnd: overrides.turnEnd === undefined ? turnEnd : overrides.turnEnd,
      foremanMode: (overrides as any).foremanMode ?? foremanMode,
      foremanFreeMonth: (overrides as any).foremanFreeMonth ?? foremanFreeMonth,
      foremanIncluded: (overrides as any).foremanIncluded ?? foremanIncluded,
      terms: (overrides as any).terms ?? (terms || null),
      closeAt: (overrides as any).closeAt ?? (closeAt || null),
      totalMembers: (overrides as any).totalMembers ?? (participants.length || null),
    };
  };


  const ensureCurrentSession = async (overrides: Partial<AuctionStateDTO> = {}) => {
    if (!orgId) throw new Error("Organization not found");
    const state = buildSessionSnapshot(overrides);
    const res: any = await saveState({ data: { orgId, state } });
    const id = res?.sessionId ?? res?.state?.activeAuctionId ?? null;
    if (!id) throw new Error("Could not create auction session");
    setActiveAuctionId(id);
    activeAuctionIdRef.current = id;
    if (res?.state) applyRemote(res.state);
    return id as string;
  };

  const startTurn = async () => {
    const ts = Date.now();
    setTurnStart(ts);
    // CRITICAL: Never wholesale-upsert the session for a turn state change —
    // that risks blanking participants/total_months/chit_value from local
    // state. Do a surgical UPDATE of only the turn fields on the live row.
    try {
      let auctionId = activeAuctionIdRef.current;
      if (!auctionId) {
        auctionId = await ensureCurrentSession({ turnStart: ts, turnEnd: null, auctionClosed: false });
      } else {
        const { error } = await (supabase as any)
          .from("auction_sessions")
          .update({
            turn_start: new Date(ts).toISOString(),
            turn_end: null,
            auction_closed: false,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", auctionId);
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to start auction turn");
    }
  };

  // Highest bid from the live bids array — this drives Live Metrics so the
  // interest / amount-per-member updates the moment any member (or admin) bids.
  const topBidAmount = useMemo(
    () => bids.reduce((m, b) => (b.amount > m ? b.amount : m), 0),
    [bids],
  );

  const calc = useMemo(() => {
    const cv = Math.max(0, Number(chitValue) || 0);
    // Prefer the live top bid; fall back to the admin's local input while no
    // bids have been placed yet so the calculator still previews values.
    const b = Math.max(0, Number(topBidAmount) || Number(bid) || 0);
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
    const perMember = participants.length > 0 ? Math.max(0, cv - b) / participants.length : 0;
    return { commission, loss, net, remaining, monthlyPct, annualPct, maxBid, overCap, perMember, topBid: b };
  }, [chitValue, bid, topBidAmount, commissionPct, totalMonths, currentMonth, participants.length]);

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

  const submitBid = async () => {
    if (auctionClosed) return;
    if (turnEnd) {
      toast.error("Entry is closed for this turn");
      return;
    }
    if (!activeBidder || !bid || calc.overCap) return;
    const m = participants.find((p) => p.id === activeBidder);
    if (!m) return;
    try {
      const turnTs = turnStart ?? Date.now();
      if (!turnStart) setTurnStart(turnTs);
      const auctionId = await ensureCurrentSession({ turnStart: turnTs, auctionClosed: false, turnEnd: null });
      const { error } = await (supabase as any).from("bids").insert({
        auction_id: auctionId,
        org_id: orgId,
        member_id: m.id,
        member_name: m.name || "Member",
        member_code: m.member_code ?? null,
        amount: bid,
        submitted_by: rolesQ.data?.userId ?? null,
      });
      if (error) throw error;
      setBid(0);
      toast.success("Bid saved to database");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit bid");
    }
  };

  const clearBids = async () => {
    const auctionId = activeAuctionIdRef.current;
    setBids([]); setTurnStart(null); setTurnEnd(null);
    try {
      if (auctionId) {
        const { error } = await (supabase as any).from("bids").delete().eq("auction_id", auctionId);
        if (error) throw error;
      }
      await ensureCurrentSession({ bids: [], turnStart: null, turnEnd: null, winner: null, auctionClosed: false });
    } catch (e: any) {
      toast.error(e?.message || "Failed to clear bids");
    }
  };

  const finalizeAuction = async () => {
    if (sortedBids.length === 0) return;
    const w = sortedBids[0];
    setWinner(w);
    setAuctionClosed(true);
    const closedAt = Date.now();
    setTurnEnd(closedAt);
    setWinnerOpen(true);
    const cv = Math.max(0, Number(chitValue) || 0);
    const commission = (cv * (Number(commissionPct) || 0)) / 100;
    const net = Math.max(0, cv - w.amount - commission);
    const others = Math.max(1, participants.length - 1);
    const dividend = Math.max(0, (w.amount - commission)) / others;
    const nextPastWinners = [
      ...pastWinners.filter((p) => p.month !== currentMonth),
      {
        month: currentMonth, memberId: w.memberId, memberCode: w.memberCode,
        memberName: w.memberName, amount: w.amount, net, dividend, closedAt,
      },
    ];
    setPastWinners(nextPastWinners);
    try {
      await ensureCurrentSession({ winner: w, auctionClosed: true, turnEnd: closedAt, pastWinners: nextPastWinners });
    } catch (e: any) {
      toast.error(e?.message || "Failed to finalize auction");
    }
  };

  const resetAuction = async () => {
    const nextMonth = currentMonth + 1;
    setBids([]);
    setWinner(null);
    setAuctionClosed(false);
    setBid(0);
    setActiveBidder("");
    setTurnStart(null);
    setTurnEnd(null);
    setCurrentMonth(nextMonth);
    try {
      if (activeAuctionIdRef.current) {
        const { error } = await (supabase as any).from("bids").delete().eq("auction_id", activeAuctionIdRef.current);
        if (error) throw error;
      }
      await ensureCurrentSession({
        bids: [], winner: null, auctionClosed: false, turnStart: null, turnEnd: null, currentMonth: nextMonth,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset auction");
    }
  };

  const deleteGroup = async (name: string) => {
    if (!orgId) {
      toast.error("Organization not found");
      return;
    }
    const g = groups.find((x) => x.name.toLowerCase() === name.toLowerCase());
    // Resolve auctionId (via memory or DB lookup) before deleting.
    let auctionId = g?.auctionId ?? null;
    try {
      if (!auctionId) {
        const { data: row } = await (supabase as any)
          .from("auction_sessions")
          .select("id")
          .eq("org_id", orgId)
          .ilike("group_name", name)
          .maybeSingle();
        auctionId = row?.id ?? null;
      }
      if (!auctionId) {
        // Nothing exists in DB — just clear it from local state.
        setGroups((prev) => prev.filter((x) => x.name.toLowerCase() !== name.toLowerCase()));
        toast.success(`Deleted group "${name}"`);
        return;
      }
      // Hard DELETE via authenticated server fn (bypasses client RLS quirks
      // and guarantees the row is removed from Supabase).
      await deleteGroupServer({ data: { orgId, auctionId } });
      // Verify the row is really gone.
      const { data: check } = await (supabase as any)
        .from("auction_sessions")
        .select("id")
        .eq("id", auctionId)
        .maybeSingle();
      if (check?.id) {
        // Fallback: try client delete (in case server fn silently failed).
        const { error: delErr } = await (supabase as any)
          .from("auction_sessions")
          .delete()
          .eq("id", auctionId)
          .select("id");
        if (delErr) throw delErr;
        const { data: recheck } = await (supabase as any)
          .from("auction_sessions")
          .select("id")
          .eq("id", auctionId)
          .maybeSingle();
        if (recheck?.id) throw new Error("Row still exists after delete (RLS?)");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete group from database");
      return;
    }
    // Refresh from DB so the dropdown reflects the actual server state.
    try {
      const { data: allRows } = await (supabase as any)
        .from("auction_sessions")
        .select("*")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });
      const mapped = ((allRows ?? []) as any[]).map((r) => ({
        auctionId: r.id,
        name: r.group_name,
        memberIds: Array.isArray(r.participants) ? r.participants.map((p: any) => String(p.id ?? "")) : [],
        memberCodes: Array.isArray(r.participants) ? r.participants.map((p: any) => p.member_code ?? null) : [],
        memberNames: Array.isArray(r.participants) ? r.participants.map((p: any) => String(p.name ?? "")) : [],
        totalMonths: r.total_months,
        chitValue: Number(r.chit_value) || 0,
        startDate: r.start_date,
        savedAt: new Date(r.updated_at || r.created_at).getTime(),
      }));
      setGroups(mapped);
      // If the deleted group was the live one, clear the live pointer.
      if (liveGroupName && liveGroupName.toLowerCase() === name.toLowerCase()) {
        setLiveGroupName("");
        setActiveAuctionId(null);
        activeAuctionIdRef.current = null;
      }
      if (selectedGroupName && selectedGroupName.toLowerCase() === name.toLowerCase()) {
        setSelectedGroupName("");
      }
    } catch { /* refresh best-effort */ }
    toast.success(`Deleted group "${name}"`);
  };

  const closeEntry = async () => {
    const ts = Date.now();
    setTurnEnd(ts);
    try {
      await ensureCurrentSession({ turnEnd: ts });
    } catch (e: any) {
      toast.error(e?.message || "Failed to close entry");
      return;
    }
    toast.info("Entry closed · ఎంట్రీ క్లోజ్");
  };

  const saveGroup = async () => {
    if (!orgId) {
      toast.error("Organization not found");
      return;
    }
    const name = (chitGroupName || "").trim();
    if (!name) {
      toast.error("Enter a Group Name first");
      return;
    }
    if (participants.length === 0) {
      toast.error("Add members to the group first");
      return;
    }
    if (!totalMonths || totalMonths <= 0) {
      toast.error("Enter Total Months (మొత్తం నెలలు)");
      return;
    }
    // Existing group with same name → this is an edit of that saved group.
    const existing = groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const hasLiveOther = !!liveGroupName && liveGroupName.toLowerCase() !== name.toLowerCase();
    // Preserve the currently live group: write ONLY this group's row, do not
    // sweep other fields (bids/turn/etc.) from unrelated live state.
    try {
      const payload: any = {
        org_id: orgId,
        group_name: name,
        live_group_name: name,
        participants: participants.map((p) => ({ id: p.id, name: p.name, member_code: p.member_code ?? null })),
        chit_value: chitValue,
        total_months: totalMonths,
        current_month: 1,
        commission_pct: commissionPct,
        start_date: chitStartDate || null,
        auction_closed: false,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      const doUpsert = async () => await (supabase as any)
        .from("auction_sessions")
        .upsert(payload, { onConflict: "org_id,group_name" })
        .select("*")
        .maybeSingle();
      let attempt = await doUpsert();
      // Retry once on transient network failure ("Failed to fetch").
      if (attempt.error && /failed to fetch|networkerror|fetch/i.test(String(attempt.error.message || ""))) {
        await new Promise((r) => setTimeout(r, 400));
        attempt = await doUpsert();
      }
      const { data: row, error } = attempt;
      if (error) throw error;
      // Refresh the groups list from DB so both Group A and Group B coexist.
      const { data: allRows } = await (supabase as any)
        .from("auction_sessions")
        .select("*")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false });
      const mapped = ((allRows ?? []) as any[]).map((r) => ({
        auctionId: r.id,
        name: r.group_name,
        memberIds: Array.isArray(r.participants) ? r.participants.map((p: any) => String(p.id ?? "")) : [],
        memberCodes: Array.isArray(r.participants) ? r.participants.map((p: any) => p.member_code ?? null) : [],
        memberNames: Array.isArray(r.participants) ? r.participants.map((p: any) => String(p.name ?? "")) : [],
        totalMonths: r.total_months,
        chitValue: Number(r.chit_value) || 0,
        startDate: r.start_date,
        savedAt: new Date(r.updated_at || r.created_at).getTime(),
      }));
      setGroups(mapped);
      setEditingSetup(false);
      setSetupCollapsed(true);
      // If no live group yet, or the admin is editing the group that's already
      // live, promote this row into the live board. Otherwise keep the other
      // group live and do NOT overwrite its bidding state.
      if (!hasLiveOther) {
        setLiveGroupName(name);
        setActiveAuctionId(row?.id ?? null);
        activeAuctionIdRef.current = row?.id ?? null;
      }
      toast.success(
        existing
          ? `Updated "${name}"`
          : hasLiveOther
            ? `Saved "${name}" — "${liveGroupName}" remains live`
            : `Saved "${name}" — synced to members`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to save group to database");
      return;
    }
  };


  const submitOwnBid = async () => {
    if (!orgId || !myBidAmount || myBidAmount <= 0 || auctionClosed) return;
    if (turnEnd) {
      toast.error("Entry is closed for this turn");
      return;
    }
    setSubmittingMyBid(true);
    try {
      let auctionId = activeAuctionIdRef.current;
      if (!auctionId) {
        const { data: session, error: sessionError } = await (supabase as any)
          .from("auction_sessions")
          .select("id")
          .eq("org_id", orgId)
          .neq("status", "closed")
          .eq("auction_closed", false)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sessionError) throw sessionError;
        auctionId = session?.id ?? null;
      }
      if (!auctionId) throw new Error("No active auction session found");
      if (!myId) throw new Error("Member profile not found");
      const { error } = await (supabase as any).from("bids").insert({
        auction_id: auctionId,
        org_id: orgId,
        member_id: myId,
        member_name: myName || "Member",
        member_code: myCode || null,
        amount: myBidAmount,
        submitted_by: rolesQ.data?.userId ?? null,
      });
      if (error) throw error;
      setMyBidAmount(0);
      toast.success("Bid submitted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit bid");
    } finally {
      setSubmittingMyBid(false);
    }
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
    // Close any open dialogs / popovers so they don't leak into the PDF
    setWinnerOpen(false);
    // Wait for Radix to unmount the portal before invoking the browser print dialog
    setTimeout(() => window.print(), 120);
  };

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgRegNo = org?.gov_reg_number || "";
  const orgPhone = org?.phone || "";
  const orgEmail = org?.email || "";
  const orgPresident = org?.president_name || "";

  // Member has no assigned group → show empty placeholder, hide any stale
  // live-auction / bids / payments / history sections that could otherwise
  // render from previously-hydrated state.
  const memberHasNoGroup = !isAdmin && !!me && groups.filter((g) => g.memberIds.includes(myId)).length === 0;

  return (
    <div className="min-h-screen bg-[var(--app-bg,#0a0a0a)] text-foreground p-4 md:p-6">
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .no-print { display: none !important; }
          /* Hide any Radix portal content (dialogs, popovers, tooltips, toasts) */
          [data-radix-portal],
          [data-radix-popper-content-wrapper],
          [role="dialog"],
          [role="alertdialog"],
          [data-sonner-toaster],
          [data-state="open"][data-radix-dialog-overlay] { display: none !important; }
          .print-only { display: block !important; }
          .print-area, .print-area * { color: #000 !important; }
          .print-area {
            position: absolute !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-area > *:last-child { page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }
          .print-page { page-break-after: auto; break-after: auto; }
          .print-page:last-child { page-break-after: avoid !important; break-after: avoid !important; }
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
            <p className="text-xs text-amber-300/90 font-medium">Welcome to C.H.S Chits</p>
            <p className="text-[11px] text-muted-foreground">లైవ్ చిట్ ఆక్షన్ రూమ్</p>
          </div>
        </div>

        {/* Admin-only compact header bar (member gets richer wireframe below) */}
        {isAdmin && me && (
          <Card className="p-3 md:p-4 bg-card flex items-center gap-3 flex-wrap">
            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs">
              {myCode || "—"}
            </Badge>
            <span className="font-semibold text-sm">{myName || "Admin"}</span>
            <span className="text-[11px] text-muted-foreground">Logged-in · లాగిన్</span>
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

        {/* ═══════════════ MEMBER WIREFRAME VIEW ═══════════════ */}
        {!isAdmin && me && (() => {
          const myGroups = groups.filter((g) => g.memberIds.includes(myId));
          const visibleGroupName = selectedGroupName || liveGroupName || myGroups[0]?.name || "";
          const activeGroup =
            myGroups.find((g) => g.name === visibleGroupName) || myGroups[0] || null;
          const closedMonths = pastWinners.length;
          const myBidsList = bids
            .filter((b) => b.memberId === myId)
            .sort((a, b) => a.submittedAt - b.submittedAt);

          return (
            <div className="space-y-3">
              {/* 2. Member Info Row */}
              <Card className="p-3 bg-card">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-mono">
                      {myCode || "—"}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                        Logged-in Member
                      </p>
                      <p className="font-semibold text-sm truncate">{myName || "Member"}</p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground mr-1">Groups:</span>
                    {myGroups.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">Not assigned</span>
                    ) : (
                      myGroups.map((g) => {
                        const active = visibleGroupName === g.name;
                        return (
                          <button
                            key={g.name}
                            onClick={() => setSelectedGroupName(g.name)}
                            className={`size-8 rounded-md border text-xs font-bold transition ${
                              active
                                ? "bg-amber-500 border-amber-500 text-black"
                                : "border-border hover:border-amber-500/60 text-foreground"
                            }`}
                            aria-label={g.name}
                          >
                            {g.name.replace(/^Group\s+/i, "").slice(0, 2) || g.name.slice(0, 2)}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>

              {/* Empty state — member is not assigned to any group */}
              {myGroups.length === 0 && (
                <Card className="p-6 bg-card border-dashed text-center space-y-1">
                  <p className="text-sm font-semibold">No active chit groups assigned</p>
                  <p className="text-[11px] text-muted-foreground">
                    మీరు ఏ చిట్ గ్రూప్‌లోనూ నమోదు కాలేదు. అడ్మిన్ మిమ్మల్ని ఒక గ్రూప్‌కి కేటాయించిన తర్వాత ఇక్కడ లైవ్ ఆక్షన్ కనిపిస్తుంది.
                  </p>
                </Card>
              )}

              {/* 3. Group Summary Card */}
              {activeGroup && (
                <Card className="p-3 md:p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-4 text-amber-400" />
                    <h2 className="font-semibold text-sm">{activeGroup.name} · Group Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <StatBox label="Total Members" value={String(activeGroup.memberIds.length)} />
                    <StatBox label="Total Months" value={String(totalMonths)} />
                    <StatBox
                      label="Start Date"
                      value={chitStartDate ? new Date(chitStartDate).toLocaleDateString() : "—"}
                    />
                    <StatBox label="Closed Months" value={`${closedMonths} / ${totalMonths}`} />
                  </div>
                </Card>
              )}

              {myGroups.length > 0 && (<>
              {/* 4. LIVE Chit Auction Board strip (table below is shared) */}
              <Card className="p-3 md:p-4 bg-card border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="font-semibold text-sm text-red-300">LIVE Chit Auction Board</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatBox
                    label="Start Time"
                    value={turnStart ? new Date(turnStart).toLocaleTimeString() : "—"}
                  />
                  <StatBox
                    label="Running Month"
                    value={`${currentMonth} / ${totalMonths}`}
                    highlight
                  />
                  <StatBox
                    label="Close Time"
                    value={turnEnd ? new Date(turnEnd).toLocaleTimeString() : "—"}
                  />
                </div>
              </Card>

              {/* 5. Calculator Metrics Row (member perspective) */}
              <Card className="p-3 md:p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="size-4 text-amber-400" />
                  <h2 className="font-semibold text-sm">My Calculator · నా లెక్క</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatBox
                    label="Commission %"
                    value={`${commissionPct}%`}
                    sub={fmt((chitValue * commissionPct) / 100)}
                  />
                  <StatBox
                    label="Interest"
                    value={`${calc.monthlyPct.toFixed(2)}%`}
                    sub={`≈ ${calc.annualPct.toFixed(1)}% /yr`}
                  />
                  <StatBox
                    label="Total"
                    value={fmt(
                      (chitValue * commissionPct) / 100 +
                        (myBidAmount || 0) +
                        (winner && winner.memberId !== myId ? winnerCalc?.dividend || 0 : 0),
                    )}
                    sub="Commission + Bid + Share"
                  />
                </div>
              </Card>

              {/* 6. Member Interactive Bidding Chat Box */}
              {!auctionClosed && (
                <Card className="p-3 md:p-4 bg-card border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Gavel className="size-4 text-amber-400" />
                    <h2 className="font-semibold text-sm">
                      {(myName || "Member").split(" ")[0]}'s Bidding Box
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={myBidAmount || ""}
                      onChange={(e) => setMyBidAmount(Number(e.target.value))}
                      placeholder={`${symbol} Enter challenge…`}
                      className="flex-1 h-11 text-base font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitOwnBid();
                      }}
                    />
                    <Button
                      onClick={submitOwnBid}
                      disabled={!myBidAmount || myBidAmount <= 0 || submittingMyBid}
                      className="h-11 font-bold px-4 bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {submittingMyBid ? "…" : "Send"}
                    </Button>
                  </div>
                  {myBidsList.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Your bids this round:{" "}
                      <b className="text-amber-300 tabular-nums">
                        {myBidsList.map((b) => fmt(b.amount)).join(", ")}
                      </b>
                    </p>
                  )}
                </Card>
              )}

              {/* Winner ID & Amount summary card */}
              {auctionClosed && winner && (
                <Card className="p-3 md:p-4 bg-card border-emerald-500/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="size-4 text-emerald-400" />
                    <h2 className="font-semibold text-sm text-emerald-300">Winner · విజేత</h2>
                  </div>
                  <p className="text-sm">
                    <span className="font-mono text-xs opacity-80 mr-2">
                      {winner.memberCode || "—"}
                    </span>
                    <b>{winner.memberName}</b>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Amount: <b className="text-amber-400 tabular-nums">{fmt(winner.amount)}</b>
                    {winnerCalc && (
                      <>
                        {" · "}Net Paid:{" "}
                        <b className="text-emerald-400 tabular-nums">{fmt(winnerCalc.net)}</b>
                      </>
                    )}
                  </p>
                </Card>
              )}
              </>)}
            </div>

          );
        })()}


        {/* ═══════════════ ADMIN MAIN LIVE BOARD (wireframe layout) ═══════════════ */}
        {isAdmin && (<>

        {/* 1. Top Admin Creation Section */}
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="size-4 text-amber-400" />
            <h2 className="font-semibold">Group Setup · గ్రూప్ సెటప్</h2>
            <Badge variant="secondary" className="text-xs">{participants.length} members</Badge>
            {setupCollapsed && liveGroupName && (
              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-xs">
                Saved: {liveGroupName}
              </Badge>
            )}
            <div className="ml-auto flex gap-2">
              {setupCollapsed ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setSetupCollapsed(false)} className="gap-1.5 text-xs">
                    Edit
                  </Button>
                  <Button size="sm" onClick={startNewGroup} className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold">
                    <Plus className="size-3.5" /> Setup Next Group
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setSetupCollapsed(true)} className="gap-1.5 text-xs">
                  Minimize
                </Button>
              )}
            </div>
          </div>

          {!setupCollapsed && (<>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Group + · గ్రూప్</Label>
              <Input
                value={chitGroupName}
                onChange={(e) => setChitGroupName(e.target.value)}
                placeholder="Group A"
                className="h-10 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Select a member to add (ID / Name)</Label>
              <div className="flex gap-1.5">
                <Select value={pickerValue} onValueChange={setPickerValue}>
                  <SelectTrigger className="flex-1 h-10">
                    <SelectValue placeholder="Pick — e.g., A / 0003" />
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
                      <div className="px-2 py-3 text-xs text-muted-foreground">No approved members.</div>
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={addParticipant} disabled={!pickerValue} size="icon" className="h-10 w-10 shrink-0">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">బిగినింగ్ Date · Start</Label>
              <Input type="date" value={chitStartDate} onChange={(e) => setChitStartDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Months · మొత్తం నెలలు</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={totalMonths || ""}
                onChange={(e) => setTotalMonths(Number(e.target.value))}
                placeholder="e.g., 10 or 20"
                className="h-10 font-bold tabular-nums"
              />
              <p className="text-[10px] text-muted-foreground">Once a month · నెలకు ఒకసారి</p>
            </div>
          </div>

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <span key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs">
                  <span className="text-amber-400 font-semibold">#{i + 1}</span>
                  <span className="font-mono opacity-80">{p.member_code || "—"}</span>
                  <span>{p.name}</span>
                  <button onClick={() => removeParticipant(p.id)} className="ml-0.5 opacity-60 hover:opacity-100" aria-label={`Remove ${p.name}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Foreman / Terms / Close time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Foreman Benefit · ఫోర్‌మ్యాన్</Label>
              <Select value={foremanMode} onValueChange={(v) => setForemanMode(v as any)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">Commission % per month</SelectItem>
                  <SelectItem value="free_month">Free month (no bidding)</SelectItem>
                </SelectContent>
              </Select>
              {foremanMode === "commission" ? (
                <Input type="number" min={0} step={0.1} value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))}
                  placeholder="Commission %" className="h-9 tabular-nums" />
              ) : (
                <Input type="number" min={1} max={totalMonths || 60}
                  value={foremanFreeMonth ?? ""}
                  onChange={(e) => setForemanFreeMonth(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Free month # (e.g. 1)" className="h-9 tabular-nums" />
              )}
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={foremanIncluded} onChange={(e) => setForemanIncluded(e.target.checked)} />
                Foreman included in member count
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auction Close Time · క్లోజ్</Label>
              <Input type="datetime-local"
                value={closeAt ? new Date(closeAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => setCloseAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="h-10" />
              <p className="text-[10px] text-muted-foreground">5-min warning auto-triggers.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Terms · నిబంధనలు</Label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)}
                rows={3} placeholder="Group rules, penalties, payment cycle…"
                className="w-full text-xs rounded-md border border-border bg-background p-2" />
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-border">
            <div className="rounded-md border border-border bg-black/30 p-2.5">
              <p className="text-[10px] uppercase text-muted-foreground">మొత్తం మెంబర్స్</p>
              <p className="text-lg font-bold tabular-nums">{participants.length}</p>
            </div>
            <div className="rounded-md border border-border bg-black/30 p-2.5">
              <p className="text-[10px] uppercase text-muted-foreground">Total అమౌంటు</p>
              <Input
                type="number" inputMode="decimal" value={chitValue}
                onChange={(e) => setChitValue(Number(e.target.value))}
                className="h-7 text-base font-bold p-1 tabular-nums border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <Button
              onClick={saveGroup}
              disabled={participants.length === 0 || !chitGroupName.trim() || !totalMonths}
              className="h-full bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5"
            >
              <CheckCircle2 className="size-4" /> సేవ్ / ఎడిట్
            </Button>
            <Button
              onClick={() => deleteGroup(chitGroupName)}
              disabled={!groups.some((g) => g.name.toLowerCase() === chitGroupName.trim().toLowerCase())}
              variant="destructive"
              className="h-full font-bold gap-1.5"
            >
              <X className="size-4" /> డిలీట్
            </Button>
          </div>

          <p className="text-[11px] text-amber-300/80 italic">(సభ్యులు అందరూ అప్రూవల్ చేయాలి)</p>

          {groups.length > 0 && (
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              Saved: <b className="text-foreground">{groups.map((g) => g.name).join(", ")}</b>
            </div>
          )}
          </>)}
        </Card>

        {/* Live-auction group selector — nothing loads until admin picks a saved group */}
        <Card className="p-3 md:p-4 bg-card border-amber-500/30">
          <div className="flex items-center gap-2 flex-wrap">
            <Gavel className="size-4 text-amber-400" />
            <h2 className="font-semibold text-sm">Select Group for Live Auction</h2>
            <div className="ml-auto flex items-center gap-2 flex-1 md:flex-none md:min-w-[240px]">
              <Select
                value={liveGroupName}
                onValueChange={loadGroupIntoLive}
                disabled={groups.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={groups.length ? "— Choose a saved group —" : "Save a group first"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.name} value={g.name}>
                      {g.name} · {(g.memberIds || []).length} members
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {liveGroupName && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLiveGroupName("");
                    setParticipants([]);
                    setBids([]);
                    setPastWinners([]);
                    setTurnStart(null);
                    setTurnEnd(null);
                    setAuctionClosed(false);
                    setWinner(null);
                    setCurrentMonth(1);
                    setActiveAuctionId(null);
                    activeAuctionIdRef.current = null;
                  }}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {!liveGroupName && (
            <p className="text-[11px] text-muted-foreground italic mt-2">
              Live members and metrics load only after you select a saved group.
            </p>
          )}
        </Card>

        {/* 2 + 3. Main "లైవ్ చీటీ" Container: Left members board + Right metrics panel */}
        {liveGroupName && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT — Member List Display with sequential bidding capsules */}
          <Card className="lg:col-span-2 p-4 md:p-5 space-y-3 bg-card border-red-500/30">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="font-bold text-red-300">లైవ్ చీటీ · Live Auction</h2>
                <Badge variant="secondary" className="text-xs">Month {currentMonth}/{totalMonths}</Badge>
              </div>
              {!turnStart && !auctionClosed && (
                <Button size="sm" variant="outline" onClick={startTurn} className="gap-1 text-xs">
                  <Clock className="size-3.5" /> Start Turn
                </Button>
              )}
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Add chit group members above to see the live board.
              </div>
            ) : (
              <div className="space-y-1.5">
                {participants.map((p) => {
                  const list = perMember[p.id] || [];
                  const isWinner = auctionClosed && winner?.memberId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                        isWinner ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-black/30"
                      }`}
                    >
                      <span className="font-mono text-[11px] w-14 shrink-0 opacity-80">{p.member_code || "—"}</span>
                      <span className="text-sm font-medium truncate w-28 shrink-0">{p.name}</span>
                      {/* Wide horizontal bid capsule */}
                      <div className="flex-1 flex items-center gap-1 overflow-x-auto rounded-full bg-black/50 border border-border px-2 py-1 min-h-[28px]">
                        {list.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground italic px-1">— no bids —</span>
                        ) : (
                          list.map((b, i) => (
                            <span
                              key={b.id}
                              className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                                i === list.length - 1
                                  ? "bg-amber-500/25 text-amber-200 font-bold"
                                  : "bg-white/5 text-foreground/80"
                              }`}
                            >
                              {fmt(b.amount)}
                            </span>
                          ))
                        )}
                      </div>
                      {isWinner && <Trophy className="size-4 text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Left Row — Control Inputs */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* సవాలు సెట్ */}
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-[11px] text-amber-300">సవాలు సెట్</Label>
                  <Select value={activeBidder} onValueChange={setActiveBidder}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={participants.length ? "Bidder" : "Add members"} />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.member_code ? `${p.member_code} — ` : ""}{p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-[11px] text-amber-300">Bid Amount</Label>
                  <Input
                    type="number" inputMode="decimal" value={bid || ""}
                    onChange={(e) => setBid(Number(e.target.value))}
                    placeholder={`${symbol} 0`}
                    className="h-9 font-bold"
                    disabled={auctionClosed}
                  />
                </div>
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-[11px] text-transparent select-none">.</Label>
                  <Button
                    onClick={submitBid}
                    disabled={auctionClosed || !bid || calc.overCap || !activeBidder}
                    className="w-full h-9 font-bold"
                  >
                    సవాలు సెట్
                  </Button>
                </div>
              </div>

              {calc.overCap && !auctionClosed && (
                <p className="text-[11px] text-red-400">⚠️ Bid exceeds 40% cap (max {fmt(calc.maxBid)})</p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={closeEntry}
                  disabled={auctionClosed || bids.length === 0}
                  variant="outline"
                  className="gap-1.5 font-semibold"
                >
                  <Lock className="size-3.5" /> ఎంట్రీ క్లోజ్
                </Button>
                <Button
                  onClick={finalizeAuction}
                  disabled={auctionClosed || sortedBids.length === 0}
                  className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Trophy className="size-3.5" /> క్లోజ్ · Finalize
                </Button>
              </div>

              {auctionClosed && (
                <Button
                  size="sm" variant="outline" onClick={resetAuction}
                  className="w-full gap-1.5 text-xs mt-1"
                >
                  <RotateCcw className="size-3.5" /> Reset / Next Month
                </Button>
              )}
            </div>
          </Card>

          {/* RIGHT — Live Metrics & Calculator Panel */}
          <Card className="lg:col-span-1 p-3 md:p-4 space-y-2 bg-gradient-to-b from-zinc-900 to-black border-amber-500/30">
            <div className="flex items-center gap-2">
              <Percent className="size-4 text-amber-400" />
              <h2 className="font-bold text-amber-400 text-sm">Live Metrics</h2>
            </div>

            {/* Start / Close time */}
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Start · స్టార్ట్" value={turnStart ? new Date(turnStart).toLocaleTimeString() : "—"} />
              <StatBox label="Close · క్లోజ్" value={turnEnd ? new Date(turnEnd).toLocaleTimeString() : "—"} />
            </div>

            {/* Current Month / Interest */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-black/30 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">కరెంటు నెల</p>
                <Input
                  type="number" inputMode="numeric" value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className="h-7 text-base font-bold p-1 tabular-nums border-0 bg-transparent focus-visible:ring-0"
                />
                <p className="text-[9px] text-muted-foreground">of {totalMonths}</p>
              </div>
              <StatBox
                label="Interest · ఇన్ట్రెస్ట్"
                value={`${calc.monthlyPct.toFixed(2)}%`}
                sub={`≈ ${calc.annualPct.toFixed(1)}%/yr`}
              />
            </div>

            {/* Commission / Members must pay */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-black/30 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">కమిషన్ %</p>
                <Input
                  type="number" inputMode="decimal" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))}
                  className="h-7 text-base font-bold p-1 tabular-nums border-0 bg-transparent focus-visible:ring-0"
                />
                <p className="text-[9px] text-muted-foreground tabular-nums">{fmt(calc.commission)}</p>
              </div>
              <StatBox
                label="Amount per member"
                value={fmt(calc.perMember)}
                sub={calc.topBid > 0 ? `(${fmt(chitValue)} − ${fmt(calc.topBid)}) / ${participants.length || 0}` : "per member"}
              />

            </div>

            {/* Winner box */}
            <div className={`rounded-md border p-2.5 ${winner ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-black/30"}`}>
              <p className="text-[10px] uppercase text-muted-foreground">విజేత ఎవరు · Winner</p>
              {winner ? (
                <>
                  <p className="text-sm font-bold text-emerald-300 truncate">
                    <span className="font-mono opacity-80 mr-1">{winner.memberCode || "—"}</span>
                    {winner.memberName}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">Bid {fmt(winner.amount)}</p>
                </>
              ) : (
                <p className="text-sm italic text-muted-foreground">— pending —</p>
              )}
            </div>

            {/* Amount handed over */}
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
              <p className="text-[10px] uppercase text-amber-200/80">అతనికి అందజేసే మొత్తం</p>
              <p className="text-lg font-bold text-amber-300 tabular-nums">
                {winnerCalc ? fmt(winnerCalc.net) : fmt(Math.max(0, chitValue - bid - calc.commission))}
              </p>
              {winnerCalc && (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Dividend: {fmt(winnerCalc.dividend)}
                </p>
              )}
            </div>
          </Card>
        </div>
        )}

        {/* 4. Footer — పాస్ట్ డిటైల్స్ + Save + PDF (only when a live group is loaded) */}
        {liveGroupName && participants.length > 0 && (
        <Card className="p-4 md:p-5 space-y-3 bg-card">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" />
            <h2 className="font-semibold">పాస్ట్ డిటైల్స్ · Past History</h2>
            <Badge variant="secondary" className="text-xs">{pastWinners.length}</Badge>
          </div>

          {pastWinners.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-3">No past auctions yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {[...pastWinners].sort((a, b) => a.month - b.month).map((w) => (
                <li key={w.month} className="flex items-center justify-between gap-3 rounded-md border border-border bg-black/30 px-3 py-2">
                  <span className="min-w-0 truncate">
                    <b className="text-amber-300">{ordinal(w.month)}</b>
                    <span className="font-mono text-xs opacity-80 mx-2">{w.memberCode || "—"}</span>
                    <b>{w.memberName}</b>
                  </span>
                  <span className="text-amber-400 font-bold tabular-nums shrink-0">{fmt(w.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <Button
              onClick={saveGroup}
              disabled={participants.length === 0 || !chitGroupName.trim()}
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <CheckCircle2 className="size-4" /> సేవ్
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-1.5 font-semibold">
              <Printer className="size-4" /> PDF
            </Button>
          </div>
        </Card>
        )}

        </>)}


        {!isAdmin && !memberHasNoGroup && (<>
        {/* Members see a single, unified "Live Bids Activity" feed below —
            the per-member sequential board is admin-only to avoid a duplicate
            bidding surface on mobile screens. */}

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
        </>)}

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

        {/* 7. Footer — Paid & Received History (member) + Print button */}
        {!isAdmin && me && !memberHasNoGroup && (() => {
          const myReceived = pastWinners
            .filter((w) => w.memberId === myId)
            .reduce((s, w) => s + w.net, 0);
          const myPaid = pastWinners
            .filter((w) => w.memberId !== myId)
            .reduce((s, w) => s + w.dividend, 0);
          const myWins = pastWinners.filter((w) => w.memberId === myId);
          return (
            <Card className="p-3 md:p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="size-4 text-amber-400" />
                <h2 className="font-semibold text-sm">
                  Paid & Received History · చెల్లింపు వివరాలు
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <StatBox label="Total Received" value={fmt(myReceived)} highlight />
                <StatBox label="Total Paid (Dividends)" value={fmt(myPaid)} />
              </div>
              {myWins.length > 0 ? (
                <ul className="space-y-1 text-xs">
                  {myWins.map((w) => (
                    <li
                      key={w.month}
                      className="flex items-center justify-between rounded border border-border bg-black/30 px-2 py-1.5"
                    >
                      <span>
                        <b>{ordinal(w.month)}</b> Month · You won
                      </span>
                      <span className="text-amber-400 font-bold tabular-nums">
                        {fmt(w.net)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No wins yet. Keep participating!
                </p>
              )}
            </Card>
          );
        })()}

        {/* Payments panel — receipts (member upload / admin verify) */}
        {orgId && activeAuctionId && !memberHasNoGroup && (isAdmin ? (!!liveGroupName && participants.length > 0) : true) && (
          <AuctionPaymentsPanel
            orgId={orgId}
            auctionId={activeAuctionId}
            monthNo={currentMonth}
            amount={participants.length > 0 ? Math.round((chitValue || 0) / participants.length) : 0}
            isAdmin={!!isAdmin}
          />
        )}

        {/* Footer — Print button at the very bottom (member view; admin has its own PDF footer above) */}
        {!isAdmin && (
          <div className="pt-4 pb-6 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                {orgName} · {org?.slogan || "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ"}
                {orgRegNo && <> · Reg {orgRegNo}</>}
              </p>
              <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto">
                <Printer className="size-4" /> Print Official Auction PDF
              </Button>
            </div>
          </div>
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

function StatBox({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border p-2 ${
        highlight
          ? "border-amber-500/60 bg-amber-500/10"
          : "border-border bg-black/30"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </p>
      <p
        className={`text-sm font-bold tabular-nums leading-tight mt-0.5 ${
          highlight ? "text-amber-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
