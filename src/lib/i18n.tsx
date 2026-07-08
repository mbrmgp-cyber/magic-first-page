import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Sanscript from "@indic-transliteration/sanscript";

export type Lang = string;
export type LocalizedEntry = { te: string; en: string; hi?: string };

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
  welcome: { te: "స్వాగతం", en: "Welcome", hi: "स्वागत" },
  loginWithEmail: {
    te: "ఈమెయిల్ తో లాగిన్ (ఇప్పటికే రిజిస్టర్ అయ్యారా?)",
    en: "Login with Email (Already registered?)",
    hi: "ईमेल से लॉगिन (पहले से पंजीकृत?)",
  },
  loginWithEmailDesc: {
    te: "మీ Email ఎంటర్ చేయండి, login link మీ Email కి వస్తుంది",
    en: "Enter your email — a secure login link will be sent",
    hi: "अपना ईमेल दर्ज करें — एक सुरक्षित लॉगिन लिंक भेजा जाएगा",
  },
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

  orgRegisterTitle: { te: "సంస్థ నమోదు", en: "Organization Register", hi: "संगठन पंजीकरण" },
  orgRegisterSubtitle: { te: "వివరాలు పూరించండి", en: "Fill in the details", hi: "विवरण भरें" },
  govRegisteredQ: {
    te: "మీ సంస్థ ప్రభుత్వ గుర్తింపు పొందినదా?",
    en: "Is your organization government registered?",
    hi: "क्या आपका संगठन सरकारी पंजीकृत है?",
  },
  yes: { te: "అవును", en: "Yes", hi: "हाँ" },
  no: { te: "కాదు", en: "No", hi: "नहीं" },
  orgName: { te: "సంస్థ పేరు", en: "Organization Name", hi: "संगठन का नाम" },
  committeeName: { te: "కమిటీ పేరు", en: "Committee Name", hi: "समिति का नाम" },
  orgEmail: { te: "సంస్థ ఇమెయిల్", en: "Organization Email", hi: "संगठन ईमेल" },
  committeeEmail: { te: "కమిటీ ఇమెయిల్", en: "Committee Email", hi: "समिति ईमेल" },
  orgSlogan: { te: "నినాదం", en: "Slogan", hi: "नारा" },
  orgPhone: { te: "ఫోన్", en: "Phone", hi: "फोन" },
  verifyAadhaarOtp: { te: "ఆధార్ OTP ద్వారా ధృవీకరించండి", en: "Verify Aadhaar via OTP", hi: "OTP द्वारा आधार सत्यापित करें" },
  enterAadhaarOtp: { te: "ఆధార్‌కు లింక్ చేసిన మొబైల్‌కు పంపిన 6-అంకెల OTP నమోదు చేయండి", en: "Enter the 6-digit OTP sent to the mobile linked with Aadhaar", hi: "आधार से जुड़े मोबाइल पर भेजा गया 6 अंकों का OTP दर्ज करें" },
  aadhaarVerified: { te: "ఆధార్ ధృవీకరించబడింది ✓", en: "Aadhaar verified ✓", hi: "आधार सत्यापित ✓" },
  verify: { te: "ధృవీకరించు", en: "Verify", hi: "सत्यापित करें" },
  govRegNumber: { te: "ప్రభుత్వ నమోదు సంఖ్య", en: "Government Registration Number", hi: "सरकारी पंजीकरण संख्या" },
  govQrUpload: { te: "ప్రభుత్వ QR Code", en: "Government QR Code", hi: "सरकारी QR कोड" },
  registrationCertificate: { te: "నమోదు ధృవీకరణ పత్రం", en: "Registration Certificate (Photo)", hi: "पंजीकरण प्रमाणपत्र (फोटो)" },
  panCard: { te: "సంస్థ PAN కార్డ్", en: "Organization PAN Card", hi: "संगठन का PAN कार्ड" },
  bankAccount: { te: "బ్యాంకు ఖాతా సంఖ్య", en: "Bank Account Number", hi: "बैंक खाता संख्या" },
  bankIfsc: { te: "IFSC కోడ్", en: "IFSC Code", hi: "IFSC कोड" },
  orgLogo: { te: "సంస్థ లోగో", en: "Organization Logo", hi: "संगठन का लोगो" },
  committeeLogo: { te: "కమిటీ లోగో", en: "Committee Logo", hi: "समिति का लोगो" },
  adminName: { te: "నిర్వాహకుని పేరు", en: "Admin Name", hi: "व्यवस्थापक का नाम" },
  adminDesignation: { te: "హోదా", en: "Designation", hi: "पदनाम" },
  adminAadhaar: { te: "నిర్వాహకుని ఆధార్ కార్డ్", en: "Admin Aadhaar Card", hi: "व्यवस्थापक का आधार कार्ड" },
  uploadFromGallery: { te: "గ్యాలరీ నుండి ఎంచుకోండి", en: "Upload from gallery", hi: "गैलरी से चुनें" },
  changeFile: { te: "మార్చండి", en: "Change", hi: "बदलें" },
  foundersHeading: { te: "వ్యవస్థాపకులు", en: "Founders", hi: "संस्थापक" },
  add: { te: "జోడించండి", en: "Add", hi: "जोड़ें" },
  founderNamePh: { te: "పేరు", en: "Name", hi: "नाम" },
  founderAddrPh: { te: "చిరునామా", en: "Address", hi: "पता" },
  aadhaarCard: { te: "ఆధార్ కార్డ్", en: "Aadhaar Card", hi: "आधार कार्ड" },
  submitForVerification: { te: "ధృవీకరణ కోసం సమర్పించండి", en: "Submit for Verification", hi: "सत्यापन के लिए जमा करें" },
  registering: { te: "నమోదు చేస్తున్నాం…", en: "Registering…", hi: "पंजीकरण हो रहा है…" },
  orRule: { te: "— లేదా —", en: "— or —", hi: "— या —" },
  registrationDoneTitle: { te: "నమోదు సమర్పించబడింది", en: "Registration submitted", hi: "पंजीकरण जमा किया गया" },
  underReviewTitle: { te: "MBR సమీక్షలో ఉంది", en: "Under MBR Review", hi: "MBR समीक्षा में है" },
  underReviewMsg: {
    te: "MBR admin మీ వివరాలు ధృవీకరించిన తర్వాత Email ద్వారా approval link మరియు unique QR Code వస్తాయి.",
    en: "Once the MBR admin verifies your details, an approval link and a unique QR Code will be sent to your email.",
    hi: "MBR व्यवस्थापक के सत्यापन के बाद, अनुमोदन लिंक और QR कोड आपके ईमेल पर भेजा जाएगा।",
  },
  goToLogin: { te: "Login పేజీకి వెళ్ళండి", en: "Go to Login", hi: "लॉगिन पर जाएँ" },
  pleaseWait: { te: "దయచేసి కొద్దిసేపు ఆగండి…", en: "Please wait a moment…", hi: "कृपया प्रतीक्षा करें…" },
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

