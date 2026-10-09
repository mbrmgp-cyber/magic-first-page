// Client-side dynamic translation memory.
//
// The DOM walker asks this store for a translation of any string it could not
// resolve with the static dictionaries. Hits are returned instantly from the
// in-memory / localStorage cache; misses are batched and sent to the AI
// translation server function, and subscribers are notified when new
// translations land so the page can be re-swept.

import { sharedTranslation, TRANSLATION_BATCH_SIZE } from "./language-support";

const memory = new Map<string, string>(); // `${lang}\u0000${text}` -> translated
const pending = new Set<string>(); // keys already queued/in-flight
const queue = new Map<string, Set<string>>(); // lang -> texts
const listeners = new Set<() => void>();

// Minimal script check so we can tell a real translation from the model
// echoing the source string back.
const SCRIPT_RE: Record<string, RegExp> = {
  en: /[A-Za-z]/, te: /[\u0C00-\u0C7F]/, hi: /[\u0900-\u097F]/, mr: /[\u0900-\u097F]/,
  ne: /[\u0900-\u097F]/, sa: /[\u0900-\u097F]/, bn: /[\u0980-\u09FF]/, as: /[\u0980-\u09FF]/,
  or: /[\u0B00-\u0B7F]/, gu: /[\u0A80-\u0AFF]/, pa: /[\u0A00-\u0A7F]/, ta: /[\u0B80-\u0BFF]/,
  kn: /[\u0C80-\u0CFF]/, ml: /[\u0D00-\u0D7F]/, ur: /[\u0600-\u06FF]/,
};

const looksTranslated = (lang: string, src: string, out: string) => {
  if (out !== src) return true;
  const re = SCRIPT_RE[lang];
  return re ? re.test(out) : true;
};

let flushTimer: number | undefined;
let inFlight = 0;
let loadedLangs = new Set<string>();

const keyOf = (lang: string, text: string) => `${lang}\u0000${text}`;
const storageKey = (lang: string) => `mbr_tm_v2_${lang}`;

function loadLang(lang: string) {
  if (loadedLangs.has(lang) || typeof window === "undefined") return;
  loadedLangs.add(lang);
  try {
    const raw = localStorage.getItem(storageKey(lang));
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) memory.set(keyOf(lang, k), v);
  } catch {
    /* ignore corrupt cache */
  }
}

function persist(lang: string, map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(storageKey(lang));
    const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    Object.assign(obj, map);
    const keys = Object.keys(obj);
    if (keys.length > 4000) {
      for (const k of keys.slice(0, keys.length - 4000)) delete obj[k];
    }
    localStorage.setItem(storageKey(lang), JSON.stringify(obj));
  } catch {
    /* quota / private mode */
  }
}

export function subscribeTranslations(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

/** Cached translation, or undefined when not (yet) available. */
export function getTranslation(lang: string, text: string): string | undefined {
  const bundled = sharedTranslation(lang, text);
  if (bundled) return bundled;
  loadLang(lang);
  return memory.get(keyOf(lang, text));
}

/** Queue a string for AI translation into `lang`. */
export function requestTranslation(lang: string, text: string) {
  if (typeof window === "undefined") return;
  if (sharedTranslation(lang, text)) return;
  if (!text.trim() || text.length > 400) return;
  loadLang(lang);
  const k = keyOf(lang, text);
  if (memory.has(k) || pending.has(k)) return;
  pending.add(k);
  let set = queue.get(lang);
  if (!set) {
    set = new Set();
    queue.set(lang, set);
  }
  set.add(text);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 200);
}

async function flush() {
  if (typeof window === "undefined") return;
  if (inFlight >= 1) {
    scheduleFlush();
    return;
  }
  const entry = Array.from(queue.entries()).find(([, s]) => s.size > 0);
  if (!entry) return;
  const [lang, set] = entry;
  const batch = Array.from(set).slice(0, TRANSLATION_BATCH_SIZE);
  for (const t of batch) set.delete(t);

  inFlight++;
  try {
    const { translateBatch } = await import("./translate.functions");
    const res: any = await translateBatch({ data: { lang, texts: batch } });
    const map = (res?.map ?? {}) as Record<string, string>;
    const good: Record<string, string> = {};
    for (const [src, out] of Object.entries(map)) {
      if (typeof out === "string" && looksTranslated(lang, src, out)) {
        memory.set(keyOf(lang, src), out);
        good[src] = out;
      }
    }
    // Strings the model skipped: remember the source so we don't re-ask forever.
    // A cache miss is not a translation. Keep it pending for this page session
    // without poisoning memory; a later visit can pick up newly supplied copy.
    persist(lang, good);
    if (Object.keys(good).length) notify();
  } catch {
    for (const t of batch) pending.delete(keyOf(lang, t));
  } finally {
    inFlight--;
    if (Array.from(queue.values()).some((s) => s.size > 0)) scheduleFlush();
  }
}
