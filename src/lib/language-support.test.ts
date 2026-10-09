import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, languageDirection, sharedTranslation, translationInputSchema } from "./language-support";
import sharedLocales from "./locales/shared.json";
import vaaradhiCopy from "./locales/vaaradhi.json";
import recoveryCopy from "./locales/recovery.json";

describe("language support rules", () => {
  it("bundles real Hindi and Telugu for marketplace and recovery copy", () => {
    for (const entry of [...vaaradhiCopy, ...recoveryCopy]) {
      expect(entry.en.trim()).not.toBe("");
      if (entry.en !== "WhatsApp" && entry.en !== "RMP") expect(entry.te).toMatch(/[\u0c00-\u0c7f]/);
      if (entry.en !== "RMP") expect(entry.hi).toMatch(/[\u0900-\u097f]/);
      expect(entry.hi).not.toMatch(/[\u0c00-\u0c7f]/);
      if (entry.en !== "RMP") expect(sharedTranslation("hi", entry.te)).toMatch(/[\u0900-\u097f]/);
    }
  });
  it("matches Telugu joiner variants and translates recovery errors immediately", () => {
    expect(sharedTranslation("hi", "పాస్\u200cవర్డ్")).toBe("पासवर्ड");
    expect(sharedTranslation("hi", "Password update failed")).toBe("पासवर्ड नहीं बदल सके। कृपया फिर से कोशिश करें।");
    expect(sharedTranslation("hi", "Login to get started")).toBe("शुरू करने के लिए लॉगिन करें");
    expect(sharedTranslation("en", "← వారధి హోమ్\u200cకి తిరిగి")).toBe("← Back to Vaaradhi home");
  });
  it.each(["te", "en", "hi"])("accepts offered language %s", (lang) => {
    expect(translationInputSchema.parse({ lang, texts: ["Login"] }).lang).toBe(lang);
  });
  it("supports exactly Telugu, English and Hindi", () => {
    expect([...LANGUAGE_CODES]).toEqual(["te", "en", "hi"]);
  });
  it.each(["mr", "ne", "sa", "bn", "as", "or", "gu", "pa", "ta", "kn", "ml", "ur", "xx"])("rejects removed or unsupported language %s", (lang) => {
    expect(translationInputSchema.safeParse({ lang, texts: ["Login"] }).success).toBe(false);
  });
  it("accepts forty strings but rejects forty-one", () => {
    expect(translationInputSchema.safeParse({ lang: "te", texts: Array(40).fill("Login") }).success).toBe(true);
    expect(translationInputSchema.safeParse({ lang: "te", texts: Array(41).fill("Login") }).success).toBe(false);
  });
  it("uses left-to-right for all supported languages", () => {
    for (const lang of LANGUAGE_CODES) expect(languageDirection(lang)).toBe("ltr");
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
describe("MBR society screens", () => {
  it("translates the named English subtitles into pure Telugu", () => {
    expect(sharedTranslation("te", "Not assigned")).toBe("కేటాయించబడలేదు");
    expect(sharedTranslation("te", "No committee members appointed yet.")).toBe("ఇంకా కమిటీ సభ్యులు నియమించబడలేదు.");
    expect(sharedTranslation("en", "కేటాయించబడలేదు")).toBe("Not assigned");
  });
});
