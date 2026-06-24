// Ready-made ID card templates (Template-First Design Studio).
// Each template defines default styling for global card chrome and per-element
// text styling. The IdCardRenderer reads this design + member data to draw
// front/back card sides.

export type CardType = "normal" | "keychain";

export type TemplateId =
  | "classic"
  | "modern"
  | "vertical"
  | "premium"
  | "minimal";

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
  // back
  | "village"
  | "pincode"
  | "phone"
  | "email"
  | "bloodGroup"
  | "address"
  | "presidentSignature"
  | "presidentName";

export type ElementStyle = {
  visible: boolean;
  // Text-only fields
  font?: string;
  size?: number;     // px
  weight?: number;   // 400-900
  color?: string;    // hex
  // Image-only
  imgSize?: number;  // px (logo/photo/qr)
};

export type GlobalStyle = {
  borderColor: string;
  borderWidth: number;            // px
  borderStyle: "solid" | "dashed" | "none";
  backgroundColor: string;
  cornerRadius: number;           // px
  accentColor: string;            // header band / accents
};

export type IdCardDesign = {
  cardType: CardType;
  templateId: TemplateId;
  global: GlobalStyle;
  elements: Record<ElementKey, ElementStyle>;
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

const TEXT_DEFAULTS = (overrides: Partial<ElementStyle> = {}): ElementStyle => ({
  visible: true,
  font: "Inter",
  size: 12,
  weight: 500,
  color: "#111111",
  ...overrides,
});

function makeElements(accent: string, textColor: string): Record<ElementKey, ElementStyle> {
  return {
    logo:        { visible: true, imgSize: 56 },
    orgName:     TEXT_DEFAULTS({ size: 16, weight: 800, color: "#ffffff", font: "Poppins" }),
    slogan:      TEXT_DEFAULTS({ size: 11, weight: 500, color: "#ffffff", font: "Merriweather" }),
    regNumber:   TEXT_DEFAULTS({ size: 10, weight: 500, color: "#ffffff" }),
    memberName:  TEXT_DEFAULTS({ size: 15, weight: 800, color: textColor }),
    fatherName:  TEXT_DEFAULTS({ size: 11, weight: 500, color: textColor }),
    memberCode:  TEXT_DEFAULTS({ size: 12, weight: 700, color: accent }),
    designation: TEXT_DEFAULTS({ size: 11, weight: 600, color: accent }),
    photo:       { visible: true, imgSize: 84 },
    qrCode:      { visible: true, imgSize: 64 },
    village:     TEXT_DEFAULTS({ size: 11 }),
    pincode:     TEXT_DEFAULTS({ size: 11 }),
    phone:       TEXT_DEFAULTS({ size: 11 }),
    email:       TEXT_DEFAULTS({ size: 11 }),
    bloodGroup:  TEXT_DEFAULTS({ size: 12, weight: 700, color: "#c1121f" }),
    address:     TEXT_DEFAULTS({ size: 10 }),
    presidentSignature: { visible: true, imgSize: 80 },
    presidentName: TEXT_DEFAULTS({ size: 10, weight: 600 }),
  };
}

export const TEMPLATE_META: Record<TemplateId, { en: string; te: string; description: string }> = {
  classic: { en: "Classic Rectangle", te: "క్లాసిక్ రెక్టాంగిల్", description: "Top header band, photo left, details right" },
  modern:  { en: "Modern Rounded",    te: "మోడర్న్ రౌండెడ్",   description: "Gradient header, centered photo" },
  vertical:{ en: "Vertical Portrait", te: "నిలువు పోర్ట్రెయిట్", description: "Lanyard-friendly vertical layout" },
  premium: { en: "Premium Gold",      te: "ప్రీమియం గోల్డ్",   description: "Dark with gold accents, formal" },
  minimal: { en: "Minimal Clean",     te: "మినిమల్ క్లీన్",   description: "White minimal with thin borders" },
};

export const TEMPLATES: Record<TemplateId, Omit<IdCardDesign, "cardType">> = {
  classic: {
    templateId: "classic",
    global: { borderColor: "#0e7c66", borderWidth: 2, borderStyle: "solid", backgroundColor: "#ffffff", cornerRadius: 12, accentColor: "#0e7c66" },
    elements: makeElements("#0e7c66", "#111111"),
  },
  modern: {
    templateId: "modern",
    global: { borderColor: "#2563eb", borderWidth: 0, borderStyle: "none", backgroundColor: "#ffffff", cornerRadius: 20, accentColor: "#2563eb" },
    elements: makeElements("#2563eb", "#0f172a"),
  },
  vertical: {
    templateId: "vertical",
    global: { borderColor: "#b45309", borderWidth: 2, borderStyle: "solid", backgroundColor: "#fffaf2", cornerRadius: 14, accentColor: "#b45309" },
    elements: makeElements("#b45309", "#1f2937"),
  },
  premium: {
    templateId: "premium",
    global: { borderColor: "#d4af37", borderWidth: 2, borderStyle: "solid", backgroundColor: "#0b0b0d", cornerRadius: 14, accentColor: "#d4af37" },
    elements: {
      ...makeElements("#d4af37", "#f4e9c1"),
      memberName: TEXT_DEFAULTS({ size: 15, weight: 800, color: "#f4e9c1" }),
      fatherName: TEXT_DEFAULTS({ size: 11, weight: 500, color: "#e5dab5" }),
      village:    TEXT_DEFAULTS({ size: 11, color: "#e5dab5" }),
      pincode:    TEXT_DEFAULTS({ size: 11, color: "#e5dab5" }),
      phone:      TEXT_DEFAULTS({ size: 11, color: "#e5dab5" }),
      email:      TEXT_DEFAULTS({ size: 11, color: "#e5dab5" }),
      address:    TEXT_DEFAULTS({ size: 10, color: "#e5dab5" }),
      presidentName: TEXT_DEFAULTS({ size: 10, weight: 600, color: "#e5dab5" }),
    },
  },
  minimal: {
    templateId: "minimal",
    global: { borderColor: "#d4d4d8", borderWidth: 1, borderStyle: "solid", backgroundColor: "#ffffff", cornerRadius: 8, accentColor: "#111111" },
    elements: makeElements("#111111", "#111111"),
  },
};

export function defaultDesign(templateId: TemplateId = "classic", cardType: CardType = "normal"): IdCardDesign {
  const base = TEMPLATES[templateId];
  return { cardType, ...base, global: { ...base.global }, elements: JSON.parse(JSON.stringify(base.elements)) };
}

// Friendly labels (English + Telugu) for the customization panel.
export const ELEMENT_LABELS: Record<ElementKey, { en: string; te: string; side: "front" | "back" }> = {
  logo:        { en: "Logo",              te: "లోగో",            side: "front" },
  orgName:     { en: "Organization Name", te: "సంస్థ పేరు",       side: "front" },
  slogan:      { en: "Slogan",            te: "స్లోగన్",          side: "front" },
  regNumber:   { en: "Registration No.",  te: "రిజిస్ట్రేషన్ నెం", side: "front" },
  photo:       { en: "Member Photo",      te: "సభ్యుడి ఫోటో",     side: "front" },
  memberName:  { en: "Member Name",       te: "సభ్యుడి పేరు",     side: "front" },
  fatherName:  { en: "Father's Name",     te: "తండ్రి పేరు",      side: "front" },
  memberCode:  { en: "Member ID",         te: "సభ్యత్వ నెం",      side: "front" },
  designation: { en: "Designation",       te: "పదవి",             side: "front" },
  qrCode:      { en: "QR Code",           te: "క్యూఆర్ కోడ్",     side: "front" },
  village:     { en: "Village",           te: "గ్రామం",          side: "back" },
  pincode:     { en: "Pincode",           te: "పిన్ కోడ్",        side: "back" },
  phone:       { en: "Phone",             te: "ఫోన్",            side: "back" },
  email:       { en: "Email",             te: "ఈమెయిల్",         side: "back" },
  bloodGroup:  { en: "Blood Group",       te: "బ్లడ్ గ్రూప్",     side: "back" },
  address:     { en: "Address",           te: "అడ్రస్",          side: "back" },
  presidentSignature: { en: "President Signature", te: "ప్రెసిడెంట్ సంతకం", side: "back" },
  presidentName: { en: "President Name",  te: "ప్రెసిడెంట్ పేరు", side: "back" },
};
