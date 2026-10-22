// Ready-made ID card templates (Template-First Design Studio).

export type CardType = "normal" | "keychain";

export type TemplateId =
  | "classic"
  | "modern"
  | "vertical"
  | "premium"
  | "minimal"
  | "legacy";

export type ElementKey =
  | "logo"
  | "orgName"
  | "slogan"
  | "regNumber"
  | "memberName"
  | "fatherName"
  | "memberCode"
  | "designation"
  | "photo"
  | "qrCode"
  // front + back shared (also rendered prominently on front for normal cards)
  | "village"
  | "pincode"
  | "phone"
  | "email"
  | "bloodGroup"
  | "address"
  // back-only
  | "backMatter"
  | "oath"
  | "mbrQrCode"
  | "mbrLogo"
  | "presidentSignature"
  | "presidentName";


export type CornerPosition = "tl" | "tr" | "bl" | "br";

export type ElementStyle = {
  visible: boolean;
  font?: string;
  size?: number;
  weight?: number;
  color?: string;
  imgSize?: number;
  lineHeight?: number;
  corner?: CornerPosition;
};


export type GlobalStyle = {
  societyLayout?: boolean; // preserve the existing society card composition when editing
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "none";
  backgroundColor: string;
  cornerRadius: number;
  accentColor: string;
  footerColor?: string; // optional second accent (e.g. legacy green footer)
  headerAlign?: "left" | "center" | "right"; // align org name/slogan/reg next to logo
  headerLogoOffsetX?: number;  // horizontal nudge for the header logo
  headerBadgeOffsetX?: number; // horizontal nudge for the active/inactive badge in header
  frontBgImage?: string; // optional uploaded background image (front side)
  backBgImage?: string;  // optional uploaded background image (back side)
  // Independent overrides (not linked to accent):
  contactFooterBg?: string;       // bottom contact strip background
  contactFooterTextSize?: number; // bottom contact strip text size (px)
  memberCodeBadgeBg?: string;     // "A/0001" id badge background
};

export type IdCardDesign = {
  cardType: CardType;
  templateId: TemplateId;
  global: GlobalStyle;
  elements: Record<ElementKey, ElementStyle>;
  backMatter?: string; // editable back-side paragraph text
  oathText?: string;   // editable oath / pledge text (use {name} for member name)
};


export const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Roboto Slab",
  "Noto Sans",
  "Georgia",
];

const TEXT = (o: Partial<ElementStyle> = {}): ElementStyle => ({
  visible: true, font: "Inter", size: 12, weight: 500, color: "#111111", ...o,
});

function makeElements(accent: string, textColor: string): Record<ElementKey, ElementStyle> {
  return {
    logo:        { visible: true, imgSize: 48 },
    orgName:     TEXT({ size: 15, weight: 800, color: "#ffffff", font: "Poppins" }),
    slogan:      TEXT({ size: 10, weight: 500, color: "#ffffff", font: "Merriweather" }),
    regNumber:   TEXT({ size: 9, weight: 500, color: "#ffffff" }),
    memberName:  TEXT({ size: 16, weight: 800, color: textColor }),
    fatherName:  TEXT({ size: 10, weight: 500, color: textColor }),
    memberCode:  TEXT({ size: 11, weight: 700, color: accent }),
    designation: TEXT({ size: 10, weight: 600, color: accent }),
    photo:       { visible: true, imgSize: 84 },
    qrCode:      { visible: true, imgSize: 48, corner: "br" },
    village:     TEXT({ size: 10 }),
    pincode:     TEXT({ size: 10 }),
    phone:       TEXT({ size: 10, weight: 600 }),
    email:       TEXT({ size: 9, visible: false }),
    bloodGroup:  TEXT({ size: 11, weight: 800, color: "#c1121f" }),
    address:     TEXT({ size: 9, visible: false }),
    backMatter:  TEXT({ size: 10, weight: 500, lineHeight: 1.4 }),
    oath:        TEXT({ size: 9, weight: 500, lineHeight: 1.4, visible: false }),
    mbrQrCode:   { visible: true, imgSize: 56 },
    mbrLogo:     { visible: true, imgSize: 24, corner: "br" },

    presidentSignature: { visible: true, imgSize: 80 },
    presidentName: TEXT({ size: 9, weight: 600 }),
  };
}

