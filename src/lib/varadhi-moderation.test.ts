import { describe, expect, it } from "vitest";
import { matchesModerationArea, postReasonSchema } from "./varadhi-moderation";
const area = { state: "AP", district: "Kadapa", mandal: "Chitvel" };
const target = { target_type: "listing", target_id: "00000000-0000-4000-8000-000000000001" };
describe("post moderation rules", () => {
  it("requires an explanation for removal/report", () => {
    expect(postReasonSchema.safeParse({ ...target, reason: "   " }).success).toBe(false);
    expect(postReasonSchema.parse({ ...target, reason: " False post " }).reason).toBe("False post");
  });
  it("allows super admins across areas", () => expect(matchesModerationArea(true, [], area)).toBe(true));
  it("allows regional admins only inside their active area", () => {
    const seat = { level: "mandal_admin", ...area, is_active: true };
    expect(matchesModerationArea(false, [seat], area)).toBe(true);
    expect(matchesModerationArea(false, [seat], { ...area, mandal: "Other" })).toBe(false);
    expect(matchesModerationArea(false, [{ ...seat, is_active: false }], area)).toBe(false);
    expect(matchesModerationArea(false, [], area)).toBe(false);
  });
});