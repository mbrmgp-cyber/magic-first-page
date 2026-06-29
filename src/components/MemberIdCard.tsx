import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Sanscript from "@indic-transliteration/sanscript";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, IdCard, User, RotateCw, Languages } from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { IdCardRenderer, type OrgContext, type SampleMember } from "@/components/IdCard/IdCardRenderer";
import type { IdCardDesign } from "@/lib/idCardTemplates";
import { memberRegistrationUrl } from "@/lib/public-url";

// Transliterate Telugu-script source text into the chosen card language script.
// Numbers, ASCII (phone, email, codes), and punctuation pass through unchanged.
// te: no-op. hi: Telugu → Devanagari. en: Telugu → ITRANS, lightly cleaned for readability.
function tr(text: string | null | undefined, lang: "te" | "en" | "hi"): string {
  if (!text) return "";
  if (lang === "te") return text;
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
  if (!hasTelugu) return text;
  if (lang === "hi") {
    try { return Sanscript.t(text, "telugu", "devanagari"); } catch { return text; }
  }
  // English: telugu -> itrans, then prettify
  let out: string;
  try { out = Sanscript.t(text, "telugu", "itrans"); } catch { return text; }
  return out
    .replace(/~N|~n/g, "n")
    .replace(/\.n/g, "n")
    .replace(/[A-Z]/g, (c) => c.toLowerCase())
    .replace(/aa/g, "a").replace(/ii/g, "i").replace(/uu/g, "u")
    .replace(/RRi|R\^i/g, "ri")
    .replace(/\^|\.|_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}


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
    president: "అధ్యక్షుడు", active: "● యాక్టివ్ సభ్యుడు", inactive: "● ఇనాక్టివ్",
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
    president: "President", active: "● ACTIVE MEMBER", inactive: "● INACTIVE",
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
    president: "अध्यक्ष", active: "● सक्रिय सदस्य", inactive: "● निष्क्रिय",
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
const CARD_PX_W = 323.6;
const CARD_PX_H = 204.1;

function ScaledCard({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (!w) return;
      // never upscale beyond 1, only shrink to fit
      setScale(Math.min(1, w / CARD_PX_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: CARD_PX_W * scale, height: CARD_PX_H * scale }}>
        <div style={{ width: CARD_PX_W, height: CARD_PX_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function MemberIdCardButton({ member, org }: { member: Member; org: Org | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IdCard className="w-4 h-4 mr-1" /> ID కార్డ్
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px] p-4">
        <DialogHeader>
          <DialogTitle>సభ్యుడి ID కార్డ్</DialogTitle>
        </DialogHeader>
        <MemberIdCard member={member} org={org} />
      </DialogContent>
    </Dialog>
  );
}

export function MemberIdCard({ member, org }: { member: Member; org: Org | null }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [appQrUrl, setAppQrUrl] = useState<string>("");
  const [memberQrLink, setMemberQrLink] = useState<string>("");
  const [registrationQrLink, setRegistrationQrLink] = useState<string>("");
  const [showBack, setShowBack] = useState(false);
  const [lang, setLang] = useState<CardLang>("te");
  const [designation, setDesignation] = useState<string>("సభ్యుడు");
  const [presidentName, setPresidentName] = useState<string | null>(null);
  const t = L[lang];
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (member.photo_url) {
        const { data } = await supabase.storage.from("member-photos")
          .createSignedUrl(member.photo_url, 3600);
        if (!cancel && data?.signedUrl) setPhotoUrl(data.signedUrl);
      }
      if (org?.logo_url) setLogoUrl(org.logo_url);

      // Fetch active committee president — name + signature override the
      // legacy org-level president fields so the card always reflects the
      // currently elected president from committee_members.
      if (org?.id) {
        const { data: pres } = await supabase
          .from("committee_members")
          .select("members(name, signature_url)")
          .eq("org_id", org.id)
          .eq("role", "president")
          .eq("is_active", true)
          .order("position_number", { ascending: true })
          .limit(1)
          .maybeSingle();
        const m = (pres as any)?.members;
        if (!cancel && m?.name) setPresidentName(m.name);
        if (!cancel && m?.signature_url) {
          setSigUrl(m.signature_url);
        } else if (!cancel && org?.president_signature_url) {
          setSigUrl(org.president_signature_url);
        }
      } else if (org?.president_signature_url) {
        setSigUrl(org.president_signature_url);
      }

      // Stable public production URL — preview origin is behind Lovable auth bridge
      // and won't open for the general public when they scan the printed ID card.
      const regUrl = memberRegistrationUrl(org?.org_code);
      const memberUrl = `${regUrl}${regUrl.includes("?") ? "&" : "?"}ref=${encodeURIComponent(member.member_code ?? member.id)}`;
      const qrOptions = { margin: 1, width: 240, color: { dark: "#111111", light: "#ffffff" } };
      const qr = await QRCode.toDataURL(memberUrl, qrOptions);
      const appQr = await QRCode.toDataURL(regUrl, qrOptions);
      if (!cancel) {
        setQrDataUrl(qr);
        setAppQrUrl(appQr);
        setMemberQrLink(memberUrl);
        setRegistrationQrLink(regUrl);
      }
    })();
    return () => { cancel = true; };
  }, [member.id, member.member_code, member.photo_url, org?.id, org?.logo_url, org?.president_signature_url, org?.org_code]);

  // Fetch current committee role for this member to drive ID-card designation.
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("role")
        .eq("member_id", member.id)
        .eq("is_active", true)
        .order("position_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancel) return;
      const role = (data as any)?.role as string | undefined;
      const map: Record<string, string> = {
        president: "అధ్యక్షుడు",
        vice_president: "ఉపాధ్యక్షుడు",
        treasurer: "కోశాధికారి",
        advisor: "సలహాదారు",
        executive: "కార్యవర్గ సభ్యుడు",
        worker: "కార్యకర్త",
      };
      setDesignation(role && map[role] ? map[role] : "సభ్యుడు");
    })();
    return () => { cancel = true; };
  }, [member.id]);

  function handlePrint() {
    const f = frontRef.current; const b = backRef.current;
    if (!f || !b) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${member.name}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap">
      <style>
        @page { size: 85.6mm 54mm; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, -apple-system, sans-serif; }
        .pg { page-break-after: always; }
        .pg:last-child { page-break-after: auto; }
      </style></head><body>
      <div class="pg">${f.outerHTML}</div>
      <div class="pg">${b.outerHTML}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 350);
  }

  const joined = member.joined_date
    ? new Date(member.joined_date).toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "en" ? "en-IN" : "te-IN",
        { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  const langs: CardLang[] = ["te", "en", "hi"];
  const langLabel: Record<CardLang, string> = { te: "తెలుగు", en: "English", hi: "हिन्दी" };

  return (
    <div className="space-y-3">
      {org?.id_card_design ? (
        <SavedDesignCard
          design={org.id_card_design}
          org={org}
          member={member}
          photoUrl={photoUrl}
          logoUrl={logoUrl}
          sigUrl={sigUrl}
          qrDataUrl={qrDataUrl}
          appQrUrl={appQrUrl}
          memberQrLink={memberQrLink}
          registrationQrLink={registrationQrLink}
          showBack={showBack}
          setShowBack={setShowBack}
          frontRef={frontRef}
          backRef={backRef}
          onPrint={handlePrint}
          lang={lang}
          designation={designation}
        />
      ) : (
        <LegacyLayout
          langs={langs}
          lang={lang}
          setLang={setLang}
          langLabel={langLabel}
          showBack={showBack}
          setShowBack={setShowBack}
          handlePrint={handlePrint}
          frontRef={frontRef}
          backRef={backRef}
          member={member}
          org={org}
          t={t}
          photoUrl={photoUrl}
          logoUrl={logoUrl}
          sigUrl={sigUrl}
          qrDataUrl={qrDataUrl}
          appQrUrl={appQrUrl}
          memberQrLink={memberQrLink}
          registrationQrLink={registrationQrLink}
          joined={joined}
        />
      )}
    </div>
  );
}

