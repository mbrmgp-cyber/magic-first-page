import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuctionStateDTO = {
  activeAuctionId?: string;
  groupName?: string;
  liveGroupName?: string;
  chitValue?: number;
  totalMonths?: number;
  currentMonth?: number;
  commissionPct?: number;
  startDate?: string;
  participants?: Array<{ id: string; name: string; member_code?: string | null }>;
  bids?: Array<{
    id: string;
    memberId: string;
    memberName: string;
    memberCode?: string | null;
    amount: number;
    submittedAt: number;
  }>;
  pastWinners?: Array<{
    month: number;
    memberId: string;
    memberCode?: string | null;
    memberName: string;
    amount: number;
    net: number;
    dividend: number;
    closedAt: number;
  }>;
  consents?: Record<string, {
    memberId: string;
    memberName: string;
    memberCode?: string;
    signatureTag: string;
    signedAt: number;
  }>;
  winner?: {
    id: string;
    memberId: string;
    memberName: string;
    memberCode?: string | null;
    amount: number;
    submittedAt: number;
  } | null;
  auctionClosed?: boolean;
  turnStart?: number | null;
  turnEnd?: number | null;
  // Foreman / group config
  foremanMode?: "commission" | "free_month";
  foremanFreeMonth?: number | null;
  foremanIncluded?: boolean;
  terms?: string | null;
  closeAt?: string | null;
  totalMembers?: number | null;
  groups?: Array<{
    auctionId?: string;
    name: string;
    memberIds: string[];
    memberCodes?: Array<string | null>;
    memberNames?: string[];
    totalMonths?: number;
    chitValue?: number;
    startDate?: string | null;
    savedAt: number;
    foremanMode?: "commission" | "free_month";
    foremanFreeMonth?: number | null;
    foremanIncluded?: boolean;
    terms?: string | null;
    closeAt?: string | null;
    totalMembers?: number | null;
    commissionPct?: number;
  }>;
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
  foreman_mode: string | null;
  foreman_free_month: number | null;
  foreman_included: boolean | null;
  terms: string | null;
  close_at: string | null;
  total_members: number | null;
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
};

const ms = (value?: string | null) => (value ? new Date(value).getTime() : null);

function normalizeParticipants(value: unknown): NonNullable<AuctionStateDTO["participants"]> {
  return Array.isArray(value)
    ? value
        .map((p: any) => ({ id: String(p.id ?? ""), name: String(p.name ?? ""), member_code: p.member_code ?? null }))
        .filter((p) => p.id)
    : [];
}

function normalizeBids(rows: BidRow[] | null | undefined): NonNullable<AuctionStateDTO["bids"]> {
  return (rows ?? []).map((b) => ({
    id: b.id,
    memberId: b.member_id,
    memberName: b.member_name,
    memberCode: b.member_code,
    amount: Number(b.amount) || 0,
    submittedAt: new Date(b.submitted_at).getTime(),
  }));
}

function sessionToGroup(row: AuctionSessionRow) {
  const participants = normalizeParticipants(row.participants);
  return {
    auctionId: row.id,
    name: row.group_name,
    memberIds: participants.map((p) => p.id),
    memberCodes: participants.map((p) => p.member_code ?? null),
    memberNames: participants.map((p) => p.name),
    totalMonths: row.total_months,
    chitValue: Number(row.chit_value) || 0,
    startDate: row.start_date,
    savedAt: new Date(row.created_at || row.updated_at).getTime(),
    foremanMode: ((row.foreman_mode as any) || "commission") as "commission" | "free_month",
    foremanFreeMonth: row.foreman_free_month ?? null,
    foremanIncluded: row.foreman_included ?? true,
    terms: row.terms ?? null,
    closeAt: row.close_at ?? null,
    totalMembers: row.total_members ?? null,
    commissionPct: Number(row.commission_pct) || 0,
  };
}

function sessionToState(row: AuctionSessionRow, bidRows: BidRow[], allRows: AuctionSessionRow[]): AuctionStateDTO {
  const bids = normalizeBids(bidRows);
  const winner = row.winner_member_id
    ? {
        id: row.winner_bid_id ?? `winner-${row.winner_member_id}`,
        memberId: row.winner_member_id,
        memberName: row.winner_member_name ?? "Winner",
        memberCode: row.winner_member_code,
        amount: Number(row.winner_amount) || 0,
        submittedAt: ms(row.turn_end) ?? Date.now(),
      }
    : null;
  return {
    activeAuctionId: row.id,
    groupName: row.group_name,
    liveGroupName: row.live_group_name ?? row.group_name,
    chitValue: Number(row.chit_value) || 0,
    totalMonths: row.total_months,
    currentMonth: row.current_month,
    commissionPct: Number(row.commission_pct) || 0,
    startDate: row.start_date ?? undefined,
    participants: normalizeParticipants(row.participants),
    bids,
    pastWinners: Array.isArray(row.past_winners) ? row.past_winners as any : [],
    consents: row.consents && typeof row.consents === "object" && !Array.isArray(row.consents) ? row.consents as any : {},
    groups: allRows.map(sessionToGroup),
    winner,
    auctionClosed: row.auction_closed || row.status === "closed",
    turnStart: ms(row.turn_start),
    turnEnd: ms(row.turn_end),
  };
}

