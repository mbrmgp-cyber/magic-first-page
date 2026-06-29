import type { IdCardDesign, ElementStyle } from "@/lib/idCardTemplates";
import mbrLogoAsset from "@/assets/mbr-logo.png.asset.json";

export type SampleMember = {
  name: string;
  fatherName?: string;
  memberCode?: string;
  designation?: string;
  village?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  photoUrl?: string | null;
  qrUrl?: string | null;
  qrLink?: string | null;
  status?: "active" | "inactive";
};

function StatusBadge({ status, bg, fg }: { status?: "active" | "inactive"; bg: string; fg?: string }) {
  const inactive = status === "inactive";
  const badgeBg = inactive ? bg : bg;
  return (
    <div style={{ display: "inline-flex", alignSelf: "center", background: badgeBg, color: fg || "#fff", fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 999, lineHeight: 1.1, marginTop: 4, whiteSpace: "nowrap", letterSpacing: 0.3 }}>
      {inactive ? "Inactive" : "Active"}
    </div>
  );
}

// Auto-shrink font size based on text length so back matter fits the box
function autoFitSize(text: string, base = 11, min = 7): number {
  const len = (text || "").length;
  if (len < 120) return base;
  if (len < 220) return base - 1;
  if (len < 340) return base - 2;
  if (len < 480) return base - 3;
  return min;
}

export type OrgContext = {
  name: string;
  slogan?: string;
  regNumber?: string;
  logoUrl?: string | null;
  presidentName?: string;
  presidentSignatureUrl?: string | null;
  mbrQrUrl?: string | null;     // MBR app society-registration QR
  mbrQrLink?: string | null;    // Link opened when the QR is tapped
  mbrLogoUrl?: string | null;   // MBR small corner logo
  contactPhone?: string;        // shown in fixed bottom-center footer of card front
  contactEmail?: string;        // shown in fixed bottom-center footer of card front
};

type Side = "front" | "back";

type Props = {
  design: IdCardDesign;
  org: OrgContext;
  member: SampleMember;
  side: Side;
  scale?: number;
};

const NORMAL_W = 340;
const NORMAL_H = 215;
const KEYCHAIN_W = 220;
const KEYCHAIN_H = 320;

function txt(style: ElementStyle | undefined, fallback = ""): React.CSSProperties {
  return {
    fontFamily: `${style?.font || "Inter"}, "Noto Sans Telugu", system-ui, sans-serif`,
    fontSize: (style?.size ?? 12) + "px",
    fontWeight: style?.weight ?? 500,
    color: style?.color || fallback || "#111",
    lineHeight: style?.lineHeight ?? 1.25,
  };
}
const show = (s: ElementStyle | undefined) => s?.visible !== false;

function cornerStyle(corner: string | undefined, offset = 6): React.CSSProperties {
  const c = corner || "br";
  return {
    position: "absolute",
    top: c.startsWith("t") ? offset : undefined,
    bottom: c.startsWith("b") ? offset : undefined,
    left: c.endsWith("l") ? offset : undefined,
    right: c.endsWith("r") ? offset : undefined,
  };
}


