import { z } from "zod";
import sharedLocales from "./locales/shared.json";

export const LANGUAGE_CODES = ["te", "en", "hi"] as const;
export const TRANSLATION_BATCH_SIZE = 40;
export const translationInputSchema = z.object({
  lang: z.enum(LANGUAGE_CODES),
  texts: z.array(z.string().min(1).max(400)).max(TRANSLATION_BATCH_SIZE),
});

export function languageDirection(lang: string): "rtl" | "ltr" {
  return "ltr";
}

// These controls work even before a shared translation cache is available.
const sources = ["Language", "Login", "Email", "Password", "Save", "Cancel", "Delete", "Back", "Name", "Phone", "Yes", "No", "Loading", "Search", "Add", "Edit"];
const rows: Record<string, string[]> = {
  te: ["భాష", "ప్రవేశించండి", "ఇమెయిల్", "పాస్‌వర్డ్", "భద్రపరచండి", "రద్దు", "తొలగించండి", "వెనుకకు", "పేరు", "ఫోన్", "అవును", "కాదు", "లోడ్ అవుతోంది", "వెతకండి", "జోడించండి", "సవరించండి"],
  hi: ["भाषा", "लॉगिन", "ईमेल", "पासवर्ड", "सहेजें", "रद्द करें", "हटाएँ", "वापस", "नाम", "फ़ोन", "हाँ", "नहीं", "लोड हो रहा है", "खोजें", "जोड़ें", "संपादित करें"],
};

export function sharedTranslation(lang: string, source: string): string | undefined {
  const locale: Record<string, Record<string, string>> = sharedLocales;
  const supplied = locale[lang]?.[source];
  if (supplied) return supplied;
  const index = sources.indexOf(source);
  if (index < 0) return undefined;
  return lang === "en" ? source : rows[lang]?.[index];
}