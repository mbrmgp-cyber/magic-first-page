import { describe, expect, it } from "vitest";
import { adVisibleInOrganization, defaultPromotion, managedAds } from "./mbr-ads";

describe("MBR advertisement organizations", () => {
  it("displays all-organization advertisements everywhere", () => {
    expect(adVisibleInOrganization(defaultPromotion, "society-a")).toBe(true);
  });
  it("displays selected-organization advertisements only in selected societies", () => {
    const ad = { ...defaultPromotion, organization_ids: ["society-a", "society-b"] };
    expect(adVisibleInOrganization(ad, "society-a")).toBe(true);
    expect(adVisibleInOrganization(ad, "society-c")).toBe(false);
    expect(adVisibleInOrganization(ad, null)).toBe(false);
  });
  it("hides disabled advertisements even in selected societies", () => {
    expect(adVisibleInOrganization({ ...defaultPromotion, active: false }, "society-a")).toBe(false);
  });
  it("does not restore or duplicate a disabled saved promotion", () => {
    const saved = { ...defaultPromotion, active: false };
    expect(managedAds([saved])).toEqual([saved]);
  });
  it("an empty selection displays nowhere", () => {
    expect(adVisibleInOrganization({ ...defaultPromotion, organization_ids: [] }, "society-a")).toBe(false);
  });
});