function LegacyLayout(props: any) {
  const { langs, lang, setLang, langLabel, showBack, setShowBack, handlePrint,
          frontRef, backRef, member, org, t, photoUrl, logoUrl, sigUrl, qrDataUrl, appQrUrl, memberQrLink, registrationQrLink, joined } = props;
  return (
    <>

      <div className="flex items-center gap-1 justify-center">
        <Languages className="w-4 h-4 text-muted-foreground" />
        {langs.map((l: CardLang) => (
          <Button
            key={l}
            size="sm"
            variant={lang === l ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => setLang(l)}
          >
            {langLabel[l]}
          </Button>
        ))}
      </div>

      {/* Auto-scale wrapper: card is fixed at 85.6mm × 54mm (~324×204px), scale to fit container width on mobile */}
      <ScaledCard>
        <div className="relative" style={{ perspective: "1200px" }}>
          <div
            style={{
              transition: "transform 0.6s",
              transformStyle: "preserve-3d",
              transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
              width: "85.6mm",
              height: "54mm",
              margin: "0 auto",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
              <CardFront
                fref={frontRef}
                member={member} org={org} t={t} lang={lang}
                photoUrl={photoUrl} logoUrl={logoUrl} sigUrl={sigUrl} qrDataUrl={qrDataUrl} qrLink={memberQrLink}
                joined={joined}
              />
            </div>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <CardBack bref={backRef} t={t} lang={lang} memberName={member.name} appQrUrl={appQrUrl} appQrLink={registrationQrLink} accent={org?.theme_color || "#FF9933"} />
            </div>
          </div>
        </div>
      </ScaledCard>

      <div className="flex justify-between items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => setShowBack((v: boolean) => !v)}
          className="bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-100"
          aria-label="Flip card"
        >
          <RotateCw className="w-4 h-4 mr-1.5" />
          {showBack ? (lang === "en" ? "Front" : lang === "hi" ? "सामने" : "ముందు భాగం")
                    : (lang === "en" ? "Flip / Back" : lang === "hi" ? "पलटें" : "తిప్పు / వెనుక")}
        </Button>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" />
          {lang === "en" ? "Print / PDF" : lang === "hi" ? "प्रिंट / PDF" : "ప్రింట్ / PDF"}
        </Button>
      </div>
    </>
  );
}


function CardFront({
  fref, member, org, photoUrl, logoUrl, sigUrl, qrDataUrl, qrLink, joined, t, lang,
}: {
  fref: React.RefObject<HTMLDivElement | null>;
  member: Member; org: Org | null;
  photoUrl: string | null; logoUrl: string | null; sigUrl: string | null;
  qrDataUrl: string;
  qrLink?: string;
  joined: string;
  t: Record<string, string>;
  lang: CardLang;
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
  const accent = org?.theme_color || "#FF9933";


  return (
    <div
      ref={fref}
      className="relative bg-white text-black overflow-hidden shadow-xl"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: "3mm",
        border: "0.3mm solid #000080",
        fontFamily: TELUGU_FONT,
      }}
    >
      {/* Saffron header — title in dark blue with Telugu font so vattulu render clearly */}
      <div style={{
        background: accent,
        padding: "1.4mm 2.5mm", display: "flex", alignItems: "center",
        gap: "2.2mm", height: "13mm",
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ height: "11mm", width: "11mm", borderRadius: "50%", background: "#fff", objectFit: "cover", border: "0.3mm solid #fff" }} />
        ) : (
          <div style={{ height: "11mm", width: "11mm", borderRadius: "50%", background: "#fff" }} />
        )}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35, textAlign: (org?.theme_settings?.headAlign ?? "left") as any }}>
          <div style={{ fontFamily: org?.theme_settings?.headFont ? `${org.theme_settings.headFont}, ${TELUGU_FONT}` : TELUGU_FONT, fontSize: "3.6mm", fontWeight: 900, color: "#000080", letterSpacing: "0.05mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tr(org?.name ?? "Organization", lang)}
          </div>
          <div style={{ fontFamily: org?.theme_settings?.subFont ? `${org.theme_settings.subFont}, ${TELUGU_FONT}` : TELUGU_FONT, fontSize: "2.1mm", color: org?.theme_settings?.subColor || "#000080", fontWeight: 700, marginTop: "0.3mm", fontStyle: "italic", lineHeight: 1.3 }}>
            {lang === "te" ? SLOGAN : lang === "hi" ? "॥ मानवसेवा ही माधव सेवा ॥" : "॥ Service to Humanity is Service to God ॥"}
          </div>
          {org?.gov_reg_number && (
            <div style={{ fontSize: "1.7mm", color: "#000080", opacity: 0.85, marginTop: "0.1mm" }}>Reg: {org.gov_reg_number}</div>
          )}
        </div>
        <div style={{
          fontSize: "2mm", background: "#000080", color: "#fff",
          padding: "0.4mm 1.2mm", borderRadius: "1mm", fontWeight: 800,
        }}>
          {t.member}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "2.2mm", padding: "1.4mm 2.5mm 1mm", height: "32mm", background: "#fff", position: "relative" }}>
        <div style={{ width: "20mm", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            width: "20mm", height: "24mm",
            border: "0.3mm solid #138808",
            background: "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User style={{ width: "9mm", height: "9mm", color: "#999" }} />
            )}
          </div>
          {/* Active status badge — pushed slightly down with margin */}
          <div style={{
            marginTop: "1.4mm",
            fontFamily: TELUGU_FONT,
            fontSize: "1.7mm", fontWeight: 800,
            color: "#fff",
            background: member.is_active === false ? "#666" : "#138808",
            textAlign: "center", padding: "0.5mm 0.6mm", borderRadius: "0.8mm",
            letterSpacing: "0.1mm", lineHeight: 1.2,
          }}>
            {member.is_active === false ? t.inactive : t.active}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, fontFamily: TELUGU_FONT, fontSize: "2.4mm", lineHeight: 1.35, color: "#111", display: "flex", flexDirection: "column" }}>
          <div style={{
            fontSize: "2.2mm", color: "#fff", background: "#000080", fontWeight: 700,
            letterSpacing: "0.3mm", padding: "0.4mm 1.4mm", borderRadius: "0.8mm",
            display: "inline-block", alignSelf: "flex-start",
          }}>
            {t.id}: {member.member_code ?? "—"}
          </div>
          <div style={{ fontSize: "3.4mm", fontWeight: 800, marginTop: "0.6mm", color: "#000080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.25 }}>
            {tr(member.name, lang)}
          </div>
          {member.father_name && <Row label={t.father} value={tr(member.father_name, lang)} />}
          {village && <Row label={t.village} value={tr(village, lang)} />}
          {mandal && <Row label={t.mandal} value={tr(mandal, lang)} />}
          {member.phone && <Row label={t.phone} value={member.phone} />}
          <div style={{ display: "flex", gap: "1.5mm", marginTop: "0.4mm", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "2.1mm", color: "#222" }}>
              <span style={{ color: "#666" }}>{t.joined}: </span>
              <span style={{ fontWeight: 600 }}>{joined}</span>
            </div>
            {member.blood_group && (
              <div style={{
                fontSize: "2.1mm", background: "#C8102E", color: "#fff",
                padding: "0.2mm 1.4mm", borderRadius: "0.8mm", fontWeight: 800,
              }}>
                🩸 {member.blood_group}
              </div>
            )}
          </div>

          {/* Signature pinned bottom-right */}
          <div style={{ marginTop: "auto", textAlign: "right" }}>
            {sigUrl ? (
              <img src={sigUrl} alt="sig" style={{ height: "4.8mm", maxWidth: "28mm", objectFit: "contain", marginLeft: "auto", display: "block" }} />
            ) : (
              <div
                style={{
                  height: "4.8mm",
                  fontFamily: '"Dancing Script","Brush Script MT","Lucida Handwriting","Segoe Script",cursive',
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "4.2mm",
                  color: "#000080",
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
                {tr(org?.president_name ?? "M. Bhaskar Reddy", lang)}
              </div>
            )}
            <div style={{ borderTop: "0.2mm solid #000080", marginTop: "0.2mm", paddingTop: "0.2mm", fontSize: "1.8mm", color: "#000080", fontWeight: 700, lineHeight: 1.1 }}>
              {tr(org?.president_name ?? "M. Bhaskar Reddy", lang)}
              <div style={{ fontSize: "1.5mm", color: "#666", fontWeight: 500 }}>{t.president}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer (green): QR (left) — society email/phone (center, two lines) — MBR logo on black (right) */}
      <div style={{
        background: "#138808",
        height: "9mm",
        padding: "0.6mm 2mm", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "1.5mm",
      }}>
        {qrDataUrl ? (
          qrLink ? (
            <a href={qrLink} aria-label="Open member QR link" style={{ height: "7.6mm", width: "7.6mm", background: "#fff", padding: "0.3mm", borderRadius: "0.5mm", flexShrink: 0, display: "block" }}>
              <img src={qrDataUrl} alt="Member QR" style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
            </a>
          ) : (
            <img src={qrDataUrl} alt="Member QR" style={{ height: "7.6mm", width: "7.6mm", background: "#fff", padding: "0.3mm", borderRadius: "0.5mm", flexShrink: 0 }} />
          )
        ) : <div style={{ width: "7.6mm" }} />}

        <div style={{
          flex: 1, minWidth: 0, color: "#fff", textAlign: "center",
          fontFamily: TELUGU_FONT, lineHeight: 1.25,
        }}>
          <div style={{ fontSize: "1.9mm", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ✉ {societyEmail}
          </div>
          <div style={{ fontSize: "1.9mm", fontWeight: 700, marginTop: "0.3mm" }}>
            ☎ {societyPhone}
          </div>
        </div>

        <div style={{
          height: "7.6mm", width: "7.6mm",
          background: "#000",
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
  bref, t, memberName, appQrUrl, appQrLink, lang, accent,
}: {
  bref: React.RefObject<HTMLDivElement | null>;
  t: Record<string, string>;
  memberName: string;
  appQrUrl: string;
  appQrLink?: string;
  lang: CardLang;
  accent: string;
}) {
  return (
    <div
      ref={bref}
      className="relative bg-white text-black overflow-hidden shadow-xl"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: "3mm",
        border: "0.3mm solid #000080",
        fontFamily: TELUGU_FONT,
      }}
    >
      {/* tricolor stripe */}
      <div style={{ display: "flex", height: "2mm" }}>
        <div style={{ flex: 1, background: accent }} />
        <div style={{ flex: 1, background: "#fff" }} />
        <div style={{ flex: 1, background: "#138808" }} />
      </div>


      <div style={{ padding: "1.5mm 2.5mm", height: "52mm", display: "flex", flexDirection: "column", gap: "1mm" }}>
        {/* Objectives */}
        <div>
          <div style={{ fontSize: "2.5mm", fontWeight: 800, color: "#000080", borderBottom: `0.2mm solid ${accent}`, paddingBottom: "0.2mm", marginBottom: "0.5mm" }}>
            {t.objectives}
          </div>
          <ol style={{ margin: 0, paddingLeft: "3.5mm", fontSize: "2mm", lineHeight: 1.3, color: "#222" }}>
            <li style={{ marginBottom: "0.4mm" }}>{t.obj1}</li>
            <li style={{ marginBottom: "0.4mm" }}>{t.obj2}</li>
            <li>{t.obj3}</li>
          </ol>
        </div>

        {/* Oath + MBR app QR side-by-side */}
        <div style={{ marginTop: "0.4mm", display: "flex", gap: "2mm", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "2.5mm", fontWeight: 800, color: "#138808", borderBottom: "0.2mm solid #138808", paddingBottom: "0.2mm", marginBottom: "0.4mm" }}>
              {t.oath}
            </div>
            <div style={{ fontSize: "2mm", lineHeight: 1.3, color: "#222", fontStyle: "italic" }}>
              "{t.oathText}" — <span style={{ fontWeight: 700, fontStyle: "normal", color: "#000080" }}>{tr(memberName, lang)}</span>
            </div>
            <div style={{ fontSize: "2.1mm", fontWeight: 800, color: "#C8102E", marginTop: "0.4mm", letterSpacing: "0.2mm" }}>
              {t.jaihind} 🇮🇳
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            {appQrUrl && (
              appQrLink ? (
                <a href={appQrLink} aria-label="Open member registration QR" style={{ height: "11mm", width: "11mm", border: "0.2mm solid #000080", padding: "0.3mm", background: "#fff", display: "block", boxSizing: "border-box" }}>
                  <img src={appQrUrl} alt="MBR APP" style={{ height: "100%", width: "100%", objectFit: "contain", display: "block" }} />
                </a>
              ) : (
                <img src={appQrUrl} alt="MBR APP" style={{ height: "11mm", width: "11mm", border: "0.2mm solid #000080", padding: "0.3mm", background: "#fff" }} />
              )
            )}
            <div style={{ fontSize: "1.5mm", fontWeight: 700, color: "#000080", marginTop: "0.3mm", lineHeight: 1.1, maxWidth: "13mm" }}>
              {t.mbrApp}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "2.2mm", color: "#222", marginTop: "0.3mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ color: "#666" }}>{label}: </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ===================================================================
 * SavedDesignCard — renders member ID using the org-saved design.
 * =================================================================== */
function SavedDesignCard({
  design, org, member, photoUrl, logoUrl, sigUrl, qrDataUrl, appQrUrl,
  memberQrLink, registrationQrLink, showBack, setShowBack, frontRef, backRef, onPrint, lang, designation,
}: {
  design: IdCardDesign;
  org: Org | null;
  member: Member;
  photoUrl: string | null;
  logoUrl: string | null;
  sigUrl: string | null;
  qrDataUrl: string;
  appQrUrl: string;
  memberQrLink: string;
  registrationQrLink: string;
  showBack: boolean;
  setShowBack: (fn: (v: boolean) => boolean) => void;
  frontRef: React.RefObject<HTMLDivElement | null>;
  backRef: React.RefObject<HTMLDivElement | null>;
  onPrint: () => void;
  lang: CardLang;
  designation?: string;
}) {
  const orgCtx: OrgContext = {
    name: org?.name || "",
    slogan: org?.slogan || undefined,
    regNumber: org?.gov_reg_number || undefined,
    logoUrl: logoUrl,
    presidentName: org?.president_name || undefined,
    presidentSignatureUrl: sigUrl,
    mbrQrUrl: appQrUrl || null,
    mbrQrLink: registrationQrLink || null,
    mbrLogoUrl: mbrLogo.url,
    contactPhone: org?.phone || undefined,
    contactEmail: org?.email || undefined,
  };
  const sample: SampleMember = {
    name: member.name,
    fatherName: member.father_name || undefined,
    memberCode: member.member_code || undefined,
    designation: designation || "సభ్యుడు",
    village: member.village || undefined,
    pincode: undefined,
    phone: member.phone || undefined,
    email: member.email || undefined,
    bloodGroup: member.blood_group || undefined,
    address: member.address || undefined,
    photoUrl: photoUrl,
    qrUrl: qrDataUrl || null,
    qrLink: memberQrLink || null,
    status: (member as any)?.status === "approved" || (member as any)?.status === "active" ? "active" : "inactive",
  };
  const side = showBack ? "back" : "front";
  return (
    <>
      <div className="flex justify-center">
        <div ref={side === "front" ? frontRef : backRef}>
          <IdCardRenderer design={design} org={orgCtx} member={sample} side={side} scale={1} />
        </div>
      </div>
      <div className="flex justify-between items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => setShowBack((v: boolean) => !v)}
          className="bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-100"
          aria-label="Flip card"
        >
          <RotateCw className="w-4 h-4 mr-1.5" />
          {showBack
            ? (lang === "en" ? "Front" : lang === "hi" ? "सामने" : "ముందు భాగం")
            : (lang === "en" ? "Flip / Back" : lang === "hi" ? "पलटें" : "తిప్పు / వెనుక")}
        </Button>
        <Button size="sm" onClick={onPrint}>
          <Printer className="w-4 h-4 mr-1" />
          {lang === "en" ? "Print / PDF" : lang === "hi" ? "प्रिंट / PDF" : "ప్రింట్ / PDF"}
        </Button>
      </div>
    </>
  );
}
