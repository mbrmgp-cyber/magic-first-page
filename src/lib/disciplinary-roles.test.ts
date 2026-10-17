import { describe, expect, it } from "vitest";
import { DISCIPLINARY_ROLES, parseDisciplinaryRole } from "./disciplinary-roles";

describe("disciplinary appointment roles", () => {
  it("accepts founder appointments", () => expect(parseDisciplinaryRole("founder")).toBe("founder"));
  it("accepts sincere senior appointments", () => expect(parseDisciplinaryRole("sincere_senior")).toBe("sincere_senior"));
  it("accepts present president appointments", () => expect(parseDisciplinaryRole("present_president")).toBe("present_president"));
  it("offers exactly the three requested roles", () => {
    expect([...DISCIPLINARY_ROLES]).toEqual(["founder", "sincere_senior", "present_president"]);
    expect(() => parseDisciplinaryRole("former_president")).toThrow();
    expect(() => parseDisciplinaryRole("admin")).toThrow();
  });
});