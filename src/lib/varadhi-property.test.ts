import { describe, expect, it } from "vitest";
import { isRentalProperty, propertyTerms } from "./varadhi-property";

describe("property rental terms", () => {
  it("uses monthly pricing and no stock quantity for house rent", () => {
    expect(propertyTerms("realestate", "ఇల్లు అద్దెకు (Rent)", "గజం", "50"))
      .toEqual({ unit: "నెలకు", stock_qty: "" });
  });
  it("uses monthly pricing and no stock quantity for lease, including old posts", () => {
    expect(propertyTerms("realestate", "లీజ్", "సెంటు", "100"))
      .toEqual({ unit: "నెలకు", stock_qty: "" });
  });
  it("restores land units when switching back to sale", () => {
    expect(propertyTerms("realestate", "ప్లాట్", "నెలకు", ""))
      .toEqual({ unit: "సెంటు", stock_qty: "" });
    expect(propertyTerms("realestate", "ప్లాట్", "గజం", "50"))
      .toEqual({ unit: "గజం", stock_qty: "50" });
  });
  it("only treats rent and lease in real estate as rental properties", () => {
    expect(isRentalProperty("realestate", "ఇల్లు అద్దెకు (Rent)")).toBe(true);
    expect(isRentalProperty("realestate", "లీజ్")).toBe(true);
    expect(isRentalProperty("realestate", "ఇల్లు")).toBe(false);
    expect(isRentalProperty("fresh", "లీజ్")).toBe(false);
  });
});