import type { IdCardDesign, ElementStyle } from "@/lib/idCardTemplates";
import type { OrgContext, SampleMember } from "./IdCardRenderer";
import { User } from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { sharedTranslation } from "@/lib/language-support";


type Org = {
  name: string;
  logo_url?: string | null;
  letter_code?: string | null;
  org_code?: string | null;
  gov_reg_number?: string | null;
  slogan?: string | null;
  phone?: string | null;
  email?: string | null;
  president_name?: string | null;
  president_signature_url?: string | null;
  theme_color?: string | null;
  theme_settings?: {
    headAlign?: "left" | "center" | "right";
    headFont?: string;
    subColor?: string;
    subFont?: string;
  } | null;
  id_card_design?: any;
};

type Member = {
  id: string;
  org_id?: string;
  name: string;
  member_code?: string | null;
  father_name?: string | null;
  phone?: string | null;
  email?: string;
  address?: string | null;
  village?: string | null;
  mandal?: string | null;
  joined_date?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  blood_group?: string | null;
};

type CardLang = "te" | "en" | "hi";

const L: Record<CardLang, Record<string, string>> = {
  te: {
    member: "సభ్యుడు", id: "ఐడి", father: "తండ్రి", phone: "ఫోన్", joined: "చేరిన",
    village: "గ్రామం", mandal: "మండలం",
    president: "అధ్యక్షుడు", vice_president: "ఉపాధ్యక్షుడు", treasurer: "కోశాధికారి",
    advisor: "సలహాదారు", executive: "కార్యవర్గ సభ్యుడు", worker: "కార్యకర్త",
    active: "● యాక్టివ్ సభ్యుడు", inactive: "● ఇనాక్టివ్",
    objectives: "ముఖ్య ఉద్దేశాలు", oath: "సభ్యుని ప్రమాణం",
    jaihind: "జై హింద్",
    mbrApp: "కొత్త సభ్యుల నమోదు",
    obj1: "చిట్వేల్ మండల ప్రజలకు మౌలిక సదుపాయాల (విద్య, వైద్య, పర్యావరణ) ఏర్పాటు కై ప్రయత్నం.",
    obj2: "కుల, మత, ప్రాంత, వర్గ, రాజకీయాలకు అతీతంగా యువకులలో దేశభక్తిని పెంచడం. మానవత్వంతో నిస్వార్థ సేవ చేపట్టడం.",
    obj3: "అత్యవసర పరిస్థితుల్లో ప్రభుత్వ అధికారులకు సహాయ సహకారాలు అందించడం. వారి నిజాయితీని గ్రహించి సన్మానించడం.",
    oathText: "నేను నమ్మిన దైవం సాక్షిగా (భగవద్గీత / ఖురాన్ / బైబుల్) ఎటువంటి స్వార్థం లేకుండా ఈ సంఘంలోని నిబంధనలకు అనుగుణంగా నడుచుకుంటానని సభ్యునిగా ప్రమాణం చేస్తున్నాను.",
  },
  en: {
    member: "MEMBER", id: "ID", father: "Father", phone: "Phone", joined: "Joined",
    village: "Village", mandal: "Mandal",
    president: "PRESIDENT", vice_president: "VICE PRESIDENT", treasurer: "TREASURER",
    advisor: "ADVISOR", executive: "EXECUTIVE", worker: "WORKER",
    active: "● ACTIVE MEMBER", inactive: "● INACTIVE",
    objectives: "Key Objectives", oath: "Member's Oath",
    jaihind: "Jai Hind",
    mbrApp: "New Member Registration",
    obj1: "Strive to provide basic facilities (education, healthcare, environment) for the people of Chitvel Mandal.",
    obj2: "Foster patriotism among youth beyond caste, religion, region, class and politics. Undertake selfless service with humanity.",
    obj3: "Assist government officials in emergencies. Recognize and honour their integrity.",
    oathText: "In the presence of the God I believe in (Bhagavad Gita / Quran / Bible), I pledge as a member to act selflessly and in accordance with the rules of this society.",
  },
  hi: {
    member: "सदस्य", id: "आईडी", father: "पिता", phone: "फ़ोन", joined: "शामिल",
    village: "गाँव", mandal: "मंडल",
    president: "अध्यक्ष", vice_president: "उपाध्यक्ष", treasurer: "कोषाध्यक्ष",
    advisor: "सलाहकार", executive: "कार्यकारी सदस्य", worker: "कार्यकर्ता",
    active: "● सक्रिय सदस्य", inactive: "● निष्क्रिय",
    objectives: "मुख्य उद्देश्य", oath: "सदस्य की शपथ",
    jaihind: "जय हिन्द",
    mbrApp: "नए सदस्य पंजीकरण",
    obj1: "चित्वेल मंडल के लोगों के लिए मौलिक सुविधाओं (शिक्षा, चिकित्सा, पर्यावरण) की व्यवस्था का प्रयास।",
    obj2: "जाति, धर्म, क्षेत्र, वर्ग और राजनीति से ऊपर उठकर युवाओं में देशभक्ति बढ़ाना। मानवता के साथ निःस्वार्थ सेवा करना।",
    obj3: "आपातकालीन परिस्थितियों में सरकारी अधिकारियों को सहायता देना। उनकी ईमानदारी को पहचानकर सम्मानित करना।",
    oathText: "मैं अपने ईश्वर की साक्षी में (भगवद्गीता / कुरान / बाइबल) बिना किसी स्वार्थ के इस संघ के नियमों के अनुसार आचरण करने की सदस्य के रूप में शपथ लेता/लेती हूँ।",
  },
};

