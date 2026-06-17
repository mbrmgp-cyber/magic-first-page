import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, IdCard, User } from "lucide-react";

type Org = {
  name: string;
  logo_url?: string | null;
  letter_code?: string | null;
  gov_reg_number?: string | null;
  slogan?: string | null;
  phone?: string | null;
  email?: string | null;
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
      <DialogContent className="max-w-[420px] p-4">
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (member.photo_url) {
        const { data } = await supabase.storage.from("member-photos")
          .createSignedUrl(member.photo_url, 3600);
        if (!cancel && data?.signedUrl) setPhotoUrl(data.signedUrl);
      }
      if (org?.logo_url) {
        const { data } = await supabase.storage.from("org-logos")
          .createSignedUrl(org.logo_url, 3600);
        if (!cancel && data?.signedUrl) setLogoUrl(data.signedUrl);
        else if (!cancel) setLogoUrl(org.logo_url);
      }
      const payload = JSON.stringify({
        id: member.member_code ?? member.id,
        name: member.name,
        org: org?.name,
      });
      const qr = await QRCode.toDataURL(payload, { margin: 0, width: 200 });
      if (!cancel) setQrDataUrl(qr);
    })();
    return () => { cancel = true; };
  }, [member.id, member.photo_url, org?.logo_url]);

  function handlePrint() {
    const node = printRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=900,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${member.name}</title>
      <style>
        @page { size: 85.6mm 54mm; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
      </style></head><body>${node.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  const joined = member.joined_date
    ? new Date(member.joined_date).toLocaleDateString("te-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div className="space-y-3">
      {/* Card preview — CR80 ratio 85.6 x 54 mm ≈ 1.585:1 */}
      <div
        ref={printRef}
        className="relative mx-auto bg-white text-black overflow-hidden shadow-xl"
        style={{
          width: "85.6mm",
          height: "54mm",
          borderRadius: "3mm",
          border: "0.3mm solid #000080",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Saffron header */}
        <div
          style={{
            background: "#FF9933",
            color: "#fff",
            padding: "1.5mm 3mm",
            display: "flex",
            alignItems: "center",
            gap: "2mm",
            height: "10mm",
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: "7mm", width: "7mm", borderRadius: "50%", background: "#fff", objectFit: "cover" }} />
          ) : (
            <div style={{ height: "7mm", width: "7mm", borderRadius: "50%", background: "#fff" }} />
          )}
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.1 }}>
            <div style={{ fontSize: "3mm", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {org?.name ?? "Organization"}
            </div>
            {org?.gov_reg_number && (
              <div style={{ fontSize: "2mm", color: "#fff", opacity: 0.95 }}>Reg: {org.gov_reg_number}</div>
            )}
          </div>
          <div
            style={{
              fontSize: "2.2mm",
              background: "#fff",
              color: "#000080",
              padding: "0.5mm 1.5mm",
              borderRadius: "1mm",
              fontWeight: 700,
            }}
          >
            MEMBER
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", gap: "2.5mm", padding: "2.5mm 3mm", height: "36mm", background: "#fff" }}>
          {/* Photo */}
          <div
            style={{
              width: "22mm",
              height: "27mm",
              border: "0.3mm solid #138808",
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User style={{ width: "10mm", height: "10mm", color: "#999" }} />
            )}
          </div>
          {/* Details */}
          <div style={{ flex: 1, minWidth: 0, fontSize: "2.5mm", lineHeight: 1.35, color: "#111" }}>
            <div style={{ fontSize: "2mm", color: "#000080", fontWeight: 700, letterSpacing: "0.3mm" }}>
              ID: {member.member_code ?? "—"}
            </div>
            <div style={{ fontSize: "3.2mm", fontWeight: 700, marginTop: "0.5mm", color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {member.name}
            </div>
            {member.father_name && (
              <Row label="తండ్రి" value={member.father_name} />
            )}
            {member.phone && <Row label="ఫోన్" value={member.phone} />}
            <Row label="చేరిన" value={joined} />
            {member.address && (
              <div style={{ fontSize: "2mm", color: "#444", marginTop: "0.5mm", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                📍 {member.address}
              </div>
            )}
          </div>
          {/* QR */}
          {qrDataUrl && (
            <img src={qrDataUrl} alt="qr" style={{ width: "14mm", height: "14mm", alignSelf: "flex-end" }} />
          )}
        </div>

        {/* Green footer */}
        <div
          style={{
            background: "#138808",
            color: "#fff",
            height: "8mm",
            padding: "0 3mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "2.2mm",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {member.is_active === false ? "● INACTIVE" : "● ACTIVE MEMBER"}
          </span>
          <span style={{ opacity: 0.95 }}>{org?.phone ?? org?.email ?? ""}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> ప్రింట్ / PDF
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "2.3mm", color: "#222", marginTop: "0.3mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ color: "#666" }}>{label}: </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
