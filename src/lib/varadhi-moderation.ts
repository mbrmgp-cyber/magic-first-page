import { z } from "zod";

export const postTargetSchema = z.object({ target_type: z.enum(["listing", "provider"]), target_id: z.string().uuid() });
export const postReasonSchema = postTargetSchema.extend({ reason: z.string().trim().min(1, "కారణం ఇవ్వండి").max(1000) });
export type PostTarget = z.infer<typeof postTargetSchema>;
export type ModerationEntry = PostTarget & { id: string; title: string; reason: string; created_at: string; actor_name?: string; status?: string; review_reason?: string; reviewer_name?: string };

export function matchesModerationArea(isSuper: boolean, seats: Array<{ level: string; state: string | null; district?: string | null; mandal?: string | null; is_active: boolean }>, area: { state: string | null; district: string | null; mandal: string | null }) {
  return isSuper || seats.some(s => s.is_active && !!s.state && s.state === area.state && (
    s.level === "state_admin" || (!!s.district && s.district === area.district && (
      s.level === "district_admin" || (s.level === "mandal_admin" && !!s.mandal && s.mandal === area.mandal)
    ))
  ));
}