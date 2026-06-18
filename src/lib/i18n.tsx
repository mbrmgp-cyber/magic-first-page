import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Sanscript from "@indic-transliteration/sanscript";

export type Lang = string;

type Entry = { te: string; en: string; hi: string };
type Dict = Record<string, Entry>;

const DICT: Dict = {
  appTagline: {
    te: "సంస్థ లేదా సభ్యుడిగా register అవ్వండి",
    en: "Register as an organization or a member",
    hi: "संगठन या सदस्य के रूप में पंजीकरण करें",
  },
  org: { te: "సంస్థ (Organization)", en: "Organization", hi: "संगठन" },
  orgDesc: {
    te: "కొత్త Org register చేసి QR code పొందండి",
    en: "Register a new org and get a unique QR code",
    hi: "नया संगठन पंजीकरण करें और QR कोड प्राप्त करें",
  },
  member: { te: "సభ్యుడు (Member)", en: "Member", hi: "सदस्य" },
  memberDesc: {
    te: "Org QR code scan చేసి join అవ్వండి",
    en: "Scan the org QR code and join",
    hi: "संगठन का QR कोड स्कैन करें और जुड़ें",
  },
  haveAccount: {
    te: "ఇప్పటికే account ఉందా? Login",
    en: "Already have an account? Login",
    hi: "क्या आपका खाता है? लॉगिन",
  },
  login: { te: "Login", en: "Login", hi: "लॉगिन" },
  loginSubtitle: {
    te: "మీ MBR App account లోకి వెళ్ళండి",
    en: "Sign in to your MBR App account",
    hi: "अपने MBR ऐप खाते में साइन इन करें",
  },
  email: { te: "Email", en: "Email", hi: "ईमेल" },
  password: { te: "Password", en: "Password", hi: "पासवर्ड" },
  noAccount: {
    te: "Account లేదా? Register",
    en: "No account? Register",
    hi: "खाता नहीं है? पंजीकरण करें",
  },
  language: { te: "భాష", en: "Language", hi: "भाषा" },
  viewIdCard: { te: "నా ID కార్డ్ చూడండి", en: "View my ID Card", hi: "मेरा ID कार्ड देखें" },
  viewIdCardDesc: {
    te: "Login చేసి approved సభ్యుని ID card చూసుకోండి",
    en: "Login to view your approved member ID card",
    hi: "लॉगिन करके अपना सदस्य ID कार्ड देखें",
  },
  authSubtitle: {
    te: "Email login link తో సురక్షితంగా లాగిన్",
    en: "Secure login with an email magic link",
    hi: "ईमेल लॉगिन लिंक से सुरक्षित लॉगिन",
  },
  sendingLink: { te: "Login link పంపుతున్నాం…", en: "Sending login link…", hi: "लॉगिन लिंक भेजा जा रहा है…" },
  sendLink: { te: "Login link పంపండి", en: "Send Login link", hi: "लॉगिन लिंक भेजें" },
  sendingTitle: { te: "Login link పంపుతున్నాం", en: "Sending login link", hi: "लॉगिन लिंक भेजा जा रहा है" },
  sendingMsg: {
    te: "మీ Email కి secure login link పంపుతున్నాం.",
    en: "Sending a secure login link to your email.",
    hi: "आपके ईमेल पर सुरक्षित लॉगिन लिंक भेजा जा रहा है।",
  },
  sendFailedTitle: { te: "Login link పంపలేకపోయాం", en: "Could not send login link", hi: "लॉगिन लिंक नहीं भेज सके" },
  noAccountErr: {
    te: "ఈ Email కు ఖాతా లేదు. ముందుగా Society Registration చేయండి.",
    en: "No account for this email. Please register your Society first.",
    hi: "इस ईमेल पर कोई खाता नहीं है। पहले सोसाइटी पंजीकरण करें।",
  },
  linkSentTitle: { te: "Login link పంపబడింది", en: "Login link sent", hi: "लॉगिन लिंक भेज दिया गया" },
  linkSentMsg: {
    te: "మీ Email Inbox / Spam folder లో వచ్చిన email open చేసి, అందులో ఉన్న Log In button నొక్కండి. 6-అంకెల code రాదు.",
    en: "Open the email in your Inbox / Spam folder and tap the Log In button. There is no 6-digit code.",
    hi: "अपने Inbox / Spam folder में आए ईमेल को खोलें और Log In बटन दबाएँ। कोई 6-अंक का कोड नहीं आएगा।",
  },
  clickLoginInEmail: {
    te: "Email లోని \"Log In\" button నొక్కండి",
    en: "Tap the \"Log In\" button in your email",
    hi: "ईमेल में \"Log In\" बटन दबाएँ",
  },
  oneTimeLink: {
    te: "Code enter చేయాల్సిన అవసరం లేదు. Link ఒకసారి మాత్రమే పని చేస్తుంది.",
    en: "No code to enter. The link works only once.",
    hi: "कोई कोड दर्ज करने की आवश्यकता नहीं है। लिंक केवल एक बार काम करेगा।",
  },
  continueAfterClick: {
    te: "Link క్లిక్ చేసిన తర్వాత కొనసాగండి",
    en: "Continue after clicking the link",
    hi: "लिंक क्लिक करने के बाद जारी रखें",
  },
  changeEmail: { te: "← Email మార్చండి", en: "← Change email", hi: "← ईमेल बदलें" },
};

