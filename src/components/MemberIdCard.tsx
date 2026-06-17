import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, IdCard, User, RotateCw } from "lucide-react";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";

type Org = {
  name: string;
  logo_url?: string | null;
  letter_code?: string | null;
  gov_reg_number?: string | null;
  slogan?: string | null;
  phone?: string | null;
  email?: string | null;
  president_name?: string | null;
  president_signature_url?: string | null;
};
type Member = {
  id: string;
  name: string;
  member_code?: string | null;
  father_name?: string | null;
  phone?: string | null;
  email?: string;
  address?: string | null;
  joined_date?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
  blood_group?: string | null;
};

export function MemberIdCardButton({ member, org }: { member: Member; org: Org | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IdCard className="w-4 h-4 mr-1" /> ID కార్డ్
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[460px] p-4">
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
  const [showBack, setShowBack] = useState(false);
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
      if (org?.president_signature_url) setSigUrl(org.president_signature_url);
      const payload = JSON.stringify({
        id: member.member_code ?? member.id,
        name: member.name,
        org: org?.name,
        phone: member.phone,
      });
      const qr = await QRCode.toDataURL(payload, { margin: 0, width: 320 });
      if (!cancel) setQrDataUrl(qr);
    })();
    return () => { cancel = true; };
  }, [member.id, member.photo_url, org?.logo_url, org?.president_signature_url]);

  function handlePrint() {
    const f = frontRef.current; const b = backRef.current;
    if (!f || !b) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${member.name}</title>
      <style>
        @page { size: 85.6mm 54mm; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
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
    ? new Date(member.joined_date).toLocaleDateString("te-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div className="space-y-3">
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
          {/* FRONT */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
            <CardFront
              fref={frontRef}
              member={member} org={org}
              photoUrl={photoUrl} logoUrl={logoUrl} sigUrl={sigUrl}
              joined={joined}
            />
          </div>
          {/* BACK */}
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <CardBack
              bref={backRef}
              member={member} org={org}
              qrDataUrl={qrDataUrl}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={() => setShowBack(v => !v)}>
          <RotateCw className="w-4 h-4 mr-1" /> {showBack ? "ముందు చూడండి" : "వెనుక చూడండి"}
        </Button>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> ప్రింట్ / PDF
        </Button>
      </div>
    </div>
  );
}

function CardFront({
  fref, member, org, photoUrl, logoUrl, sigUrl, joined,
}: {
  fref: React.RefObject<HTMLDivElement>;
  member: Member; org: Org | null;
  photoUrl: string | null; logoUrl: string | null; sigUrl: string | null;
  joined: string;
}) {
  return (
    <div
      ref={fref}
      className="relative bg-white text-black overflow-hidden shadow-xl"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: "3mm",
        border: "0.3mm solid #000080",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Saffron header */}
      <div style={{
        background: "#FF9933", color: "#fff",
        padding: "1.2mm 2.5mm", display: "flex", alignItems: "center",
        gap: "2mm", height: "10mm",
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ height: "7.5mm", width: "7.5mm", borderRadius: "50%", background: "#fff", objectFit: "cover", border: "0.2mm solid #fff" }} />
        ) : (
          <div style={{ height: "7.5mm", width: "7.5mm", borderRadius: "50%", background: "#fff" }} />
        )}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.1 }}>
          <div style={{ fontSize: "3mm", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {org?.name ?? "Organization"}
          </div>
          {org?.gov_reg_number && (
            <div style={{ fontSize: "1.9mm", color: "#fff", opacity: 0.95 }}>Reg: {org.gov_reg_number}</div>
          )}
        </div>
        <div style={{
          fontSize: "2.1mm", background: "#fff", color: "#000080",
          padding: "0.4mm 1.4mm", borderRadius: "1mm", fontWeight: 800,
        }}>
          MEMBER
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "2.2mm", padding: "2mm 2.5mm 1.5mm", height: "36mm", background: "#fff", position: "relative" }}>
        {/* Photo */}
        <div style={{
          width: "21mm", height: "26mm",
          border: "0.3mm solid #138808",
          background: "#f5f5f5",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <User style={{ width: "10mm", height: "10mm", color: "#999" }} />
          )}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0, fontSize: "2.3mm", lineHeight: 1.3, color: "#111" }}>
          <div style={{
            fontSize: "2.1mm", color: "#fff", background: "#000080", fontWeight: 700,
            letterSpacing: "0.3mm", padding: "0.4mm 1.4mm", borderRadius: "0.8mm",
            display: "inline-block",
          }}>
            ID: {member.member_code ?? "—"}
          </div>
          <div style={{ fontSize: "3.1mm", fontWeight: 800, marginTop: "0.6mm", color: "#000080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {member.name}
          </div>
          {member.father_name && <Row label="తండ్రి" value={member.father_name} />}
          {member.phone && <Row label="ఫోన్" value={member.phone} />}
          <div style={{ display: "flex", gap: "2mm", marginTop: "0.3mm" }}>
            <div style={{ fontSize: "2.1mm", color: "#222" }}>
              <span style={{ color: "#666" }}>చేరిన: </span>
              <span style={{ fontWeight: 600 }}>{joined}</span>
            </div>
            {member.blood_group && (
              <div style={{
                fontSize: "2.1mm", background: "#C8102E", color: "#fff",
                padding: "0.2mm 1.2mm", borderRadius: "0.8mm", fontWeight: 800,
              }}>
                🩸 {member.blood_group}
              </div>
            )}
          </div>

          {/* President signature block */}
          <div style={{ marginTop: "auto", paddingTop: "1.5mm", textAlign: "right" }}>
            {sigUrl ? (
              <img src={sigUrl} alt="sig" style={{ height: "6mm", maxWidth: "28mm", objectFit: "contain", marginLeft: "auto", display: "block" }} />
            ) : (
              <div style={{ height: "6mm" }} />
            )}
            <div style={{ borderTop: "0.2mm solid #000080", marginTop: "0.3mm", paddingTop: "0.3mm", fontSize: "1.9mm", color: "#000080", fontWeight: 700 }}>
              {org?.president_name ?? "PRESIDENT"}
              <div style={{ fontSize: "1.6mm", color: "#666", fontWeight: 500 }}>President</div>
            </div>
          </div>
        </div>
      </div>

      {/* Green footer */}
      <div style={{
        background: "#138808", color: "#fff", height: "8mm",
        padding: "0 2.5mm", display: "flex", alignItems: "center",
        justifyContent: "space-between", fontSize: "2mm",
      }}>
        <span style={{ fontWeight: 700 }}>
          {member.is_active === false ? "● INACTIVE" : "● ACTIVE MEMBER"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "1.2mm" }}>
          <img src={mbrLogo.url} alt="MBR" style={{ height: "5mm", width: "5mm", borderRadius: "0.6mm", background: "#000", padding: "0.3mm", objectFit: "contain" }} />
          <span style={{ fontSize: "1.8mm", opacity: 0.95, fontWeight: 600 }}>MBR APP</span>
        </div>
      </div>
    </div>
  );
}

