import { describe, expect, it } from "vitest";
import { defaultDesign, societyIdCardDesign } from "./idCardTemplates";

describe("society ID card editing", () => {
  it("opens the existing saffron card when the society has no stored design", () => {
    const design = societyIdCardDesign({ id_card_design: null, theme_color: "#FF9933" });
    expect(design.templateId).toBe("legacy");
    expect(design.global.accentColor).toBe("#FF9933");
    expect(design.global.contactFooterBg).toBe("#138808");
    expect(design.global.societyLayout).toBe(true);
  });

  it("preserves the saved card rather than replacing its independent colors and text", () => {
    const saved = defaultDesign("legacy");
    saved.global.accentColor = "#f58220";
    saved.global.backgroundColor = "#ffffff";
    saved.elements.orgName.size = 22;
    saved.backMatter = "Society objectives";
    const editable = societyIdCardDesign({ id_card_design: saved, theme_color: "#000000" });
    expect(editable).toEqual(saved);
    editable.elements.orgName.size = 30;
    expect(saved.elements.orgName.size).toBe(22);
  });
});