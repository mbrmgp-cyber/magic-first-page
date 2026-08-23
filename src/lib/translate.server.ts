// Server-side AI translation with a shared database cache.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const LANG_NAMES: Record<string, string> = {
  te: "Telugu",
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ne: "Nepali",
  sa: "Sanskrit",
  bn: "Bengali",
  as: "Assamese",
  or: "Odia",
  gu: "Gujarati",
  pa: "Punjabi",
  ta: "Tamil",
  kn: "Kannada",
  ml: "Malayalam",
  ur: "Urdu",
};

const SCRIPT_RE: Record<string, RegExp> = {
  en: /[A-Za-z]/, te: /[\u0C00-\u0C7F]/, hi: /[\u0900-\u097F]/, mr: /[\u0900-\u097F]/,
  ne: /[\u0900-\u097F]/, sa: /[\u0900-\u097F]/, bn: /[\u0980-\u09FF]/, as: /[\u0980-\u09FF]/,
  or: /[\u0B00-\u0B7F]/, gu: /[\u0A80-\u0AFF]/, pa: /[\u0A00-\u0A7F]/, ta: /[\u0B80-\u0BFF]/,
  kn: /[\u0C80-\u0CFF]/, ml: /[\u0D00-\u0D7F]/, ur: /[\u0600-\u06FF]/,
};

// A result that is identical to the source and carries no target-script text
// means the model echoed the input — do not cache it as a translation.
export function looksTranslated(lang: string, src: string, out: string): boolean {
  if (out !== src) return true;
  const re = SCRIPT_RE[lang];
  return re ? re.test(out) : true;
}

export const hashText = (s: string) => createHash("md5").update(s).digest("hex");

export async function readCache(lang: string, texts: string[]) {
  const hashes = texts.map(hashText);
  const out: Record<string, string> = {};
  const chunk = 200;
  for (let i = 0; i < hashes.length; i += chunk) {
    const { data } = await supabaseAdmin
      .from("translation_memory")
      .select("source_text, translated_text")
      .eq("lang", lang)
      .in("source_hash", hashes.slice(i, i + chunk));
    for (const r of data ?? []) out[r.source_text as string] = r.translated_text as string;
  }
  return out;
}

export async function writeCache(lang: string, map: Record<string, string>) {
  const rows = Object.entries(map).map(([source_text, translated_text]) => ({
    lang,
    source_hash: hashText(source_text),
    source_text,
    translated_text,
  }));
  if (!rows.length) return;
  await supabaseAdmin
    .from("translation_memory")
    .upsert(rows, { onConflict: "lang,source_hash", ignoreDuplicates: true });
}

export async function aiTranslate(lang: string, texts: string[]): Promise<Record<string, string>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !texts.length) return {};
  const target = LANG_NAMES[lang] ?? lang;

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const prompt = `Translate each numbered UI string of a community/marketplace mobile app into ${target}.
Rules:
- Keep the same numbering, one translation per line, format: "<number>. <translation>".
- Preserve numbers, currency symbols, dates, codes, emails, URLs and placeholders exactly.
- Keep it short and natural for buttons/labels.
- Always output the ${target} version. Only brand/person/place names may stay as-is.
- Output nothing except the numbered lines.

${numbered}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a precise UI localization engine." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });
  if (!res.ok) return {};
  const json: any = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";

  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const m = /^\s*(\d+)[.)]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const idx = Number(m[1]) - 1;
    if (idx >= 0 && idx < texts.length && m[2]) out[texts[idx]] = m[2];
  }
  return out;
}
