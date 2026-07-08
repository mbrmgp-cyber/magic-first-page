// AutoTransliterate is intentionally disabled.
//
// Earlier this component walked the DOM and converted any Telugu (or Devanagari)
// text into Latin transliteration when the UI language was English. That
// produced unreadable pseudo-English like "SOCHIETY NIYAMALU & CHARITRA" for
// user-authored Telugu content (rules, history, notes, etc.).
//
// The app now relies on the `lt(en, te)` helper and the i18n dictionary for
// bilingual UI strings, and user-authored content is shown verbatim in its
// original script. This component is kept as a no-op export so existing
// imports (e.g. in _authenticated/route.tsx) keep compiling.
export function AutoTransliterate() {
  return null;
}
