import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuctionStateDTO = {
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
  groups?: Array<{
    name: string;
    memberIds: string[];
    memberCodes?: Array<string | null>;
    memberNames?: string[];
    savedAt: number;
  }>;
};

export const getAuctionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("chit_auctions")
      .select("state, updated_at")
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { state: (row?.state as AuctionStateDTO) ?? null, updatedAt: row?.updated_at ?? null };
  });

export const saveAuctionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; state: AuctionStateDTO }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("chit_auctions")
      .upsert(
        {
          org_id: data.orgId,
          state: data.state,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" },
      )
      .select("state, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { state: (row?.state as AuctionStateDTO) ?? data.state, updatedAt: row?.updated_at ?? null };
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
    return { state: ((row as any)?.state as AuctionStateDTO) ?? null };
  });

export const submitMemberBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; amount: number }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.rpc("submit_chit_bid", {
      _org_id: data.orgId,
      _amount: data.amount,
    });
    if (error) throw new Error(error.message);
    return { state: (row as AuctionStateDTO) ?? null };
  });
