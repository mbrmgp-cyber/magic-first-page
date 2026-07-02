/**
 * Canonical Chit Fund calculations.
 * Single source of truth for Admin + Member dashboards.
 *
 * Business formulas (dynamic — no hardcoded values):
 *   interestPct        = (highestBid / chitValue) * 100
 *   dividendPool       = highestBid
 *   dividendPerMember  = dividendPool / totalMembers
 *   monthlyShare       = chitValue / totalMembers
 *   netPayPerMember    = monthlyShare - dividendPerMember
 *   foremanCommission  = mode === "commission" ? chitValue * commissionPct/100 : 0
 */

export type ForemanMode = "commission" | "free_month";

export type ChitConfig = {
  chitValue: number;
  totalMembers: number;
  commissionPct?: number;
  foremanMode?: ForemanMode;
  foremanFreeMonth?: number | null;
  currentMonth?: number;
};

export type ChitBid = { amount: number };

export type ChitMetrics = {
  highestBid: number;
  interestPct: number;
  dividendPool: number;
  dividendPerMember: number;
  monthlyShare: number;
  netPayPerMember: number;
  foremanCommission: number;
  isForemanMonth: boolean;
};

export function computeChitMetrics(config: ChitConfig, bids: ChitBid[]): ChitMetrics {
  const chitValue = Math.max(0, Number(config.chitValue) || 0);
  const totalMembers = Math.max(1, Number(config.totalMembers) || 1);
  const commissionPct = Math.max(0, Number(config.commissionPct) || 0);
  const foremanMode: ForemanMode = config.foremanMode ?? "commission";
  const currentMonth = Number(config.currentMonth) || 1;
  const isForemanMonth =
    foremanMode === "free_month" &&
    config.foremanFreeMonth != null &&
    Number(config.foremanFreeMonth) === currentMonth;

  const highestBid = isForemanMonth
    ? 0
    : bids.reduce((m, b) => (b.amount > m ? b.amount : m), 0);

  const interestPct = chitValue > 0 ? (highestBid / chitValue) * 100 : 0;
  const dividendPool = highestBid;
  const dividendPerMember = dividendPool / totalMembers;
  const monthlyShare = chitValue / totalMembers;
  const netPayPerMember = Math.max(0, monthlyShare - dividendPerMember);
  const foremanCommission = foremanMode === "commission" ? (chitValue * commissionPct) / 100 : 0;

  return {
    highestBid,
    interestPct,
    dividendPool,
    dividendPerMember,
    monthlyShare,
    netPayPerMember,
    foremanCommission,
    isForemanMonth,
  };
}
