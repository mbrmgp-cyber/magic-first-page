import { describe, expect, it } from "vitest";
import { appointmentSearchArea, canAppointMandalAdmin, isApprovedDistrictCandidate } from "./varadhi-appointments";
const seat = { id: "district-seat", user_id: "district-user", level: "district_admin", state: "Andhra Pradesh", district: "Tirupati", is_active: true };
describe("district admin appointments", () => {
  it("allows a district admin to appoint under their active district seat", () => {
    expect(canAppointMandalAdmin(false, "district-user", seat)).toBe(true);
    expect(canAppointMandalAdmin(false, "other-user", seat)).toBe(false);
    expect(canAppointMandalAdmin(false, "district-user", { ...seat, is_active: false })).toBe(false);
    expect(canAppointMandalAdmin(false, "district-user", { ...seat, level: "state_admin" })).toBe(false);
  });
  it("limits candidates to approved registrations in the assigned district", () => {
    const profile = { verification_status: "approved", state: seat.state, district: seat.district };
    expect(isApprovedDistrictCandidate(profile, seat)).toBe(true);
    expect(isApprovedDistrictCandidate({ ...profile, verification_status: "pending" }, seat)).toBe(false);
    expect(isApprovedDistrictCandidate({ ...profile, verification_status: "rejected" }, seat)).toBe(false);
    expect(isApprovedDistrictCandidate({ ...profile, district: "Kadapa" }, seat)).toBe(false);
    expect(isApprovedDistrictCandidate({ ...profile, state: "Telangana" }, seat)).toBe(false);
  });
  it("forces district scope even when search filters are omitted", () => {
    expect(appointmentSearchArea(false, [seat], {})).toEqual({ state: "Andhra Pradesh", district: "Tirupati" });
    expect(() => appointmentSearchArea(false, [seat], { district: "Kadapa" })).toThrow();
    expect(() => appointmentSearchArea(false, [{ ...seat, is_active: false }], {})).toThrow();
  });
});