export function IdCardRenderer({ design, org, member, side, scale = 1 }: Props) {
  const isVertical = design.templateId === "vertical" || design.cardType === "keychain";
  const baseW = design.cardType === "keychain" ? KEYCHAIN_W : isVertical ? NORMAL_H : NORMAL_W;
  const baseH = design.cardType === "keychain" ? KEYCHAIN_H : isVertical ? NORMAL_W : NORMAL_H;

  const g = design.global;
  const bgImg = side === "front" ? g.frontBgImage : g.backBgImage;
  const containerStyle: React.CSSProperties = {
    width: baseW * scale,
    height: baseH * scale,
    background: g.backgroundColor,
    backgroundImage: bgImg ? `url(${bgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: g.borderStyle === "none" ? "none" : `${g.borderWidth}px ${g.borderStyle} ${g.borderColor}`,
    borderRadius: g.cornerRadius,
    overflow: "hidden",
    position: "relative",
    boxSizing: "border-box",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  };
  const inner: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: baseW,
    height: baseH,
    position: "absolute",
    top: 0,
    left: 0,
  };

  return (
    <div className="mbr-preserve-design" data-theme-preserve="card" style={containerStyle}>
      <div style={inner}>
        {side === "front" ? renderFront(design, org, member) : renderBack(design, org, member)}
      </div>
    </div>
  );
}

function Header({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  const g = design.global;
  const align = g.headerAlign || "left";
  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  const logoDx = g.headerLogoOffsetX ?? 0;
  const badgeDx = g.headerBadgeOffsetX ?? 0;
  return (
    <div style={{ background: g.accentColor, padding: "8px 10px 6px", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
      {show(e.logo) && (
        org.logoUrl ? (
          <img src={org.logoUrl} alt="" style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", objectFit: "cover", flexShrink: 0, transform: `translateX(${logoDx}px)` }} />
        ) : (
          <div style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: g.accentColor, fontWeight: 900, flexShrink: 0, transform: `translateX(${logoDx}px)` }}>★</div>
        )
      )}
      <div style={{ flex: 1, minWidth: 0, textAlign: align, display: "flex", flexDirection: "column", alignItems: justify, lineHeight: 1.35 }}>
        {show(e.orgName) && <div style={{ ...txt(e.orgName, "#fff"), lineHeight: 1.35, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: 2 }}>{org.name}</div>}
        {show(e.slogan) && org.slogan && <div style={{ ...txt(e.slogan, "#fff"), opacity: 0.95, fontStyle: "italic" }}>{org.slogan}</div>}
        {show(e.regNumber) && org.regNumber && <div style={txt(e.regNumber, "#fff")}>Reg: {org.regNumber}</div>}
      </div>
      <div style={{ flexShrink: 0, transform: `translateX(${badgeDx}px)` }}>
        <StatusBadge status={member.status} bg={g.memberCodeBadgeBg || g.accentColor} fg={e.memberCode?.color || "#fff"} />
      </div>
    </div>
  );
}

function ContactFooter({ org, accent, bg, size }: { org: OrgContext; accent: string; bg?: string; size?: number }) {
  const parts = [org.contactPhone, org.contactEmail].filter(Boolean);
  if (parts.length === 0) return null;
  const fs = size ?? 8;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "2px 8px", textAlign: "center", fontSize: fs, color: "#fff", background: bg || accent, opacity: 0.92, letterSpacing: 0.2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: 1 }}>
      {org.contactPhone && <span>📞 {org.contactPhone}</span>}
      {org.contactPhone && org.contactEmail && <span style={{ margin: "0 6px", opacity: 0.6 }}>•</span>}
      {org.contactEmail && <span>✉ {org.contactEmail}</span>}
    </div>
  );
}

function DetailLine({ icon, value, style }: { icon: string; value: string; style: React.CSSProperties }) {
  return (
    <div style={{ ...style, display: "flex", gap: 4, alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ opacity: 0.7 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

function MemberQr({ design, member, offset }: { design: IdCardDesign; member: SampleMember; offset: number }) {
  const e = design.elements.qrCode;
  if (!show(e) || !member.qrUrl) return null;
  const size = e.imgSize ?? 48;
  const boxStyle: React.CSSProperties = {
    ...cornerStyle(e.corner, offset),
    width: size,
    height: size,
    background: "#fff",
    padding: 2,
    borderRadius: 3,
    border: `1px solid ${design.global.accentColor}`,
    zIndex: 10,
    boxSizing: "border-box",
    display: "block",
  };
  const img = <img src={member.qrUrl} alt="Member QR" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />;
  return member.qrLink ? <a href={member.qrLink} style={boxStyle} aria-label="Open member QR link">{img}</a> : <div style={boxStyle}>{img}</div>;
}

function FrontHorizontal({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Header design={design} org={org} member={member} />
      <div style={{ flex: 1, display: "flex", padding: "10px 10px 16px", gap: 10, minHeight: 0 }}>
        {show(e.photo) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 4 }}>
            <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: 6, background: "#e5e7eb", overflow: "hidden", border: `2px solid ${design.global.accentColor}` }}>
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 28 }}>👤</div>
              )}
            </div>
            {show(e.designation) && member.designation && (
              <div style={{ ...txt(e.designation), textAlign: "center", maxWidth: (e.photo.imgSize ?? 84) + 24, lineHeight: 1.15, wordBreak: "break-word" }}>
                {member.designation}
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {show(e.memberCode) && member.memberCode && (
            <div style={{ display: "inline-block", alignSelf: "flex-start", background: design.global.memberCodeBadgeBg || design.global.accentColor, padding: "1px 6px", borderRadius: 4, ...txt(e.memberCode, "#fff") }}>
              {member.memberCode}
            </div>
          )}
          {show(e.memberName) && <div style={txt(e.memberName)}>{member.name}</div>}
          {show(e.fatherName) && member.fatherName && <div style={txt(e.fatherName)}>S/o {member.fatherName}</div>}
          {show(e.village)    && member.village    && <DetailLine icon="📍" value={member.village + (member.pincode && show(e.pincode) ? ` - ${member.pincode}` : "")} style={txt(e.village)} />}
          {!show(e.village)   && show(e.pincode) && member.pincode && <DetailLine icon="📍" value={member.pincode} style={txt(e.pincode)} />}
          {show(e.phone)      && member.phone      && <DetailLine icon="📞" value={member.phone} style={txt(e.phone)} />}
          {show(e.bloodGroup) && member.bloodGroup && (
            <div style={{ display: "inline-flex", alignSelf: "flex-start", gap: 4, alignItems: "center", padding: "1px 6px", borderRadius: 4, background: `${design.global.accentColor}22`, ...txt(e.bloodGroup) }}>
              🩸 {member.bloodGroup}
            </div>
          )}
        </div>
      </div>
      {/* Front corner QR (member URL) — kept clean, no logo overlap */}
      <MemberQr design={design} member={member} offset={(e.qrCode.corner || "br").startsWith("b") ? 24 : 14} />
      {/* Legacy footer band */}
      {design.templateId === "legacy" && design.global.footerColor && (
        <div style={{ height: 4, background: design.global.footerColor }} />
      )}
      <ContactFooter org={org} accent={design.global.accentColor} bg={design.global.contactFooterBg} size={design.global.contactFooterTextSize} />
    </div>
  );
}

function FrontVertical({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  const accent = design.global.accentColor;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Header design={design} org={org} member={member} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 10px 18px", gap: 6, overflow: "hidden" }}>

        {show(e.photo) && (
          <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: "50%", background: "#e5e7eb", overflow: "hidden", border: `2px solid ${accent}`, marginBottom: 2 }}>
            {member.photoUrl ? <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 28 }}>👤</div>}
          </div>
        )}
        {show(e.designation) && member.designation && (
          <div style={{ ...txt(e.designation), textAlign: "center", lineHeight: 1.15 }}>{member.designation}</div>
        )}
        {show(e.memberCode) && member.memberCode && (
          <div style={{ background: design.global.memberCodeBadgeBg || accent, color: "#fff", padding: "2px 10px", borderRadius: 4, ...txt(e.memberCode, "#fff"), textAlign: "center", marginTop: 2 }}>
            {member.memberCode}
          </div>
        )}
        {show(e.memberName) && <div style={{ ...txt(e.memberName), textAlign: "center", marginTop: 4, lineHeight: 1.2 }}>{member.name}</div>}
        {show(e.fatherName) && member.fatherName && <div style={{ ...txt(e.fatherName), textAlign: "center" }}>S/o {member.fatherName}</div>}
        <div style={{ height: 1, width: "70%", background: accent, opacity: 0.25, margin: "4px 0" }} />
        {show(e.village)    && member.village    && <div style={{ ...txt(e.village), textAlign: "center" }}>📍 {member.village}{show(e.pincode) && member.pincode ? ` - ${member.pincode}` : ""}</div>}
        {show(e.phone)      && member.phone      && <div style={{ ...txt(e.phone), textAlign: "center" }}>📞 {member.phone}</div>}
        {show(e.bloodGroup) && member.bloodGroup && (
          <div style={{ display: "inline-flex", alignSelf: "center", gap: 4, alignItems: "center", padding: "1px 8px", borderRadius: 4, background: `${accent}22`, ...txt(e.bloodGroup), marginTop: 2 }}>
            🩸 {member.bloodGroup}
          </div>
        )}
      </div>
      <MemberQr design={design} member={member} offset={(e.qrCode.corner || "br").startsWith("b") ? 24 : 14} />
      <ContactFooter org={org} accent={accent} bg={design.global.contactFooterBg} size={design.global.contactFooterTextSize} />
    </div>
  );
}



function renderFront(design: IdCardDesign, org: OrgContext, member: SampleMember) {
  const vertical = design.templateId === "vertical" || design.cardType === "keychain";
  return vertical ? <FrontVertical design={design} org={org} member={member} /> : <FrontHorizontal design={design} org={org} member={member} />;
}

function renderBack(design: IdCardDesign, org: OrgContext, member: SampleMember) {
  const e = design.elements;
  const g = design.global;
  const mbrLogoUrl = org.mbrLogoUrl || mbrLogoAsset.url;
  const presName = (org.presidentName || "").trim();
  const showPresName = show(e.presidentName);
  const qrSize = Math.min(e.mbrQrCode?.imgSize ?? 56, 70);
  const mbrLogoSize = e.mbrLogo?.imgSize ?? 24;
  const backText = design.backMatter || "";
  const userSize = e.backMatter?.size;
  const fitSize = userSize && userSize > 0 ? Math.min(userSize, autoFitSize(backText, userSize)) : autoFitSize(backText);
  const backTextStyle = { ...txt(e.backMatter), fontSize: fitSize + "px" };

  // Pick president label per active language (te = Telugu only, else English)
  const lang = (typeof window !== "undefined" && window.localStorage?.getItem("mbr_lang")) || "te";
  const presLabel = lang === "te" ? "అధ్యక్షుడు" : "President";

  // Oath text — replace {name} / (సభ్యుడి పేరు) placeholder with member name
  const oathRaw = design.oathText || "";
  const oathText = oathRaw
    .replace(/\{name\}/gi, member.name || "")
    .replace(/\(\s*సభ్యుడి పేరు\s*\)/g, member.name || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 10, gap: 6, position: "relative" }}>
      <div style={{ borderBottom: `2px solid ${g.accentColor}`, paddingBottom: 4, paddingRight: mbrLogoSize + 8 }}>
        <div style={{ ...txt(e.orgName, g.accentColor), color: g.accentColor }}>{org.name}</div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {show(e.backMatter) && (
            <div style={{ ...backTextStyle, whiteSpace: "pre-wrap", overflow: "hidden", wordBreak: "break-word" }}>
              {backText}
            </div>
          )}
          {show(e.oath) && oathText && (
            <div style={{ ...txt(e.oath), whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 6px", border: `1px dashed ${g.accentColor}`, borderRadius: 4, background: "rgba(0,0,0,0.02)" }}>
              {oathText}
            </div>
          )}
        </div>
        {show(e.mbrQrCode) && (
          <div style={{ flexShrink: 0, width: qrSize + 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {org.mbrQrUrl ? (
              org.mbrQrLink ? (
                <a href={org.mbrQrLink} aria-label="Open MBR registration QR" style={{ width: qrSize, height: qrSize, border: `1px solid ${g.accentColor}`, padding: 2, background: "#fff", display: "block", boxSizing: "border-box" }}>
                  <img src={org.mbrQrUrl} alt="MBR App" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </a>
              ) : (
                <img src={org.mbrQrUrl} alt="MBR App" style={{ width: qrSize, height: qrSize, border: `1px solid ${g.accentColor}`, padding: 2, background: "#fff", display: "block" }} />
              )
            ) : (
              <div style={{ width: qrSize, height: qrSize, border: `1px dashed ${g.accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: g.accentColor, fontSize: 9, textAlign: "center", background: "#fff" }}>MBR<br/>QR</div>
            )}
            <div style={{ fontSize: 7, color: g.accentColor, fontWeight: 700, textAlign: "center", lineHeight: 1.1, whiteSpace: "normal" }}>కొత్త సభ్యుల నమోదు</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingRight: mbrLogoSize + 8 }}>
        <div style={{ ...txt(e.presidentName), fontSize: 9, opacity: 0.9 }}>
          <div style={{ fontSize: 8, opacity: 0.7, letterSpacing: 0.4, textTransform: "uppercase" }}>
            {lang === "te" ? "జారీ చేసినవారు" : "Issued by"}
          </div>
          {show(e.presidentSignature) && org.presidentSignatureUrl && (
            <img
              src={org.presidentSignatureUrl}
              alt="signature"
              style={{ height: 22, maxWidth: 110, objectFit: "contain", display: "block", marginTop: 2, marginBottom: 1 }}
            />
          )}
          {showPresName && presName && <div style={{ fontWeight: 700 }}>{presName}</div>}
          <div style={{ opacity: 0.75 }}>{presLabel}</div>
        </div>
      </div>
      {/* MBR logo — permanent branding, nudged inward to clear border */}
      <img src={mbrLogoUrl} alt="MBR" style={{ ...cornerStyle(e.mbrLogo?.corner, 10), width: mbrLogoSize, height: mbrLogoSize, objectFit: "contain", borderRadius: "50%", background: "#000", padding: 1 }} />
    </div>
  );
}