function scriptForLang(lang: string) {
  return LANG_OPTIONS.find((o) => o.code === lang)?.script ?? "en";
}

function isValidLang(lang: string | null): lang is Lang {
  return !!lang && LANG_OPTIONS.some((o) => o.code === lang);
}

function readUrlLang(): Lang | null {
  if (typeof window === "undefined") return null;
  const searchLang = new URLSearchParams(window.location.search).get("lang");
  if (isValidLang(searchLang)) return searchLang;
  const hash = window.location.hash.replace(/^#/, "");
  const hashQuery = hash.includes("?") ? hash.split("?")[1] : hash;
  const hashLang = new URLSearchParams(hashQuery).get("lang");
  return isValidLang(hashLang) ? hashLang : null;
}

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const urlLang = readUrlLang();
  if (urlLang) return urlLang;
  const saved = localStorage.getItem("mbr_lang");
  if (isValidLang(saved)) return saved;
  const browserLang = navigator.language?.split("-")[0] ?? "";
  return isValidLang(browserLang) ? browserLang : "en";
}

export function localizeText(entry: LocalizedEntry, lang: string): string {
  const script = scriptForLang(lang);
  if (script === "te") return entry.te;
  if (script === "en") return entry.en;
  if (script === "hi") return entry.hi ?? translit(entry.te, "devanagari");
  return translit(entry.te, script);
}

