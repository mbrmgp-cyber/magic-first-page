import { describe, expect, it } from "vitest";
import { formatMachineryRate, readMachineryRate, searchAddress, writeMachineryRate } from "./varadhi-machinery-rate";

describe("machinery pricing", () => {
  it("retains per kilometre pricing through save and edit", () => {
    const saved = writeMachineryRate("km", "");
    expect(readMachineryRate(saved).unit).toBe("km");
    expect(formatMachineryRate(50, saved)).toBe("ధర: Rs. 50 / కిలోమీటరుకు");
  });
  it("retains hourly pricing through save and edit", () => {
    const saved = writeMachineryRate("hour", "");
    expect(readMachineryRate(saved).unit).toBe("hour");
    expect(formatMachineryRate(500, saved)).toBe("ధర: Rs. 500 / గంటకు");
  });
  it("retains daily pricing through save and edit", () => {
    const saved = writeMachineryRate("day", "");
    expect(readMachineryRate(saved).unit).toBe("day");
    expect(formatMachineryRate(2000, saved)).toBe("ధర: Rs. 2,000 / రోజుకు");
  });
  it("preserves extra charges separately from the price basis", () => {
    expect(readMachineryRate(writeMachineryRate("hour", "డీజిల్ అదనంగా")))
      .toEqual({ unit: "hour", notes: "డీజిల్ అదనంగా" });
  });
  it("keeps legacy rates per kilometre without changing their notes", () => {
    expect(readMachineryRate("Driver included")).toEqual({ unit: "km", notes: "Driver included" });
  });
  it("includes village, mandal, district and state in Search addresses", () => {
    expect(searchAddress({ village: "Chitvel", mandal: "Chitvel Mandal", district: "Annamayya", state: "Andhra Pradesh", city: "Other" }))
      .toBe("Chitvel, Chitvel Mandal, Annamayya, Andhra Pradesh");
  });
});