import { describe, expect, it } from "vitest";
import { orgStartUrl } from "./org-branding";

describe("app shortcut destinations", () => {
  it("opens MBR APP when there is no society context", () => {
    expect(orgStartUrl()).toBe("/mbr");
  });
  it("keeps Chitvel's society portal rather than the platform homepage", () => {
    expect(orgStartUrl("A")).toBe("/member/register?code=A&portal=1");
  });
});