function CardBack({
  bref, member, org, qrDataUrl,
}: {
  bref: React.RefObject<HTMLDivElement>;
  member: Member; org: Org | null;
  qrDataUrl: string;
}) {
  return (
    <div
      ref={bref}
      className="relative bg-white text-black overflow-hidden shadow-xl"
      style={{
        width: "85.6mm", height: "54mm",
        borderRadius: "3mm",
        border: "0.3mm solid #000080",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* tricolor stripe */}
      <div style={{ display: "flex", height: "2.5mm" }}>
        <div style={{ flex: 1, background: "#FF9933" }} />
        <div style={{ flex: 1, background: "#fff" }} />
        <div style={{ flex: 1, background: "#138808" }} />
      </div>

      <div style={{ display: "flex", gap: "2.5mm", padding: "2mm 2.5mm", height: "43mm" }}>
        {/* QR */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8mm" }}>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="qr" style={{ width: "26mm", height: "26mm", border: "0.2mm solid #ddd" }} />
          )}
          <div style={{ fontSize: "1.7mm", color: "#666", fontWeight: 600 }}>SCAN TO VERIFY</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, fontSize: "2.1mm", lineHeight: 1.35, color: "#111" }}>
          <div style={{ fontSize: "2.4mm", fontWeight: 800, color: "#000080", marginBottom: "0.8mm" }}>
            సొసైటీ సంప్రదింపు
          </div>
          {org?.phone && (
            <div style={{ marginBottom: "0.5mm" }}>
              <span style={{ color: "#666" }}>📞 </span>
              <span style={{ fontWeight: 600 }}>{org.phone}</span>
            </div>
          )}
          {org?.email && (
            <div style={{ marginBottom: "0.5mm", wordBreak: "break-all", fontSize: "1.9mm" }}>
              <span style={{ color: "#666" }}>✉ </span>
              <span style={{ fontWeight: 600 }}>{org.email}</span>
            </div>
          )}
          {member.address && (
            <div style={{ marginTop: "1mm", paddingTop: "0.8mm", borderTop: "0.2mm dashed #ccc" }}>
              <div style={{ fontSize: "1.8mm", color: "#666", fontWeight: 600 }}>సభ్యుడి అడ్రస్</div>
              <div style={{ fontSize: "1.9mm", color: "#222", marginTop: "0.3mm" }}>
                {member.address}
              </div>
            </div>
          )}
          <div style={{ marginTop: "1.2mm", fontSize: "1.6mm", color: "#666", fontStyle: "italic" }}>
            ఈ కార్డ్ సొసైటీ ఆస్తి. దొరికినవారు పై చిరునామాకు తిరిగి ఇవ్వగలరు.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: "#000080", color: "#fff", height: "6mm",
        padding: "0 2.5mm", display: "flex", alignItems: "center",
        justifyContent: "space-between", fontSize: "1.8mm",
      }}>
        <span style={{ fontWeight: 700, letterSpacing: "0.4mm" }}>
          ID: {member.member_code ?? "—"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "1mm" }}>
          <img src={mbrLogo.url} alt="MBR" style={{ height: "4mm", width: "4mm", borderRadius: "0.5mm", background: "#fff", padding: "0.2mm", objectFit: "contain" }} />
          <span style={{ opacity: 0.9 }}>Powered by MBR APP</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "2.1mm", color: "#222", marginTop: "0.2mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ color: "#666" }}>{label}: </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
