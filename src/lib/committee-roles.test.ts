import { describe, expect, it } from "vitest";
import { COMMITTEE_ROLES, committeeRoleLabel, parseCommitteeRole } from "./committee-roles";

describe("executive committee appointment positions", () => {
  it("allows founders in the appointment list and validator", () => {
    expect(COMMITTEE_ROLES).toContain("founder");
    expect(parseCommitteeRole("founder")).toBe("founder");
  });
  it("allows disciplinary committee members in the appointment list and validator", () => {
    expect(COMMITTEE_ROLES).toContain("disciplinary_committee_member");
    expect(parseCommitteeRole("disciplinary_committee_member")).toBe("disciplinary_committee_member");
  });
  it("retains the six existing positions and rejects unrelated roles", () => {
    for (const role of ["president", "vice_president", "advisor", "treasurer", "executive", "worker"]) {
      expect(parseCommitteeRole(role)).toBe(role);
    }
    expect(() => parseCommitteeRole("admin")).toThrow();
  });
  it("shows the position name in Telugu and English", () => {
    expect(committeeRoleLabel("treasurer", "te")).toBe("కోశాధికారి");
    expect(committeeRoleLabel("president", "en")).toBe("President");
    expect(committeeRoleLabel("legacy_role", "te")).toBe("legacy_role");
  });
});