function isoFromMs(value?: number | null) {
  return value ? new Date(value).toISOString() : null;
}

export const getAuctionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("auction_sessions")
      .select("*")
      .eq("org_id", data.orgId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const sessions = (rows ?? []) as AuctionSessionRow[];
    const active = sessions.find((r) => r.status !== "closed" && !r.auction_closed) ?? sessions[0] ?? null;
    if (!active) return { state: null, updatedAt: null, sessionId: null };
    const { data: bidRows, error: bidError } = await sb
      .from("bids")
      .select("id, member_id, member_name, member_code, amount, submitted_at")
      .eq("auction_id", active.id)
      .order("submitted_at", { ascending: true });
    if (bidError) throw new Error(bidError.message);
    return { state: sessionToState(active, bidRows ?? [], sessions), updatedAt: active.updated_at, sessionId: active.id };
  });

export const saveAuctionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; state: AuctionStateDTO }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const state = data.state;
    const groupName = (state.liveGroupName || state.groupName || "Group A").trim();
    const winnerNet = state.pastWinners?.find((w) => w.month === state.currentMonth)?.net ?? null;
    const winnerDividend = state.pastWinners?.find((w) => w.month === state.currentMonth)?.dividend ?? null;
    const { data: row, error } = await sb
      .from("auction_sessions")
      .upsert(
        {
          org_id: data.orgId,
          group_name: groupName,
          live_group_name: state.liveGroupName || groupName,
          participants: state.participants ?? [],
          chit_value: state.chitValue ?? 100000,
          total_months: state.totalMonths ?? 20,
          current_month: state.currentMonth ?? 1,
          commission_pct: state.commissionPct ?? 5,
          start_date: state.startDate || null,
          turn_start: isoFromMs(state.turnStart),
          turn_end: isoFromMs(state.turnEnd),
          auction_closed: !!state.auctionClosed,
          status: state.auctionClosed ? "closed" : "active",
          winner_bid_id: state.winner?.id ?? null,
          winner_member_id: state.winner?.memberId ?? null,
          winner_member_name: state.winner?.memberName ?? null,
          winner_member_code: state.winner?.memberCode ?? null,
          winner_amount: state.winner?.amount ?? null,
          winner_net: winnerNet,
          winner_dividend: winnerDividend,
          past_winners: state.pastWinners ?? [],
          consents: state.consents ?? {},
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,group_name" },
      )
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: rows } = await sb
      .from("auction_sessions")
      .select("*")
      .eq("org_id", data.orgId)
      .order("updated_at", { ascending: false });
    const { data: bidRows, error: bidError } = await sb
      .from("bids")
      .select("id, member_id, member_name, member_code, amount, submitted_at")
      .eq("auction_id", row.id)
      .order("submitted_at", { ascending: true });
    if (bidError) throw new Error(bidError.message);
    return { state: sessionToState(row as AuctionSessionRow, bidRows ?? [], (rows ?? []) as AuctionSessionRow[]), updatedAt: row?.updated_at ?? null, sessionId: row?.id ?? null };
  });

export const submitAuctionConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; signatureTag: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.rpc("submit_chit_consent", {
      _org_id: data.orgId,
      _signature_tag: data.signatureTag,
    });
    if (error) throw new Error(error.message);
    const session = row as AuctionSessionRow;
    const { data: rows } = await sb.from("auction_sessions").select("*").eq("org_id", data.orgId).order("updated_at", { ascending: false });
    const { data: bidRows } = await sb
      .from("bids")
      .select("id, member_id, member_name, member_code, amount, submitted_at")
      .eq("auction_id", session.id)
      .order("submitted_at", { ascending: true });
    return { state: sessionToState(session, bidRows ?? [], (rows ?? []) as AuctionSessionRow[]) };
  });

export const submitMemberBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; amount: number; auctionId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.rpc("submit_chit_bid", {
      _org_id: data.orgId,
      _amount: data.amount,
      _auction_id: data.auctionId ?? null,
    });
    if (error) throw new Error(error.message);
    return { result: row ?? null };
  });