export const TEMPLATE_META: Record<TemplateId, { en: string; te: string; description: string }> = {
  classic: { en: "Classic Rectangle", te: "క్లాసిక్ రెక్టాంగిల్", description: "Top header band, photo left, details right" },
  modern:  { en: "Modern Rounded",    te: "మోడర్న్ రౌండెడ్",   description: "Gradient header, centered photo" },
  vertical:{ en: "Vertical Portrait", te: "నిలువు పోర్ట్రెయిట్", description: "Lanyard-friendly vertical layout" },
  premium: { en: "Premium Gold",      te: "ప్రీమియం గోల్డ్",   description: "Dark with gold accents, formal" },
  minimal: { en: "Minimal Clean",     te: "మినిమల్ క్లీన్",   description: "White minimal with thin borders" },
  legacy:  { en: "Legacy Saffron",    te: "లెగసీ సాఫ్రాన్",   description: "Orange header + green footer (CHS classic)" },
};

const DEFAULT_BACK_MATTER =
  "ముఖ్య ఉద్దేశాలు:\nమండల ప్రజలకు మౌలిక సదుపాయాల (విద్య, వైద్య, పర్యావరణ) ఏర్పాట్లకై ప్రయత్నం.\nకుల, మత, ప్రాంత, వర్గ రాజకీయాలకు అతీతంగా యువకులలో దేశభక్తిని పెంచడం.\nఆపదలో ఉన్నవారికి నిస్వార్థ సహాయం అందించడం.";

const DEFAULT_OATH =
  "ప్రమాణం: ఈ సంస్థ ఆశయం కోసం, అందులోని విధివిధానాలకు అనుకూలంగా నిస్వార్థంగా సేవ చేస్తానని ప్రమాణం చేస్తున్నాను. — {name}";


export const TEMPLATES: Record<TemplateId, Omit<IdCardDesign, "cardType">> = {
  classic: {
    templateId: "classic",
    global: { borderColor: "#0e7c66", borderWidth: 2, borderStyle: "solid", backgroundColor: "#ffffff", cornerRadius: 12, accentColor: "#0e7c66" },
    elements: makeElements("#0e7c66", "#111111"),
    backMatter: DEFAULT_BACK_MATTER,
  },
  modern: {
    templateId: "modern",
    global: { borderColor: "#2563eb", borderWidth: 0, borderStyle: "none", backgroundColor: "#ffffff", cornerRadius: 20, accentColor: "#2563eb" },
    elements: makeElements("#2563eb", "#0f172a"),
    backMatter: DEFAULT_BACK_MATTER,
  },
  vertical: {
    templateId: "vertical",
    global: { borderColor: "#b45309", borderWidth: 2, borderStyle: "solid", backgroundColor: "#fffaf2", cornerRadius: 14, accentColor: "#b45309" },
    elements: makeElements("#b45309", "#1f2937"),
    backMatter: DEFAULT_BACK_MATTER,
  },
  premium: {
    templateId: "premium",
    global: { borderColor: "#d4af37", borderWidth: 2, borderStyle: "solid", backgroundColor: "#0b0b0d", cornerRadius: 14, accentColor: "#d4af37" },
    elements: {
      ...makeElements("#d4af37", "#f4e9c1"),
      village: TEXT({ size: 10, color: "#e5dab5" }),
      pincode: TEXT({ size: 10, color: "#e5dab5" }),
      phone:   TEXT({ size: 10, weight: 600, color: "#e5dab5" }),
      backMatter: TEXT({ size: 10, color: "#e5dab5" }),
    },
    backMatter: DEFAULT_BACK_MATTER,
  },
  minimal: {
    templateId: "minimal",
    global: { borderColor: "#d4d4d8", borderWidth: 1, borderStyle: "solid", backgroundColor: "#ffffff", cornerRadius: 8, accentColor: "#111111" },
    elements: makeElements("#111111", "#111111"),
    backMatter: DEFAULT_BACK_MATTER,
  },
  legacy: {
    templateId: "legacy",
    global: { borderColor: "#138808", borderWidth: 3, borderStyle: "solid", backgroundColor: "#ffffff", cornerRadius: 14, accentColor: "#FF9933", footerColor: "#138808" },
    elements: {
      ...makeElements("#FF9933", "#111111"),
      orgName: TEXT({ size: 16, weight: 900, color: "#000080", font: "Poppins" }),
      slogan:  TEXT({ size: 10, weight: 600, color: "#000080", font: "Merriweather" }),
      regNumber: TEXT({ size: 9, weight: 600, color: "#7a3a00" }),
      memberCode: TEXT({ size: 11, weight: 800, color: "#ffffff" }),
    },
    backMatter: DEFAULT_BACK_MATTER,
  },
};

