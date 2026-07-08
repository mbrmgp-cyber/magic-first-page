import { useEffect } from "react";
import { useI18n, transliterateText } from "@/lib/i18n";

/**
 * Walks the DOM and transliterates text nodes / a few attributes containing
 * Telugu (or Devanagari) source text into the currently selected language.
 * Add `data-notranslit` on any element (or ancestor) to opt out of a subtree.
 */
const INDIC_RE = /[\u0C00-\u0C7F\u0900-\u097F]/;
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);

export function AutoTransliterate() {
  const { lang } = useI18n();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const textCache = new WeakMap<Text, string>();
    const attrCache = new WeakMap<Element, Record<string, string>>();

    function inOptOut(node: Node | null): boolean {
      let el: Node | null = node;
      while (el) {
        if (el.nodeType === Node.ELEMENT_NODE && (el as Element).hasAttribute("data-notranslit")) {
          return true;
        }
        el = el.parentNode;
      }
      return false;
    }

    function processText(t: Text) {
      if (inOptOut(t.parentNode)) return;
      const cached = textCache.get(t);
      if (cached !== undefined) {
        const expected = transliterateText(cached, lang);
        if (t.data !== expected && t.data !== cached) {
          // React re-rendered this node with new source text — refresh cache.
          textCache.set(t, t.data);
        }
      } else {
        if (!INDIC_RE.test(t.data)) return;
        textCache.set(t, t.data);
      }
      const target = transliterateText(textCache.get(t)!, lang);
      if (t.data !== target) t.data = target;
    }

    function processElement(el: Element) {
      if (inOptOut(el)) return;
      let bag = attrCache.get(el);
      for (const name of ATTRS) {
        const cur = el.getAttribute(name);
        if (cur == null) continue;
        const originals = bag ?? {};
        const stored = originals[name];
        if (stored !== undefined) {
          const expected = transliterateText(stored, lang);
          if (cur !== expected && cur !== stored) originals[name] = cur;
        } else {
          if (!INDIC_RE.test(cur)) continue;
          originals[name] = cur;
        }
        bag = originals;
        const target = transliterateText(originals[name]!, lang);
        if (cur !== target) el.setAttribute(name, target);
      }
      if (bag) attrCache.set(el, bag);
    }

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        processText(node as Text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (SKIP_TAGS.has(el.tagName)) return;
      processElement(el);
      node.childNodes.forEach(walk);
    }

    walk(document.body);

    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
          processText(m.target as Text);
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          processElement(m.target as Element);
        } else {
          m.addedNodes.forEach(walk);
        }
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS as unknown as string[],
    });
    return () => obs.disconnect();
  }, [lang]);

  return null;
}
