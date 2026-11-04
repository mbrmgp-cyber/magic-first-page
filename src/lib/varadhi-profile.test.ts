import { describe, expect, it } from "vitest";
import { adminProfileEditSchema, isProfileLocked, profileEditSchema, registrationComplete, showUpdateRegistration } from "./varadhi-profile";

describe("Vaaradhi profile permissions", () => {
  it("shows registration on Update until a profile has been saved, not until admin approval", () => {
    expect(showUpdateRegistration(null)).toBe(true);
    expect(showUpdateRegistration(undefined)).toBe(true);
    for (const verification_status of ["pending", "approved", "rejected"]) {
      expect(showUpdateRegistration({ verification_status })).toBe(false);
    }
  });
  it("allows registration without a photo", () => {
    expect(registrationComplete({ full_name: "Test", phone: "9999999999", aadhaar_url: "proof.pdf", house_number: "1", city: "Village", mandal: "Mandal", district: "District", state: "State", occupation: "వ్యవసాయం" }, "")).toBe(true);
    expect(profileEditSchema.parse({ full_name: "Test", photo_url: "" }).photo_url).toBe("");
  });
  it("locks approved profiles but not pending or rejected profiles", () => {
    expect(isProfileLocked("approved")).toBe(true);
    expect(isProfileLocked("pending")).toBe(false);
    expect(isProfileLocked("rejected")).toBe(false);
  });
  it("allows validated admin phone changes without accepting ownership or approval changes", () => {
    const parsed = adminProfileEditSchema.parse({ user_id: "00000000-0000-4000-8000-000000000001", changes: { phone: "9876543210", user_id: "other", verification_status: "pending" } });
    expect(parsed.changes).toEqual({ phone: "9876543210" });
    expect(adminProfileEditSchema.safeParse({ user_id: "invalid", changes: { phone: "1" } }).success).toBe(false);
  });
});