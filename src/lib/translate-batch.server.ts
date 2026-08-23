import { aiTranslate, readCache, writeCache, LANG_NAMES, looksTranslated } from "./translate.server";

export async function translateBatchImpl(
  lang: string,
  texts: string[]
): Promise<{ map: Record<string, string> }> {
  if (!LANG_NAMES[lang]) return { map: {} };
  const unique = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)));
  if (!unique.length) return { map: {} };

  const cached = await readCache(lang, unique);
  const missing = unique.filter((t) => !(t in cached));
  if (!missing.length) return { map: cached };

  const raw = await aiTranslate(lang, missing);
  const fresh: Record<string, string> = {};
  for (const [src, out] of Object.entries(raw)) {
    if (looksTranslated(lang, src, out)) fresh[src] = out;
  }
  if (Object.keys(fresh).length) {
    try {
      await writeCache(lang, fresh);
    } catch {
      /* cache write is best-effort */
    }
  }
  return { map: { ...cached, ...fresh } };
}
