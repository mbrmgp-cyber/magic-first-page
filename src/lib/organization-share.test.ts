import { describe, expect, it } from "vitest";
import { hasShareAccess, organizationLogoPath, organizationShareUrl, shareDestination } from "./organization-share";

describe("organization sharing", () => {
  it("uses the organization code and requested page, not generic MBR links", () => {
    expect(organizationShareUrl("ABC123", "members")).toBe("https://mbr.mbrplatform.com/society/ABC123?destination=members");
  });
  it("unauthorized recipients see registration instead of member details", () => {
    expect(hasShareAccess({ owner: false, activeMember: false, committee: false, modules: ["members"] }, "members")).toBe(false);
  });
  it("owners can open the relevant members page", () => {
    expect(hasShareAccess({ owner: true, activeMember: false, committee: false, modules: [] }, "members")).toBe(true);
  });
  it("committee access requires the actual page module and active membership", () => {
    expect(hasShareAccess({ owner: false, activeMember: true, committee: true, modules: ["members"] }, "members")).toBe(true);
    expect(hasShareAccess({ owner: false, activeMember: true, committee: true, modules: ["accounts"] }, "members")).toBe(false);
    expect(hasShareAccess({ owner: false, activeMember: false, committee: true, modules: ["members"] }, "members")).toBe(false);
  });
  it("never follows arbitrary external destinations", () => {
    expect(shareDestination("https://attacker.example")).toBe("register");
    expect(shareDestination("__proto__")).toBe("register");
  });
  it("public images are restricted to the organization logo, never personal documents", () => {
    expect(organizationLogoPath("owner/logo/image.jpg", "https://storage.example")).toBe("owner/logo/image.jpg");
    expect(organizationLogoPath("owner/aadhaar/image.jpg", "https://storage.example")).toBeNull();
    expect(organizationLogoPath("https://attacker.example/storage/v1/object/sign/org-documents/owner/logo/x.jpg", "https://storage.example")).toBeNull();
    expect(organizationLogoPath("owner/logo/../../aadhaar.jpg", "https://storage.example")).toBeNull();
  });
});