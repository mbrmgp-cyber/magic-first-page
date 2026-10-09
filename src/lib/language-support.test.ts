import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, languageDirection, sharedTranslation, translationInputSchema } from "./language-support";
import sharedLocales from "./locales/shared.json";

describe("language support rules", () => {
  it.each(["te", "en", "hi", "mr", "ne", "sa", "bn", "as", "or", "gu", "pa", "ta", "kn", "ml", "ur"])("accepts offered language %s", (lang) => {
    expect(translationInputSchema.parse({ lang, texts: ["Login"] }).lang).toBe(lang);
  });
  it("rejects unsupported languages", () => {
    expect(translationInputSchema.safeParse({ lang: "xx", texts: ["Login"] }).success).toBe(false);
  });
  it("accepts forty strings but rejects forty-one", () => {
    expect(translationInputSchema.safeParse({ lang: "te", texts: Array(40).fill("Login") }).success).toBe(true);
    expect(translationInputSchema.safeParse({ lang: "te", texts: Array(41).fill("Login") }).success).toBe(false);
  });
  it("uses right-to-left only for Urdu", () => {
    expect(languageDirection("ur")).toBe("rtl");
    for (const lang of LANGUAGE_CODES.filter((code) => code !== "ur")) expect(languageDirection(lang)).toBe("ltr");
  });
  it("keeps identity fields out of shared UI translations", () => {
    expect(sharedTranslation("te", "mbrplatform@gmail.com")).toBeUndefined();
    expect(sharedTranslation("hi", "A/1234")).toBeUndefined();
  });
  it("ships identical shared-source coverage for all non-English languages", () => {
    const expected = Object.keys(sharedLocales.te).sort();
    for (const lang of LANGUAGE_CODES.filter((code) => code !== "en")) {
      const locales: Record<string, Record<string, string>> = sharedLocales;
      expect(Object.keys(locales[lang]).sort()).toEqual(expected);
    }
  });
});