export function defaultDesign(templateId: TemplateId = "classic", cardType: CardType = "normal"): IdCardDesign {
  const base = TEMPLATES[templateId];
  return {
    cardType,
    ...base,
    global: { ...base.global },
    elements: JSON.parse(JSON.stringify(base.elements)),
    backMatter: base.backMatter || DEFAULT_BACK_MATTER,
    oathText: DEFAULT_OATH,
  };
}

// Existing societies without a stored design display the saffron legacy card.
// Never apply the portal theme over an independently saved print design.
export function societyIdCardDesign(org: {
  id_card_design?: IdCardDesign | null;
  theme_color?: string | null;
}): IdCardDesign {
  if (org.id_card_design) return structuredClone(org.id_card_design);
  const design = defaultDesign("legacy", "normal");
  design.global.societyLayout = true;
  design.global.borderColor = "#000080";
  design.global.borderWidth = 1.13;
  design.global.cornerRadius = 11.34;
  design.elements.logo.imgSize = 41.57;
  design.elements.photo.imgSize = 75.59;
  design.elements.orgName = { ...design.elements.orgName, font: org.theme_settings?.headFont || "Noto Sans", size: 13.61 };
  design.elements.slogan = { ...design.elements.slogan, font: org.theme_settings?.subFont || "Noto Sans", size: 7.94, color: org.theme_settings?.subColor || "#000080" };
  design.elements.regNumber = { ...design.elements.regNumber, size: 6.43, color: "#000080" };
  design.elements.memberName.size = 12.85;
  design.elements.fatherName.size = 8.31;
  design.elements.village.size = 8.31;
  design.elements.phone.size = 8.31;
  design.elements.memberCode.size = 8.31;
  design.elements.qrCode = { visible: true, imgSize: 28.72, corner: "bl" };
  design.elements.mbrLogo.imgSize = 28.72;
  design.global.contactFooterTextSize = 7.18;
  if (org.theme_color) design.global.accentColor = org.theme_color;
  design.global.contactFooterBg = design.global.footerColor;
  design.global.memberCodeBadgeBg = design.elements.orgName.color;
  design.elements.memberName.color = design.elements.orgName.color;
  return design;
}

export const ELEMENT_LABELS: Record<ElementKey, { en: string; te: string; side: "front" | "back" }> = {
  logo:        { en: "Logo",              te: "లోగో",            side: "front" },
  orgName:     { en: "Organization Name", te: "సంస్థ పేరు",       side: "front" },
  slogan:      { en: "Slogan",            te: "స్లోగన్",          side: "front" },
  regNumber:   { en: "Registration No.",  te: "రిజిస్ట్రేషన్ నెం", side: "front" },
  photo:       { en: "Member Photo",      te: "సభ్యుడి ఫోటో",     side: "front" },
  memberName:  { en: "Member Name (Big)", te: "సభ్యుడి పేరు",     side: "front" },
  fatherName:  { en: "Father's Name",     te: "తండ్రి పేరు",      side: "front" },
  memberCode:  { en: "Member ID",         te: "సభ్యత్వ నెం",      side: "front" },
  designation: { en: "Designation",       te: "పదవి",             side: "front" },
  qrCode:      { en: "QR (Front Corner)", te: "క్యూఆర్ (ఫ్రంట్)", side: "front" },
  village:     { en: "Village",           te: "గ్రామం",          side: "front" },
  pincode:     { en: "Pincode",           te: "పిన్ కోడ్",        side: "front" },
  phone:       { en: "Phone (+91 ...)",   te: "ఫోన్",            side: "front" },
  email:       { en: "Email",             te: "ఈమెయిల్",         side: "front" },
  bloodGroup:  { en: "Blood Group",       te: "బ్లడ్ గ్రూప్",     side: "front" },
  address:     { en: "Address",           te: "అడ్రస్",          side: "back" },
  backMatter:  { en: "Back Side Text",    te: "వెనుక మేటర్",     side: "back" },
  oath:        { en: "Oath",              te: "ప్రమాణం",          side: "back" },
  mbrQrCode:   { en: "MBR App QR",        te: "MBR యాప్ క్యూఆర్", side: "back" },
  mbrLogo:     { en: "MBR Small Logo",    te: "MBR చిన్న లోగో",  side: "back" },
  presidentSignature: { en: "President Signature", te: "ప్రెసిడెంట్ సంతకం", side: "back" },
  presidentName: { en: "President Name",  te: "ప్రెసిడెంట్ పేరు", side: "back" },
};
