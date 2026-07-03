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

const AUCTION_SESSION_SELECT = [
  "id",
  "org_id",
  "group_name",
  "live_group_name",
  "participants",
  "chit_value",
  "total_months",
  "current_month",
  "commission_pct",
  "start_date",
  "turn_start",
  "turn_end",
  "auction_closed",
  "status",
  "winner_bid_id",
  "winner_member_id",
  "winner_member_name",
  "winner_member_code",
  "winner_amount",
  "winner_net",
  "winner_dividend",
  "past_winners",
  "consents",
  "foreman_mode",
  "foreman_free_month",
  "foreman_included",
  "terms",
  "close_at",
  "total_members",
  "created_at",
  "updated_at",
].join(",");

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
    foremanMode: ((row.foreman_mode as any) || "commission") as "commission" | "free_month",
    foremanFreeMonth: row.foreman_free_month ?? null,
    foremanIncluded: row.foreman_included ?? true,
    terms: row.terms ?? null,
    closeAt: row.close_at ?? null,
    totalMembers: row.total_members ?? null,
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
      .select(AUCTION_SESSION_SELECT)
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
          foreman_mode: state.foremanMode ?? "commission",
          foreman_free_month: state.foremanFreeMonth ?? null,
          foreman_included: state.foremanIncluded ?? true,
          terms: state.terms ?? null,
          close_at: state.closeAt ?? null,
          total_members: state.totalMembers ?? (state.participants?.length ?? null),
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,group_name" },
      )
      .select(AUCTION_SESSION_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: rows } = await sb
      .from("auction_sessions")
      .select(AUCTION_SESSION_SELECT)
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
    const { data: rows } = await sb.from("auction_sessions").select(AUCTION_SESSION_SELECT).eq("org_id", data.orgId).order("updated_at", { ascending: false });
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

export const deleteAuctionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("auction_sessions").delete().eq("id", data.auctionId).eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizeAuction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.rpc("finalize_chit_auction", {
      _org_id: data.orgId,
      _auction_id: data.auctionId,
    });
    if (error) throw new Error(error.message);
    return { session: row ?? null };
  });

export const resetChitMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.rpc("reset_chit_month", {
      _org_id: data.orgId,
      _auction_id: data.auctionId,
    });
    if (error) throw new Error(error.message);
    return { session: row ?? null };
  });

export type PaymentDTO = {
  id: string;
  auction_id: string;
  org_id: string;
  member_id: string;
  month_no: number;
  amount: number;
  receipt_url: string | null;
  status: "pending" | "verified" | "rejected";
  note: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string | null;
  member_code?: string | null;
};

export const listAuctionPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId?: string | null; monthNo?: number | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from("auction_payments").select("*").eq("org_id", data.orgId);
    if (data.auctionId) q = q.eq("auction_id", data.auctionId);
    if (data.monthNo != null) q = q.eq("month_no", data.monthNo);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const memberIds = Array.from(new Set((rows ?? []).map((r: any) => r.member_id)));
    let names: Record<string, { name: string; member_code: string | null }> = {};
    if (memberIds.length) {
      const { data: ms } = await sb
        .from("members")
        .select("id, name, first_name, last_name, member_code")
        .in("id", memberIds);
      for (const m of ms ?? []) {
        names[m.id] = {
          name: m.name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "Member",
          member_code: m.member_code ?? null,
        };
      }
    }
    return {
      payments: (rows ?? []).map((r: any) => ({
        ...r,
        member_name: names[r.member_id]?.name ?? null,
        member_code: names[r.member_id]?.member_code ?? null,
      })) as PaymentDTO[],
    };
  });

export const uploadAuctionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    orgId: string;
    auctionId: string;
    monthNo: number;
    amount: number;
    receiptUrl?: string | null;
    note?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: me, error: meErr } = await sb
      .from("members").select("id").eq("user_id", context.userId).eq("org_id", data.orgId).eq("status", "approved").maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.id) throw new Error("Not an approved member of this organization");
    const { data: row, error } = await sb
      .from("auction_payments")
      .insert({
        auction_id: data.auctionId,
        org_id: data.orgId,
        member_id: me.id,
        month_no: data.monthNo,
        amount: data.amount,
        receipt_url: data.receiptUrl ?? null,
        note: data.note ?? null,
        status: "pending",
        uploaded_by: context.userId,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { payment: row };
  });

export const verifyAuctionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; paymentId: string; status: "verified" | "rejected" | "pending"; note?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: any = { status: data.status, verified_by: context.userId, verified_at: new Date().toISOString() };
    if (data.note !== undefined) patch.note = data.note;
    const { data: row, error } = await sb
      .from("auction_payments")
      .update(patch)
      .eq("id", data.paymentId)
      .eq("org_id", data.orgId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { payment: row };
  });