// Dictionary of common English loanwords written in Telugu/Devanagari.
// Maps the *source* Indic word (lowercased key form is not used; we match
// on the original text) to the intended English spelling.
const EN_LOANWORDS: Record<string, string> = {
  // Telugu
  "సభ్యుల వివరాలు": "MEMBER DETAILS",
  "సభ్యుడి వివరాలు": "MEMBER DETAILS",
  "సభ్యుని వివరాలు": "MEMBER DETAILS",
  "సభ్యులను చేర్చు": "ADD MEMBER",
  "సభ్యుడిని చేర్చు": "ADD MEMBER",
  "సభ్యుని చేర్చు": "ADD MEMBER",
  "అందరూ": "TOTAL",
  "మొత్తం": "TOTAL",
  "తండ్రి పేరు": "FATHER NAME",
  "తండ్రి": "FATHER",
  "వివరాలు & Loans": "LOAN DETAILS",
  "వివరాలు & లోన్లు": "LOAN DETAILS",
  "వివరాలు": "DETAILS",
  "కమిటీ Fee (₹)": "JOINING FEE (₹)",
  "కమిటీ Fee": "JOINING FEE",
  "కమిటీ ఫీ": "JOINING FEE",
  "చేరిన తేదీ": "JOINING DATE",
  "చేరిన తేది": "JOINING DATE",
  "చేరిన": "JOINING",
  "చేర్చు": "ADD",
  "మార్చండి": "EDIT",
  "రెడ్డి": "REDDY",
  "సొసైటీ": "SOCIETY",
  "సొసైటి": "SOCIETY",
  "సొసైట": "SOCIETY",
  "హెల్ప్‌లైన్": "HELPLINE",
  "హెల్ప్ లైన్": "HELP LINE",
  "హెల్ప్": "HELP",
  "లైన్": "LINE",
  "రిజిస్టర్": "REGISTER",
  "రిజిస్ట్రేషన్": "REGISTRATION",
  "లాగిన్": "LOGIN",
  "లాగౌట్": "LOGOUT",
  "ఇమెయిల్": "EMAIL",
  "ఈమెయిల్": "EMAIL",
  "పాస్‌వర్డ్": "PASSWORD",
  "పాస్వర్డ్": "PASSWORD",
  "అడ్మిన్": "ADMIN",
  "సూపర్": "SUPER",
  "మెంబర్": "MEMBER",
  "మెంబర్స్": "MEMBERS",
  "కమిటీ": "COMMITTEE",
  "ఆఫీస్": "OFFICE",
  "ఫోన్": "PHONE",
  "మొబైల్": "MOBILE",
  "ఆధార్": "AADHAAR",
  "పాన్": "PAN",
  "బ్యాంక్": "BANK",
  "అకౌంట్": "ACCOUNT",
  "ఐడి": "ID",
  "ఐడీ": "ID",
  "కార్డ్": "CARD",
  "క్యూఆర్": "QR",
  "కోడ్": "CODE",
};

function applyLoanwordSubstitutions(text: string): string {
  let out = text;
  // Sort by length descending so multi-word phrases (HELPLINE) match before HELP.
  const keys = Object.keys(EN_LOANWORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (out.includes(k)) out = out.split(k).join(EN_LOANWORDS[k]);
  }
  return out;
}

function toCleanEnglish(text: string, from: "telugu" | "devanagari"): string {
  try {
    // First, replace known English loanwords with their real English spelling.
    const preprocessed = applyLoanwordSubstitutions(text);
    // If nothing Indic remains, return uppercased as-is.
    if (!/[\u0C00-\u0C7F\u0900-\u097F]/.test(preprocessed)) {
      return preprocessed.toUpperCase();
    }
    const iast = Sanscript.t(preprocessed, from, "iast");
    // Strip combining diacritics (ā→a, ṭ→t, ṇ→n, ḥ→h, etc.)
    let s = iast.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Common leftover characters from IAST that NFD didn't decompose cleanly
    s = s.replace(/[ḷḹ]/gi, "l").replace(/[ṛṝ]/gi, "r").replace(/ḥ/gi, "h").replace(/ṃ/gi, "m");
    // Sanscript uses "c" for చ/च — English readers expect "ch"
    s = s.replace(/c(?!h)/g, "ch").replace(/C(?!h|H)/g, "Ch");
    // Uppercase everything — English labels should render in ALL CAPS
    s = s.toUpperCase();
    return s;
  } catch {
    return text;
  }
}

export function transliterateText(text: string | null | undefined, lang: string): string {
  if (!text) return "";
  const script = scriptForLang(lang);
  if (script === "te") return text;
  const hasTelu = /[\u0C00-\u0C7F]/.test(text);
  const hasDeva = /[\u0900-\u097F]/.test(text);
  if (!hasTelu && !hasDeva) return text;
  const from = hasTelu ? "telugu" : "devanagari";
  if (script === "en") return toCleanEnglish(text, from);
  const target = script === "hi" ? "devanagari" : script;
  try { return Sanscript.t(text, from, target); } catch { return text; }
}

function resolve(entry: Entry | undefined, lang: string): string {
  if (!entry) return "";
  return localizeText(entry, lang);
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
    const resolved = initialLang();
    localStorage.setItem("mbr_lang", resolved);
    setLangState(resolved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

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
