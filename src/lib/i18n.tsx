import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "te" | "en" | "hi";

type Dict = Record<string, { te: string; en: string; hi: string }>;

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
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT) => string }>({
  lang: "te",
  setLang: () => {},
  t: (k) => DICT[k]?.te ?? String(k),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("te");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("mbr_lang") as Lang)) || "te";
    setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("mbr_lang", l);
  };

  const t = (k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