// Indian languages – supported via Sanscript transliteration from Hindi (Devanagari)
// or Telugu source, with English fallback for non-Indic scripts.
export const LANG_OPTIONS: { code: string; label: string; short: string; script: "te" | "hi" | "en" | string }[] = [
  { code: "te", label: "తెలుగు", short: "తె", script: "te" },
  { code: "en", label: "English", short: "EN", script: "en" },
  { code: "hi", label: "हिन्दी", short: "हि", script: "hi" },
  { code: "mr", label: "मराठी", short: "म", script: "devanagari" },
  { code: "ne", label: "नेपाली", short: "ने", script: "devanagari" },
  { code: "sa", label: "संस्कृतम्", short: "सं", script: "devanagari" },
  { code: "bn", label: "বাংলা", short: "বা", script: "bengali" },
  { code: "as", label: "অসমীয়া", short: "অ", script: "bengali" },
  { code: "or", label: "ଓଡ଼ିଆ", short: "ଓ", script: "oriya" },
  { code: "gu", label: "ગુજરાતી", short: "ગુ", script: "gujarati" },
  { code: "pa", label: "ਪੰਜਾਬੀ", short: "ਪੰ", script: "gurmukhi" },
  { code: "ta", label: "தமிழ்", short: "த", script: "tamil" },
  { code: "kn", label: "ಕನ್ನಡ", short: "ಕ", script: "kannada" },
  { code: "ml", label: "മലയാളം", short: "മ", script: "malayalam" },
  { code: "ur", label: "اردو", short: "ار", script: "en" },
];

function translit(text: string, target: string): string {
  if (!text) return text;
  try {
    const hasDeva = /[\u0900-\u097F]/.test(text);
    const hasTelu = /[\u0C00-\u0C7F]/.test(text);
    if (!hasDeva && !hasTelu) return text;
    const from = hasDeva ? "devanagari" : "telugu";
    if (target === from) return text;
    return Sanscript.t(text, from, target);
  } catch {
    return text;
  }
}

function resolve(entry: Entry | undefined, lang: string): string {
  if (!entry) return "";
  const opt = LANG_OPTIONS.find((o) => o.code === lang);
  const script = opt?.script ?? "en";
  if (script === "te") return entry.te;
  if (script === "en") return entry.en;
  if (script === "hi") return entry.hi;
  // Indic script – transliterate from Hindi (Devanagari) source.
  return translit(entry.hi, script);
}

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: keyof typeof DICT) => string;
}>({
  lang: "te",
  setLang: () => {},
  t: (k) => DICT[k]?.te ?? String(k),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("te");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    const valid = urlLang && LANG_OPTIONS.some((o) => o.code === urlLang) ? urlLang : null;
    if (valid) {
      localStorage.setItem("mbr_lang", valid);
      setLangState(valid);
      return;
    }
    const saved = (localStorage.getItem("mbr_lang") as Lang) || "te";
    setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("mbr_lang", l);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (k: keyof typeof DICT) => resolve(DICT[k], lang),
    }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
