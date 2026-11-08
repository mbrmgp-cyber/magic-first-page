import { describe, expect, it } from "vitest";
import { BLOOD_DONOR, BLOOD_WANTED, bloodNeedOf, bloodPlaceLabel, bloodPosterLabel, bloodStatusLabel, isBloodNeed } from "./varadhi-blood";

describe("blood donation choice", () => {
  it("keeps the Wanted choice saved on a post", () => {
    expect(bloodNeedOf("రక్తం కావాలి")).toBe(BLOOD_WANTED);
  });

  it("treats older blood posts without a choice as donor posts", () => {
    expect(bloodNeedOf("1 పనికి")).toBe(BLOOD_DONOR);
    expect(bloodNeedOf(null)).toBe(BLOOD_DONOR);
  });

  it("only accepts the two choices", () => {
    expect(isBloodNeed("దాత")).toBe(true);
    expect(isBloodNeed("కేజీ")).toBe(false);
  });

  it("labels the poster as blood donor, never seller", () => {
    expect(bloodPosterLabel("దాత")).toBe("రక్తదాత");
    expect(bloodPosterLabel(null)).toBe("రక్తదాత");
    expect(bloodPosterLabel("రక్తం కావాలి")).toBe("రక్తం కావలసినవారు");
  });

  it("says needed, not available, on wanted blood posts", () => {
    expect(bloodStatusLabel("రక్తం కావాలి", true)).toBe("అవసరం ఉంది");
    expect(bloodStatusLabel("రక్తం కావాలి", false)).toBe("అవసరం లేదు");
    expect(bloodStatusLabel("దాత", true)).toBe("అందుబాటులో ఉంది");
  });

  it("names the place where blood is needed on wanted posts", () => {
    expect(bloodPlaceLabel("రక్తం కావాలి")).toBe("కావలసిన చోటు");
    expect(bloodPlaceLabel("దాత")).toBe("దొరుకు చోటు");
  });
});