export const getPaymentReceiptSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: signed, error } = await sb.storage.from("chit-receipts").createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

// ─────────────────────── Past Months Reports Archive ───────────────────────

export type MonthArchiveDTO = {
  id: string;
  org_id: string;
  auction_id: string;
  group_name: string;
  month_no: number;
  chit_value: number;
  total_months: number;
  commission_pct: number;
  participants: Array<{ id: string; name: string; member_code?: string | null }>;
  bids: Array<{
    id: string;
    memberId: string;
    memberName: string;
    memberCode?: string | null;
    amount: number;
    submittedAt: number;
  }>;
  consents: Record<string, {
    memberId: string;
    memberName: string;
    signatureTag: string;
    signedAt: number;
  }>;
  winner: {
    memberId: string;
    memberName: string;
    memberCode?: string | null;
    amount: number;
    net: number;
    dividend: number;
    commission: number;
  } | null;
  turn_start: string | null;
  turn_end: string | null;
  closed_at: string;
  created_at: string;
};

export const listMonthArchives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from("auction_month_archives").select("*").eq("org_id", data.orgId);
    if (data.auctionId) q = q.eq("auction_id", data.auctionId);
    const { data: rows, error } = await q.order("month_no", { ascending: true });
    if (error) throw new Error(error.message);
    return { archives: (rows ?? []) as MonthArchiveDTO[] };
  });

export const getMonthArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; archiveId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("auction_month_archives")
      .select("*")
      .eq("id", data.archiveId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { archive: (row ?? null) as MonthArchiveDTO | null };
  });

/**
 * Archives the current finalized month of an auction session into
 * `auction_month_archives` (full bid history, consents, winner details),
 * then advances the live session to the next month. Used by the Admin
 * "Reset / Next Month" button so historical PDF reports are never lost.
 */
export const archiveAndResetMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; auctionId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // 1. Load the current session + all bids for the month being archived.
    const { data: session, error: sessErr } = await sb
      .from("auction_sessions")
      .select(AUCTION_SESSION_SELECT)
      .eq("id", data.auctionId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (sessErr) throw new Error(sessErr.message);
    if (!session) throw new Error("Auction session not found");

    const { data: bidRows, error: bidErr } = await sb
      .from("bids")
      .select("id, member_id, member_name, member_code, amount, submitted_at")
      .eq("auction_id", data.auctionId)
      .order("submitted_at", { ascending: true });
    if (bidErr) throw new Error(bidErr.message);

    const chitValue = Number(session.chit_value) || 0;
    const commissionPct = Number(session.commission_pct) || 0;
    const commission = (chitValue * commissionPct) / 100;
    const participants = normalizeParticipants(session.participants);

    const winnerAmount = Number(session.winner_amount) || 0;
    const net = Number(session.winner_net) || Math.max(0, chitValue - winnerAmount - commission);
    const others = Math.max(1, participants.length - 1);
    const dividend = Number(session.winner_dividend) ||
      Math.max(0, (winnerAmount - commission)) / others;

    const winner = session.winner_member_id ? {
      memberId: session.winner_member_id,
      memberName: session.winner_member_name ?? "Winner",
      memberCode: session.winner_member_code ?? null,
      amount: winnerAmount,
      net,
      dividend,
      commission,
    } : null;

    // 2. Upsert the archive row (idempotent on (auction_id, month_no)).
    const archivePayload = {
      org_id: data.orgId,
      auction_id: data.auctionId,
      group_name: session.group_name,
      month_no: session.current_month,
      chit_value: chitValue,
      total_months: Number(session.total_months) || 0,
      commission_pct: commissionPct,
      participants,
      bids: normalizeBids(bidRows ?? []),
      consents: (session.consents && typeof session.consents === "object" && !Array.isArray(session.consents))
        ? session.consents : {},
      winner,
      turn_start: session.turn_start,
      turn_end: session.turn_end ?? new Date().toISOString(),
      closed_at: new Date().toISOString(),
      archived_by: context.userId,
    };

    const { data: archiveRow, error: archiveErr } = await sb
      .from("auction_month_archives")
      .upsert(archivePayload, { onConflict: "auction_id,month_no" })
      .select("*")
      .maybeSingle();
    if (archiveErr) throw new Error(archiveErr.message);

    // 3. Now call the existing DB reset RPC (deletes live bids, advances month).
    const { data: nextSession, error: resetErr } = await sb.rpc("reset_chit_month", {
      _org_id: data.orgId,
      _auction_id: data.auctionId,
    });
    if (resetErr) throw new Error(resetErr.message);

    return { archive: archiveRow as MonthArchiveDTO, session: nextSession ?? null };
  });
