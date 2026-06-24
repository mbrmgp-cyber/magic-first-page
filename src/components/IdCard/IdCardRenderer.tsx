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
  status?: "active" | "inactive";
};

function StatusBadge({ status }: { status?: "active" | "inactive" }) {
  const inactive = status === "inactive";
  const bg = inactive ? "#dc2626" : "#16a34a";
  return (
    <div style={{ display: "inline-flex", alignSelf: "center", background: bg, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 999, lineHeight: 1.1, marginTop: 4, whiteSpace: "nowrap", letterSpacing: 0.3 }}>
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
  mbrLogoUrl?: string | null;   // MBR small corner logo
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
  const containerStyle: React.CSSProperties = {
    width: baseW * scale,
    height: baseH * scale,
    background: g.backgroundColor,
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
    <div style={containerStyle}>
      <div style={inner}>
        {side === "front" ? renderFront(design, org, member) : renderBack(design, org, member)}
      </div>
    </div>
  );
}

function Header({ design, org }: { design: IdCardDesign; org: OrgContext }) {
  const e = design.elements;
  const g = design.global;
  return (
    <div style={{ background: g.accentColor, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
      {show(e.logo) && (
        org.logoUrl ? (
          <img src={org.logoUrl} alt="" style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: g.accentColor, fontWeight: 900, flexShrink: 0 }}>★</div>
        )
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {show(e.orgName) && <div style={{ ...txt(e.orgName, "#fff"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{org.name}</div>}
        {show(e.slogan) && org.slogan && <div style={{ ...txt(e.slogan, "#fff"), opacity: 0.95, fontStyle: "italic" }}>{org.slogan}</div>}
        {show(e.regNumber) && org.regNumber && <div style={txt(e.regNumber, "#fff")}>Reg: {org.regNumber}</div>}
      </div>
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

function FrontHorizontal({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Header design={design} org={org} />
      <div style={{ flex: 1, display: "flex", padding: 10, gap: 10, minHeight: 0 }}>
        {show(e.photo) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: 6, background: "#e5e7eb", overflow: "hidden", border: `2px solid ${design.global.accentColor}` }}>
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 28 }}>👤</div>
              )}
            </div>
            <StatusBadge status={member.status} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {show(e.memberCode) && member.memberCode && (
            <div style={{ display: "inline-block", alignSelf: "flex-start", background: design.global.accentColor, padding: "1px 6px", borderRadius: 4, ...txt(e.memberCode, "#fff") }}>
              {member.memberCode}
            </div>
          )}
          {show(e.memberName) && <div style={txt(e.memberName)}>{member.name}</div>}
          {show(e.fatherName) && member.fatherName && <div style={txt(e.fatherName)}>S/o {member.fatherName}</div>}
          {show(e.village)    && member.village    && <DetailLine icon="📍" value={member.village + (member.pincode && show(e.pincode) ? ` - ${member.pincode}` : "")} style={txt(e.village)} />}
          {!show(e.village)   && show(e.pincode) && member.pincode && <DetailLine icon="📍" value={member.pincode} style={txt(e.pincode)} />}
          {show(e.phone)      && member.phone      && <DetailLine icon="📞" value={member.phone} style={txt(e.phone)} />}
          {show(e.bloodGroup) && member.bloodGroup && (
            <div style={{ display: "inline-flex", alignSelf: "flex-start", gap: 4, alignItems: "center", padding: "1px 6px", borderRadius: 4, background: "#fee2e2", ...txt(e.bloodGroup) }}>
              🩸 {member.bloodGroup}
            </div>
          )}
          {show(e.designation) && member.designation && <div style={txt(e.designation)}>{member.designation}</div>}
        </div>
      </div>
      {/* Front corner QR (member URL) — kept clean, no logo overlap */}
      {show(e.qrCode) && member.qrUrl && (
        <img src={member.qrUrl} alt="" style={{ ...cornerStyle(e.qrCode.corner, 12), width: e.qrCode.imgSize, height: e.qrCode.imgSize, background: "#fff", padding: 2, borderRadius: 3, border: `1px solid ${design.global.accentColor}` }} />
      )}
      {/* Legacy footer band */}
      {design.templateId === "legacy" && design.global.footerColor && (
        <div style={{ height: 4, background: design.global.footerColor }} />
      )}
    </div>
  );
}

function FrontVertical({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  const accent = design.global.accentColor;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Header design={design} org={org} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 10px", gap: 6, overflow: "hidden" }}>

        {show(e.photo) && (
          <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: "50%", background: "#e5e7eb", overflow: "hidden", border: `2px solid ${accent}`, marginBottom: 2 }}>
            {member.photoUrl ? <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 28 }}>👤</div>}
          </div>
        )}
        <StatusBadge status={member.status} />
        {show(e.memberCode) && member.memberCode && (
          <div style={{ background: accent, color: "#fff", padding: "2px 10px", borderRadius: 4, ...txt(e.memberCode, "#fff"), textAlign: "center", marginTop: 2 }}>
            {member.memberCode}
          </div>
        )}
        {show(e.memberName) && <div style={{ ...txt(e.memberName), textAlign: "center", marginTop: 4, lineHeight: 1.2 }}>{member.name}</div>}
        {show(e.fatherName) && member.fatherName && <div style={{ ...txt(e.fatherName), textAlign: "center" }}>S/o {member.fatherName}</div>}
        <div style={{ height: 1, width: "70%", background: accent, opacity: 0.25, margin: "4px 0" }} />
        {show(e.village)    && member.village    && <div style={{ ...txt(e.village), textAlign: "center" }}>📍 {member.village}{show(e.pincode) && member.pincode ? ` - ${member.pincode}` : ""}</div>}
        {show(e.phone)      && member.phone      && <div style={{ ...txt(e.phone), textAlign: "center" }}>📞 {member.phone}</div>}
        {show(e.bloodGroup) && member.bloodGroup && (
          <div style={{ display: "inline-flex", alignSelf: "center", gap: 4, alignItems: "center", padding: "1px 8px", borderRadius: 4, background: "#fee2e2", ...txt(e.bloodGroup), marginTop: 2 }}>
            🩸 {member.bloodGroup}
          </div>
        )}
      </div>
      {show(e.qrCode) && member.qrUrl && (
        <img src={member.qrUrl} alt="" style={{ ...cornerStyle(e.qrCode.corner, 12), width: e.qrCode.imgSize, height: e.qrCode.imgSize, background: "#fff", padding: 2, borderRadius: 3, border: `1px solid ${accent}` }} />
      )}
    </div>
  );
}