const TELUGU_FONT = '"Noto Sans Telugu", "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
const SOCIETY_EMAIL = "chitvelhelplinesociety@gmail.com";
const SOCIETY_PHONE = "+91 90595 94989";

const SLOGAN = "॥ మానవసేవే మాధవసేవ ॥";

// Intrinsic card size at 96dpi: 85.6mm × 54mm ≈ 323.6px × 204.1px
function CardFront({
  design, fref, member, org, photoUrl, logoUrl, sigUrl, qrDataUrl, qrLink, joined, t, lang, roleKey,
}: {
  design: IdCardDesign;
  fref: React.RefObject<HTMLDivElement | null>;
  member: Member; org: Org | null;
  photoUrl: string | null; logoUrl: string | null; sigUrl: string | null;
  qrDataUrl: string;
  qrLink?: string;
  joined: string;
  t: Record<string, string>;
  lang: CardLang;
  roleKey?: string | null;
}) {
  // Derive village & mandal: prefer explicit fields, else parse address.
  let village = member.village ?? null;
  let mandal = member.mandal ?? null;
  if ((!village || !mandal) && member.address) {
    const parts = member.address.split(",").map(s => s.trim()).filter(Boolean);
    if (!village && parts[0]) village = parts[0];
    if (!mandal && parts[1]) mandal = parts[1];
  }
  const societyEmail = org?.email || SOCIETY_EMAIL;
  const societyPhone = org?.phone || SOCIETY_PHONE;
  const accent = design.global.accentColor;
  const e = design.elements;
  const g = design.global;


  return (
    <div
      ref={fref}
      className="relative overflow-hidden"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: design.global.cornerRadius,
        border: "none",
        background: design.global.backgroundColor,
        fontFamily: TELUGU_FONT,
      }}
    >
      {/* Saffron header — title in dark blue with Telugu font so vattulu render clearly */}
      <div style={{
        background: accent,
        padding: "1.4mm 2.5mm", display: "flex", alignItems: "center",
        gap: "2.2mm", height: "13mm",
      }}>
        {e.logo.visible && (logoUrl ? (
          <img src={logoUrl} alt="" style={{ height: e.logo.imgSize, width: e.logo.imgSize, borderRadius: "50%", background: "var(--society-paper)", objectFit: "cover", border: "0.3mm solid var(--society-paper)", transform: `translateX(${g.headerLogoOffsetX || 0}px)` }} />
        ) : (
          <div style={{ height: e.logo.imgSize, width: e.logo.imgSize, borderRadius: "50%", background: "var(--society-paper)" }} />
        ))}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35, textAlign: g.headerAlign || "left" }}>
          <div style={{ fontFamily: `${e.orgName.font}, ${TELUGU_FONT}`, fontSize: e.orgName.size, fontWeight: e.orgName.weight, color: e.orgName.color, letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {e.orgName.visible && (org?.name ?? "Organization")}
          </div>
          <div style={{ fontFamily: `${e.slogan.font}, ${TELUGU_FONT}`, fontSize: e.slogan.size, color: e.slogan.color, fontWeight: e.slogan.weight, marginTop: "0.3mm", fontStyle: "italic", lineHeight: 1.3 }}>
            {e.slogan.visible && (lang === "te" ? SLOGAN : lang === "hi" ? "॥ मानवसेवा ही माधव सेवा ॥" : "॥ Service to Humanity is Service to God ॥")}
          </div>
          {e.regNumber.visible && org?.gov_reg_number && (
            <div style={{ fontSize: e.regNumber.size, color: e.regNumber.color, opacity: 0.85, marginTop: "0.1mm" }}>Reg: {org.gov_reg_number}</div>
          )}
        </div>
        <div style={{
          fontSize: e.designation.size, background: g.memberCodeBadgeBg,
          padding: "0.4mm 1.2mm", borderRadius: "1mm", fontWeight: e.designation.weight, color: e.designation.color, fontFamily: e.designation.font, transform: `translateX(${g.headerBadgeOffsetX || 0}px)`,
        }}>
          {e.designation.visible && ((roleKey && t[roleKey]) || t.member)}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "2.2mm", padding: "1.4mm 2.5mm 1mm", height: "32mm", background: g.backgroundColor, position: "relative" }}>
        <div style={{ width: e.photo.imgSize, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            width: e.photo.imgSize, height: (e.photo.imgSize ?? 75.59) * 1.2,
            border: "0.3mm solid var(--india-green)",
            background: "var(--society-photo)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {e.photo.visible && (photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User style={{ width: "9mm", height: "9mm", color: "var(--society-placeholder)" }} />
            ))}
          </div>
          {/* Active status badge — pushed slightly down with margin */}
          <div style={{
            marginTop: "1.4mm",
            fontFamily: TELUGU_FONT,
            fontSize: "1.7mm", fontWeight: 800,
            color: "var(--society-paper)",
            background: member.is_active === false ? "var(--society-muted)" : "var(--india-green)",
            textAlign: "center", padding: "0.5mm 0.6mm", borderRadius: "0.8mm",
            letterSpacing: 0, lineHeight: 1.2,
          }}>
            {member.is_active === false ? t.inactive : t.active}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, fontFamily: TELUGU_FONT, fontSize: "2.4mm", lineHeight: 1.35, color: "var(--society-text)", display: "flex", flexDirection: "column" }}>
          <div style={{
            fontSize: e.memberCode.size, color: e.memberCode.color, background: g.memberCodeBadgeBg, fontWeight: e.memberCode.weight,
            letterSpacing: 0, padding: "0.4mm 1.4mm", borderRadius: "0.8mm",
            display: "inline-block", alignSelf: "flex-start",
          }}>
            {e.memberCode.visible && `${t.id}: ${member.member_code ?? "—"}`}
          </div>
          <div style={{ fontSize: e.memberName.size, fontWeight: e.memberName.weight, marginTop: "0.6mm", fontFamily: `${e.memberName.font}, ${TELUGU_FONT}`, color: e.memberName.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.25 }}>
            {e.memberName.visible && member.name}
          </div>
          {e.fatherName.visible && member.father_name && <Row style={e.fatherName} label={t.father} value={member.father_name} />}
          {e.village.visible && village && <Row style={e.village} label={t.village} value={village} />}
          {e.village.visible && mandal && <Row style={e.village} label={t.mandal} value={mandal} />}
          {e.phone.visible && member.phone && <Row style={e.phone} label={t.phone} value={member.phone} />}
          <div style={{ display: "flex", gap: "1.5mm", marginTop: "0.4mm", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "2.1mm", color: "var(--society-body)" }}>
              <span style={{ color: "var(--society-muted)" }}>{t.joined}: </span>
              <span style={{ fontWeight: 600 }}>{joined}</span>
            </div>
            {e.bloodGroup.visible && member.blood_group && (
              <div style={{
                fontSize: "2.1mm", background: "var(--society-blood)", color: "var(--society-paper)",
                padding: "0.2mm 1.4mm", borderRadius: "0.8mm", fontWeight: 800,
              }}>
                🩸 {member.blood_group}
              </div>
            )}
          </div>

          {/* Signature pinned bottom-right */}
          <div style={{ marginTop: "auto", textAlign: "right" }}>
            {e.presidentSignature.visible && (sigUrl ? (
              <img src={sigUrl} alt="sig" style={{ height: "4.8mm", maxWidth: e.presidentSignature.imgSize, objectFit: "contain", marginLeft: "auto", display: "block" }} />
            ) : (
              <div
                style={{
                  height: "4.8mm",
                  fontFamily: '"Dancing Script","Brush Script MT","Lucida Handwriting","Segoe Script",cursive',
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "4.2mm",
                  color: "var(--society-ink)",
                  textAlign: "right",
                  lineHeight: 1,
                  transform: "rotate(-4deg)",
                  transformOrigin: "right bottom",
                  paddingRight: "1mm",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.presidentName.visible && (org?.president_name ?? "")}
              </div>
            ))}
            <div style={{ borderTop: "0.2mm solid var(--society-ink)", marginTop: "0.2mm", paddingTop: "0.2mm", fontSize: "1.8mm", color: "var(--society-ink)", fontWeight: 700, lineHeight: 1.1 }}>
              {e.presidentName.visible && (org?.president_name ?? "")}
              <div style={{ fontSize: "1.5mm", color: "var(--society-muted)", fontWeight: 500 }}>{t.president}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer (green): QR (left) — society email/phone (center, two lines) — MBR logo on black (right) */}
      <div style={{
        background: g.contactFooterBg || g.footerColor,
        height: "9mm",
        padding: "0.6mm 2mm", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "1.5mm",
      }}>
        {e.qrCode.visible && (qrDataUrl ? (
          qrLink ? (
            <a href={qrLink} aria-label="Open member QR link" style={{ height: e.qrCode.imgSize, width: e.qrCode.imgSize, background: "var(--society-paper)", padding: "0.3mm", borderRadius: "0.5mm", flexShrink: 0, display: "block" }}>
              <img src={qrDataUrl} alt="Member QR" style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
            </a>
          ) : (
            <img src={qrDataUrl} alt="Member QR" style={{ height: e.qrCode.imgSize, width: e.qrCode.imgSize, background: "var(--society-paper)", padding: "0.3mm", borderRadius: "0.5mm", flexShrink: 0 }} />
          )
        ) : <div style={{ width: "7.6mm" }} />)}

        <div style={{
          flex: 1, minWidth: 0, color: "var(--society-paper)", textAlign: "center",
          fontFamily: TELUGU_FONT, lineHeight: 1.25,
        }}>
          <div style={{ fontSize: g.contactFooterTextSize, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ✉ {societyEmail}
          </div>
          <div style={{ fontSize: g.contactFooterTextSize, fontWeight: 700, marginTop: "0.3mm" }}>
            ☎ {societyPhone}
          </div>
        </div>

        <div style={{
          height: e.mbrLogo.imgSize, width: e.mbrLogo.imgSize,
          background: "var(--society-brand)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0.7mm", flexShrink: 0,
        }}>
          <img src={mbrLogo.url} alt="MBR" style={{ height: "100%", width: "100%", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );
}

function CardBack({
  design, bref, t, memberName, appQrUrl, appQrLink, lang, accent,
}: {
  design: IdCardDesign;
  bref: React.RefObject<HTMLDivElement | null>;
  t: Record<string, string>;
  memberName: string;
  appQrUrl: string;
  appQrLink?: string;
  lang: CardLang;
  accent: string;
}) {
  const e = design.elements;
  const copy = (value: string, key: string) => value === L.te[key] ? t[key] : sharedTranslation(lang, value) || value;
  const objectives = (design.backMatter || `${L.te.obj1}\n${L.te.obj2}\n${L.te.obj3}`).split("\n");
  return (
    <div
      ref={bref}
      className="relative overflow-hidden"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: design.global.cornerRadius,
        border: "none",
        background: design.global.backgroundColor,
        fontFamily: TELUGU_FONT,
      }}
    >
      {/* tricolor stripe */}
      <div style={{ display: "flex", height: "2mm" }}>
        <div style={{ flex: 1, background: accent }} />
        <div style={{ flex: 1, background: "var(--society-paper)" }} />
        <div style={{ flex: 1, background: "var(--india-green)" }} />
      </div>


      <div style={{ padding: "1.5mm 2.5mm", height: "52mm", display: "flex", flexDirection: "column", gap: "1mm" }}>
        {/* Objectives */}
        <div>
          <div style={{ fontSize: "2.5mm", fontWeight: 800, color: "var(--society-ink)", borderBottom: `0.2mm solid ${accent}`, paddingBottom: "0.2mm", marginBottom: "0.5mm" }}>
            {t.objectives}
          </div>
          <ol style={{ margin: 0, paddingLeft: "3.5mm", fontSize: e.backMatter.size, lineHeight: e.backMatter.lineHeight, color: e.backMatter.color, fontFamily: e.backMatter.font, display: e.backMatter.visible ? undefined : "none" }}>
            {objectives.map((text, index) => <li key={index} style={{ marginBottom: "0.4mm" }}>{copy(text, `obj${index + 1}`)}</li>)}
          </ol>
        </div>

        {/* Oath + MBR app QR side-by-side */}
        <div style={{ marginTop: "0.4mm", display: "flex", gap: "2mm", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, visibility: e.oath.visible ? undefined : "hidden" }}>
            <div style={{ fontSize: "2.5mm", fontWeight: 800, color: "var(--india-green)", borderBottom: "0.2mm solid var(--india-green)", paddingBottom: "0.2mm", marginBottom: "0.4mm" }}>
              {t.oath}
            </div>
            <div style={{ fontSize: e.oath.size, lineHeight: e.oath.lineHeight, color: e.oath.color, fontFamily: e.oath.font, fontStyle: "italic" }}>
              "{copy(design.oathText || L.te.oathText, "oathText").replace(/\{name\}/g, memberName)}" — <span style={{ fontWeight: 700, fontStyle: "normal", color: "var(--society-ink)" }}>{memberName}</span>
            </div>
            <div style={{ fontSize: "2.1mm", fontWeight: 800, color: "var(--society-blood)", marginTop: "0.4mm", letterSpacing: 0 }}>
              {t.jaihind} 🇮🇳
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            {e.mbrQrCode.visible && appQrUrl && (
              appQrLink ? (
                <a href={appQrLink} aria-label="Open member registration QR" style={{ height: e.mbrQrCode.imgSize, width: e.mbrQrCode.imgSize, border: "0.2mm solid var(--society-ink)", padding: "0.3mm", background: "var(--society-paper)", display: "block", boxSizing: "border-box" }}>
                  <img src={appQrUrl} alt="MBR APP" style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
                </a>
              ) : (
                <img src={appQrUrl} alt="MBR APP" style={{ height: e.mbrQrCode.imgSize, width: e.mbrQrCode.imgSize, border: "0.2mm solid var(--society-ink)", padding: "0.3mm", background: "var(--society-paper)" }} />
              )
            )}
            <div style={{ fontSize: "1.5mm", fontWeight: 700, color: "var(--society-ink)", marginTop: "0.3mm", lineHeight: 1.1, maxWidth: "13mm" }}>
              {t.mbrApp}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, style }: { label: string; value: string; style?: ElementStyle }) {
  return (
    <div style={{ fontSize: style?.size || "2.2mm", color: style?.color || "var(--society-body)", fontFamily: `${style?.font || "Noto Sans"}, ${TELUGU_FONT}`, marginTop: "0.3mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ color: "var(--society-muted)" }}>{label}: </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}


export function SocietyCardRenderer({ design, org, member, side, lang }: { design: IdCardDesign; org: OrgContext; member: SampleMember; side: "front" | "back"; lang: CardLang }) {
  const society: Org = { name: org.name, gov_reg_number: org.regNumber, email: org.contactEmail, phone: org.contactPhone, president_name: org.presidentName };
  const person: Member = { id: "preview", name: member.name, member_code: member.memberCode, father_name: member.fatherName, village: member.village, mandal: member.mandal || member.pincode, phone: member.phone, joined_date: member.joinedDate, blood_group: member.bloodGroup, is_active: member.status !== "inactive" };
  const props = { design, lang, t: L[lang] };
  const nullRef = { current: null };
  return side === "front" ? <CardFront {...props} fref={nullRef} member={person} org={society} photoUrl={member.photoUrl || null} logoUrl={org.logoUrl || null} sigUrl={org.presidentSignatureUrl || null} qrDataUrl={member.qrUrl || ""} qrLink={member.qrLink || undefined} joined={member.joinedDate ? new Date(member.joinedDate).toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "en" ? "en-IN" : "te-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"} roleKey={member.roleKey} /> : <CardBack {...props} bref={nullRef} memberName={member.name} appQrUrl={org.mbrQrUrl || ""} appQrLink={org.mbrQrLink || undefined} accent={design.global.accentColor} />;
}
