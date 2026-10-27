import { describe, expect, it } from "vitest";
import { organizationEditSchema, organizationFormFromRow } from "./admin-organization";

const org_id = "00000000-0000-4000-8000-000000000001";
describe("platform organization editing", () => {
  it("keeps founder names, addresses and identity document paths", () => {
    const founders = [{ name: "Founder One", address: "Chitvel", aadhaar_url: "private/founder.jpg" }];
    expect(organizationEditSchema.parse({ org_id, founders }).founders).toEqual(founders);
  });
  it("supports adding and removing founders", () => {
    expect(organizationEditSchema.parse({ org_id, founders: [] }).founders).toEqual([]);
    expect(organizationEditSchema.parse({ org_id, founders: [{ name: "New Founder" }] }).founders).toHaveLength(1);
  });
  it("cannot modify the organization code or admin account ownership", () => {
    const parsed = organizationEditSchema.parse({ org_id, org_code: "CHANGED", admin_user_id: org_id });
    expect(parsed).not.toHaveProperty("org_code");
    expect(parsed).not.toHaveProperty("admin_user_id");
  });
  it("retains registration and bank details while initializing the editor", () => {
    const form = organizationFormFromRow({ bank_account_number: "01234", is_gov_registered: false, registration_certificate_url: "private/cert.jpg", admin_name: "Registrar" });
    expect(form.bank_account_number).toBe("01234");
    expect(form.is_gov_registered).toBe(false);
    expect(form.registration_certificate_url).toBe("private/cert.jpg");
    expect(form.admin_name).toBe("Registrar");
  });
});