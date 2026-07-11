import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Award, Printer, User } from "lucide-react";

type Donor = {
  id: string;
  org_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
  total_donated?: number | string | null;
  momento_issued_at?: string | null;
};

type Org = {
  name?: string | null;
  logo_url?: string | null;
  slogan?: string | null;
  president_name?: string | null;
};

export function DonorMomentoButton({ donor }: { donor: Donor }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-50">
          <Award className="w-4 h-4 mr-1" /> గుర్తింపు కార్డు
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[96dvh] w-[calc(100vw-1rem)] max-w-[640px] overflow-y-auto p-3 sm:p-4">
        <DialogHeader className="pr-8">
          <DialogTitle>డోనర్ గుర్తింపు కార్డు</DialogTitle>
        </DialogHeader>
        <DonorMomento donor={donor} />
      </DialogContent>
    </Dialog>
  );
}

function DonorMomento({ donor }: { donor: Donor }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.62);

  useEffect(() => {
    if (!wrapRef.current) return;
    // A5 width = 148mm ≈ 559px at 96dpi. Extra bleed keeps all borders visible.
    const CARD_W = 559;
    const BLEED = 22;
    const compute = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
      if (w > 0) setScale(Math.min(1, Math.max(0.32, (w - 2) / (CARD_W + BLEED * 2))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);


  useEffect(() => {
    let cancel = false;
    (async () => {
      if (donor.photo_url) {
        const { data } = await supabase.storage.from("member-photos")
          .createSignedUrl(donor.photo_url, 3600);
        if (!cancel && data?.signedUrl) setPhotoUrl(data.signedUrl);
      }
      if (donor.org_id) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url, slogan, president_name")
          .eq("id", donor.org_id)
          .maybeSingle();
        if (!cancel && o) setOrg(o as Org);
      }
    })();
    return () => { cancel = true; };
  }, [donor.id, donor.org_id, donor.photo_url]);

  const fullName = [donor.first_name, donor.last_name].filter(Boolean).join(" ").trim() || "—";
  const amount = Number(donor.total_donated ?? 0);
  const issuedDate = donor.momento_issued_at
    ? new Date(donor.momento_issued_at)
    : new Date();
  const dateStr = issuedDate.toLocaleDateString("te-IN", { day: "2-digit", month: "long", year: "numeric" });

  function handlePrint() {
    const el = cardRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Momento - ${fullName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Playfair+Display:wght@600;700;800&display=swap">
      <style>
        @page { size: A5 portrait; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; font-family: "Noto Sans Telugu", "Playfair Display", system-ui, sans-serif; }
      </style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  }

  return (
    <div className="space-y-3">
      <div ref={wrapRef} style={{ width: "100%", overflow: "hidden", padding: "8px 0", background: "#ffffff" }}>
        <div style={{ width: (559 + 44) * scale, height: (794 + 44) * scale, margin: "0 auto", position: "relative" }}>
        <div
          ref={cardRef}
          style={{
            width: "148mm",
            height: "210mm",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 22 * scale,
            left: 22 * scale,
            overflow: "hidden",
            background: "#000000",
            padding: "10mm 8mm",
            color: "#2b1207",
            fontFamily: '"Noto Sans Telugu", "Playfair Display", Georgia, serif',
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative" as const,
          }}
        >
          {/* Scroll top roll */}
          <div style={{
            position: "absolute", top: 14, left: 18, right: 18, height: 34,
            background: "linear-gradient(180deg,#e8c98a 0%,#d0a45a 45%,#a97a3c 100%)",
            borderRadius: "50%/60%",
            boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.25), inset 0 4px 6px rgba(255,255,255,0.55), 0 3px 6px rgba(0,0,0,0.35)",
          }} />
          {/* Scroll bottom roll */}
          <div style={{
            position: "absolute", bottom: 14, left: 18, right: 18, height: 34,
            background: "linear-gradient(180deg,#e8c98a 0%,#d0a45a 45%,#a97a3c 100%)",
            borderRadius: "50%/60%",
            boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.25), inset 0 4px 6px rgba(255,255,255,0.55), 0 3px 6px rgba(0,0,0,0.35)",
          }} />

          {/* Parchment body */}
          <div style={{
            position: "absolute",
            top: 40, bottom: 40, left: 24, right: 24,
            background: "radial-gradient(circle at 50% 30%, #fbe6b8 0%, #f3d59a 55%, #d9b072 100%)",
            boxShadow: "inset 0 0 40px rgba(120,70,20,0.35), 0 6px 14px rgba(0,0,0,0.4)",
          }} />

          {/* Ornate green border frame */}
          <div style={{
            position: "absolute",
            top: 62, bottom: 62, left: 44, right: 44,
            border: "10px solid transparent",
            borderImage: "repeating-linear-gradient(45deg,#3d5a1e 0 6px,#6b8a3a 6px 12px,#8fa84a 12px 18px) 10",
            background: "linear-gradient(180deg,#fff4d6 0%,#fbe4a8 100%)",
            boxShadow: "inset 0 0 0 2px #c48f3a, inset 0 0 0 4px #fff2c8, inset 0 0 0 6px #b07322",
          }} />

          {/* Content area */}
          <div style={{
            position: "absolute", top: 78, bottom: 78, left: 60, right: 60,
            display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px",
          }}>
            {/* Gold stars */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "88%", marginTop: 2 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  fontSize: i === 1 ? 34 : 28,
                  color: "#e8b530",
                  textShadow: "0 2px 3px rgba(120,70,10,0.55), 0 0 6px rgba(255,220,120,0.6)",
                  transform: i === 1 ? "translateY(-4px)" : "none",
                  lineHeight: 1,
                }}>★</div>
              ))}
            </div>

            {/* Photo in decorative cartouche */}
            <div style={{
              marginTop: 4,
              width: 130, height: 130,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#fff",
              border: "4px solid #a4732a",
              boxShadow: "0 0 0 2px #fbe6b8, 0 4px 10px rgba(80,40,10,0.4)",
              borderRadius: "48% 48% 42% 42% / 55% 55% 40% 40%",
              overflow: "hidden",
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User style={{ width: 56, height: 56, color: "#a4732a" }} />
              )}
            </div>

            {/* Title */}
            <div style={{
              marginTop: 12,
              fontSize: 20,
              fontWeight: 900,
              color: "#c81919",
              letterSpacing: 1.5,
              fontFamily: '"Playfair Display", Georgia, serif',
              textShadow: "0 1px 0 #fff6d8",
            }}>
              THE BEST SUPPORTER
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#7a1616", marginTop: 2 }}>
              ఉత్తమ సభ్యుడు
            </div>

            {/* Body text */}
            <div style={{ marginTop: 10, fontSize: 14, color: "#2b1207", fontWeight: 700, lineHeight: 1.55 }}>
              Award presented to
            </div>
            <div style={{
              marginTop: 4,
              fontSize: fullName.length > 22 ? 20 : 24,
              fontWeight: 900,
              color: "#c81919",
              fontFamily: '"Playfair Display", Georgia, serif',
              lineHeight: 1.15,
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}>
              {fullName}
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#2b1207", fontWeight: 700, lineHeight: 1.55, padding: "0 4mm" }}>
              On {issuedDate.getFullYear()} towards his/her grateful
              <br />support and exemplary service
              <br />Towards
            </div>

            {org?.logo_url && (
              <img src={org.logo_url} alt="" style={{ width: 54, height: 54, objectFit: "contain", marginTop: 8 }} />
            )}

            <div style={{ marginTop: 4, fontSize: 15, fontWeight: 900, color: "#1a3d5c", fontFamily: '"Playfair Display", Georgia, serif' }}>
              {org?.name || "—"}
            </div>
            {org?.slogan && (
              <div style={{ fontSize: 11, color: "#5a220d", marginTop: 2, fontWeight: 700 }}>{org.slogan}</div>
            )}

            {amount > 0 && (
              <div style={{
                marginTop: 8,
                background: "linear-gradient(135deg,#fff6d8 0%,#f0c96b 100%)",
                border: "1.5px solid #a4732a",
                borderRadius: 6,
                padding: "3px 14px",
                fontSize: 14,
                fontWeight: 900,
                color: "#7a1616",
              }}>
                ₹ {amount.toLocaleString("en-IN")}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Ornament divider */}
            <div style={{ fontSize: 20, color: "#5a4020", letterSpacing: 4, marginTop: 4 }}>
              ❦ ✦ ❦
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", width: "100%",
              marginTop: 4, fontSize: 10, color: "#2b1207", fontWeight: 700,
            }}>
              <div>{dateStr}</div>
              <div>{org?.president_name || "అధ్యక్షుడు"}</div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700">
          <Printer className="w-4 h-4 mr-1" /> ప్రింట్
        </Button>
      </div>
    </div>
  );
}

