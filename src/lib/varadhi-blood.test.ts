import { describe, expect, it } from "vitest";
import { BLOOD_DONOR, BLOOD_WANTED, bloodNeedOf, isBloodNeed } from "./varadhi-blood";

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
});