function renderFront(design: IdCardDesign, org: OrgContext, member: SampleMember) {
  const vertical = design.templateId === "vertical" || design.cardType === "keychain";
  return vertical ? <FrontVertical design={design} org={org} member={member} /> : <FrontHorizontal design={design} org={org} member={member} />;
}

function renderBack(design: IdCardDesign, org: OrgContext, _member: SampleMember) {
  const e = design.elements;
  const g = design.global;
  const mbrLogoUrl = org.mbrLogoUrl || mbrLogoAsset.url;
  const presName = (org.presidentName || "").trim();
  const showPresName = show(e.presidentName) && presName && presName.toLowerCase() !== "president";
  const qrSize = Math.min(e.mbrQrCode?.imgSize ?? 56, 70);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 10, gap: 6, position: "relative" }}>
      <div style={{ borderBottom: `2px solid ${g.accentColor}`, paddingBottom: 4, paddingRight: show(e.mbrLogo) ? ((e.mbrLogo.imgSize ?? 24) + 8) : 0 }}>
        <div style={{ ...txt(e.orgName, g.accentColor), color: g.accentColor }}>{org.name}</div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 0 }}>
        {show(e.backMatter) && (
          <div style={{ flex: 1, minWidth: 0, ...txt(e.backMatter), whiteSpace: "pre-wrap", overflow: "hidden", wordBreak: "break-word" }}>
            {design.backMatter || ""}
          </div>
        )}
        {show(e.mbrQrCode) && (
          <div style={{ flexShrink: 0, width: qrSize + 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {org.mbrQrUrl ? (
              <img src={org.mbrQrUrl} alt="MBR App" style={{ width: qrSize, height: qrSize, border: `1px solid ${g.accentColor}`, padding: 2, background: "#fff", display: "block" }} />
            ) : (
              <div style={{ width: qrSize, height: qrSize, border: `1px dashed ${g.accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: g.accentColor, fontSize: 9, textAlign: "center", background: "#fff" }}>MBR<br/>QR</div>
            )}
            <div style={{ fontSize: 7, color: g.accentColor, fontWeight: 700, textAlign: "center", lineHeight: 1.1, whiteSpace: "normal" }}>కొత్త సభ్యుల నమోదు</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingRight: show(e.mbrLogo) ? ((e.mbrLogo.imgSize ?? 24) + 8) : 0 }}>
        <div style={{ ...txt(e.presidentName), fontSize: 9, opacity: 0.9 }}>
          {show(e.presidentSignature) && org.presidentSignatureUrl && (
            <img src={org.presidentSignatureUrl} alt="" style={{ width: e.presidentSignature.imgSize, height: 32, objectFit: "contain", display: "block" }} />
          )}
          {showPresName && <div style={{ fontWeight: 700 }}>{presName}</div>}
          <div style={{ opacity: 0.75 }}>President / అధ్యక్షుడు</div>
        </div>
      </div>
      {show(e.mbrLogo) && (
        <img src={mbrLogoUrl} alt="MBR" style={{ ...cornerStyle(e.mbrLogo.corner, 4), width: e.mbrLogo.imgSize, height: e.mbrLogo.imgSize, objectFit: "contain", borderRadius: "50%", background: "#000", padding: 1 }} />
      )}
    </div>
  );
}

