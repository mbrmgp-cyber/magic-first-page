import type { IdCardDesign, ElementKey, ElementStyle } from "@/lib/idCardTemplates";

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
};

export type OrgContext = {
  name: string;
  slogan?: string;
  regNumber?: string;
  logoUrl?: string | null;
  presidentName?: string;
  presidentSignatureUrl?: string | null;
};

type Side = "front" | "back";

type Props = {
  design: IdCardDesign;
  org: OrgContext;
  member: SampleMember;
  side: Side;
  scale?: number; // 1 = full ~340x215; smaller = thumbnail
};

const NORMAL_W = 340;
const NORMAL_H = 215;
const KEYCHAIN_W = 220;
const KEYCHAIN_H = 320;

function txt(style: ElementStyle | undefined, fallback = "") {
  return {
    fontFamily: `${style?.font || "Inter"}, "Noto Sans Telugu", system-ui, sans-serif`,
    fontSize: (style?.size ?? 12) + "px",
    fontWeight: style?.weight ?? 500,
    color: style?.color || fallback || "#111",
    lineHeight: 1.25,
  } as React.CSSProperties;
}

function show(style: ElementStyle | undefined) {
  return style?.visible !== false;
}

export function IdCardRenderer({ design, org, member, side, scale = 1 }: Props) {
  const isVertical = design.templateId === "vertical" || design.cardType === "keychain";
  const baseW = design.cardType === "keychain" ? KEYCHAIN_W : isVertical ? NORMAL_H : NORMAL_W;
  const baseH = design.cardType === "keychain" ? KEYCHAIN_H : isVertical ? NORMAL_W : NORMAL_H;

  const g = design.global;
  const e = design.elements;

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

  // Scale inner content via transform so designers always read px sizes 1:1
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
    <div style={{ background: g.accentColor, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
      {show(e.logo) && org.logoUrl ? (
        <img src={org.logoUrl} alt="" style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", objectFit: "cover", flexShrink: 0 }} />
      ) : show(e.logo) ? (
        <div style={{ width: e.logo.imgSize, height: e.logo.imgSize, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: g.accentColor, fontWeight: 900, flexShrink: 0 }}>★</div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {show(e.orgName) && <div style={{ ...txt(e.orgName, "#fff"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{org.name}</div>}
        {show(e.slogan) && org.slogan && <div style={{ ...txt(e.slogan, "#fff"), opacity: 0.9, fontStyle: "italic" }}>{org.slogan}</div>}
        {show(e.regNumber) && org.regNumber && <div style={txt(e.regNumber, "#fff")}>Reg: {org.regNumber}</div>}
      </div>
    </div>
  );
}

function FrontHorizontal({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Header design={design} org={org} />
      <div style={{ flex: 1, display: "flex", padding: 10, gap: 10 }}>
        {show(e.photo) && (
          <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: 8, background: "#e5e7eb", overflow: "hidden", flexShrink: 0 }}>
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 24 }}>👤</div>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {show(e.memberName) && <div style={txt(e.memberName)}>{member.name}</div>}
          {show(e.fatherName) && member.fatherName && <div style={txt(e.fatherName)}>S/o {member.fatherName}</div>}
          {show(e.memberCode) && member.memberCode && <div style={txt(e.memberCode)}>{member.memberCode}</div>}
          {show(e.designation) && member.designation && <div style={txt(e.designation)}>{member.designation}</div>}
        </div>
        {show(e.qrCode) && member.qrUrl && (
          <img src={member.qrUrl} alt="" style={{ width: e.qrCode.imgSize, height: e.qrCode.imgSize, flexShrink: 0, alignSelf: "flex-end" }} />
        )}
      </div>
    </div>
  );
}

function FrontVertical({ design, org, member }: { design: IdCardDesign; org: OrgContext; member: SampleMember }) {
  const e = design.elements;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Header design={design} org={org} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 10, gap: 6 }}>
        {show(e.photo) && (
          <div style={{ width: e.photo.imgSize, height: e.photo.imgSize, borderRadius: "50%", background: "#e5e7eb", overflow: "hidden", border: `2px solid ${design.global.accentColor}` }}>
            {member.photoUrl ? <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 28 }}>👤</div>}
          </div>
        )}
        {show(e.memberName) && <div style={{ ...txt(e.memberName), textAlign: "center" }}>{member.name}</div>}
        {show(e.fatherName) && member.fatherName && <div style={{ ...txt(e.fatherName), textAlign: "center" }}>S/o {member.fatherName}</div>}
        {show(e.memberCode) && member.memberCode && <div style={{ ...txt(e.memberCode), textAlign: "center" }}>{member.memberCode}</div>}
        {show(e.designation) && member.designation && <div style={{ ...txt(e.designation), textAlign: "center" }}>{member.designation}</div>}
        {show(e.qrCode) && member.qrUrl && (
          <img src={member.qrUrl} alt="" style={{ width: e.qrCode.imgSize, height: e.qrCode.imgSize, marginTop: "auto" }} />
        )}
      </div>
    </div>
  );
}

function renderFront(design: IdCardDesign, org: OrgContext, member: SampleMember) {
  const vertical = design.templateId === "vertical" || design.cardType === "keychain";
  return vertical ? <FrontVertical design={design} org={org} member={member} /> : <FrontHorizontal design={design} org={org} member={member} />;
}

function Row({ label, value, style }: { label: string; value: string; style: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: 6, ...style }}>
      <span style={{ minWidth: 70, opacity: 0.65, fontWeight: 500 }}>{label}:</span>
      <span style={{ flex: 1, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function renderBack(design: IdCardDesign, org: OrgContext, member: SampleMember) {
  const e = design.elements;
  const g = design.global;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 10, gap: 4 }}>
      <div style={{ borderBottom: `2px solid ${g.accentColor}`, paddingBottom: 4, marginBottom: 4 }}>
        <div style={{ ...txt(e.orgName, g.accentColor), color: g.accentColor }}>{org.name}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        {show(e.village)    && member.village    && <Row label="Village"   value={member.village}    style={txt(e.village)} />}
        {show(e.pincode)    && member.pincode    && <Row label="Pincode"   value={member.pincode}    style={txt(e.pincode)} />}
        {show(e.phone)      && member.phone      && <Row label="Phone"     value={member.phone}      style={txt(e.phone)} />}
        {show(e.email)      && member.email      && <Row label="Email"     value={member.email}      style={txt(e.email)} />}
        {show(e.bloodGroup) && member.bloodGroup && <Row label="Blood"     value={member.bloodGroup} style={txt(e.bloodGroup)} />}
        {show(e.address)    && member.address    && <Row label="Address"   value={member.address}    style={txt(e.address)} />}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div style={{ ...txt(e.presidentName), fontSize: 9, opacity: 0.7 }}>
          Authorized by
          {show(e.presidentName) && org.presidentName && <div style={{ fontWeight: 700, opacity: 1 }}>{org.presidentName}</div>}
          <div style={{ opacity: 0.7 }}>President</div>
        </div>
        {show(e.presidentSignature) && org.presidentSignatureUrl && (
          <img src={org.presidentSignatureUrl} alt="" style={{ width: e.presidentSignature.imgSize, height: 40, objectFit: "contain" }} />
        )}
      </div>
    </div>
  );
}
