// Server-only helpers for the Vaaradhi points / free-quota system.
// 1 point per upload/edit save, 1 point when a client opens a post to contact.
// Users get N free points per month (admin configurable); beyond that they must subscribe.

export type PointStatus = {
  used: number;
  free_limit: number;
  remaining: number;
  enforce_limit: boolean;
  subscribed: boolean;
  blocked: boolean;
};

export async function getPointSettings(sb: any): Promise<{ free_monthly_points: number; enforce_limit: boolean }> {
  const { data } = await sb.from("varadhi_point_settings").select("*").eq("id", 1).maybeSingle();
  return {
    free_monthly_points: data?.free_monthly_points ?? 10,
    enforce_limit: data?.enforce_limit ?? true,
  };
}

export function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function monthUsage(sb: any, userId: string): Promise<number> {
  const { data } = await sb
    .from("varadhi_point_events")
    .select("points")
    .eq("user_id", userId)
    .gte("created_at", monthStartIso());
  return (data ?? []).reduce((s: number, r: any) => s + (r.points || 0), 0);
}

export async function hasActiveSubscription(sb: any, userId: string): Promise<boolean> {
  const { data } = await sb
    .from("varadhi_subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return (data ?? []).length > 0;
}

export async function getPointStatus(sb: any, userId: string): Promise<PointStatus> {
  const [settings, used, subscribed] = await Promise.all([
    getPointSettings(sb),
    monthUsage(sb, userId),
    hasActiveSubscription(sb, userId),
  ]);
  const remaining = Math.max(0, settings.free_monthly_points - used);
  return {
    used,
    free_limit: settings.free_monthly_points,
    remaining,
    enforce_limit: settings.enforce_limit,
    subscribed,
    blocked: settings.enforce_limit && !subscribed && remaining <= 0,
  };
}

export const QUOTA_MESSAGE =
  "ఈ నెల ఉచిత పాయింట్లు అయిపోయాయి. కొనసాగించడానికి దయచేసి సబ్‌స్క్రయిబ్ చేసుకోండి.";

/** Throws when the user is out of free points and has no active subscription. */
export async function assertPointsAvailable(sb: any, userId: string): Promise<void> {
  const status = await getPointStatus(sb, userId);
  if (status.blocked) throw new Error(QUOTA_MESSAGE);
}

export async function awardPoint(
  sb: any,
  userId: string | null | undefined,
  eventType: "upload" | "contact",
  refType?: string,
  refId?: string,
): Promise<void> {
  if (!userId) return;
  await sb.rpc("varadhi_award_point", {
    _user_id: userId,
    _event_type: eventType,
    _ref_type: refType ?? null,
    _ref_id: refId ?? null,
  });
}
