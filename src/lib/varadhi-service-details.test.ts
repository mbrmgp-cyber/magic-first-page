import { describe, expect, it } from "vitest";
import { serviceCardSummary, serviceChargeText, serviceDetailRows } from "./varadhi-service-details";

const svc = {
  post_type: "service",
  sub_category: "other",
  price: null,
  unit: "కమిషన్",
  experience: "టెలిఫోన్ వాడగలిగే నాలెడ్జి ఉండాలి",
  service_mode: "మా స్థలంలో మాత్రమే",
  service_timing: "ఉదయం 9 నుండి రాత్రి 7 గంటల వరకు",
  service_area: "మండలంలో",
};

describe("varadhi service details", () => {
  it("shows the typed charge method when a paid service has no amount", () => {
    expect(serviceChargeText(svc)).toBe("కమిషన్");
    expect(serviceChargeText({ ...svc, price: 500 })).toBeNull();
  });

  it("lists every filled service option on the post page", () => {
    expect(serviceDetailRows(svc)).toEqual([
      { label: "అనుభవం", value: "టెలిఫోన్ వాడగలిగే నాలెడ్జి ఉండాలి" },
      { label: "ఛార్జి పద్ధతి", value: "కమిషన్" },
      { label: "సేవా విధానం", value: "మా స్థలంలో మాత్రమే" },
      { label: "సేవ సమయం", value: "ఉదయం 9 నుండి రాత్రి 7 గంటల వరకు" },
      { label: "సేవ పరిధి", value: "మండలంలో" },
    ]);
  });

  it("summarises experience, mode, timing and area on Home cards", () => {
    expect(serviceCardSummary(svc)).toBe(
      "టెలిఫోన్ వాడగలిగే నాలెడ్జి ఉండాలి · మా స్థలంలో మాత్రమే · ఉదయం 9 నుండి రాత్రి 7 గంటల వరకు · మండలంలో",
    );
  });

  it("keeps blood posts to their description and ignores item posts", () => {
    const blood = { post_type: "free", sub_category: "blood", experience: "3/3/2026", service_area: "మండలంలో" };
    expect(serviceCardSummary(blood)).toBe("3/3/2026");
    expect(serviceDetailRows(blood)).toEqual([]);
    expect(serviceCardSummary({ post_type: "business", experience: "x" })).toBeNull();
  });
});
