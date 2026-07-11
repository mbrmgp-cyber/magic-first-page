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
      <DialogContent className="max-w-[560px] p-4">
        <DialogHeader>
          <DialogTitle>డోనర్ గుర్తింపు కార్డు (Momento)</DialogTitle>
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
    // A5 width = 148mm ≈ 559px at 96dpi. Fit to wrapper width with a little padding.
    const CARD_W = 559;
    const compute = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
      if (w > 0) setScale(Math.min(1, Math.max(0.35, w / CARD_W)));
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
      <div ref={wrapRef} style={{ width: "100%", overflow: "hidden" }}>
        <div style={{ width: 559 * scale, height: 792 * scale, margin: "0 auto", position: "relative" }}>
        <div
          ref={cardRef}
          style={{
            width: "148mm",
            height: "210mm",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,

            backgroundColor: "#fffaf0",
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(251,191,36,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 90%, rgba(180,83,9,0.25) 0%, transparent 50%), linear-gradient(135deg, #fffaf0 0%, #fef3c7 55%, #fde68a 100%)",
            border: "8px solid #7c2d12",
            outline: "2px solid #d97706",
            outlineOffset: "-14px",
            padding: "18mm 14mm",
            color: "#3f1d0a",
            fontFamily:
              '"Noto Sans Telugu", "Playfair Display", system-ui, sans-serif',
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* gold inner frame */}
          <div style={{ position: "absolute", inset: 20, border: "1px solid #b45309", pointerEvents: "none" }} />
          {/* corner medallions */}
          {[
            { top: 10, left: 10 },
            { top: 10, right: 10 },
            { bottom: 10, left: 10 },
            { bottom: 10, right: 10 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 22,
                height: 22,
                border: "2px solid #b45309",
                background: "#fff7ed",
                transform: "rotate(45deg)",
                ...pos,
              }}
            />
          ))}

          {org?.logo_url && (
            <img src={org.logo_url} alt="" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 6 }} />
          )}
          <div style={{ fontSize: 22, fontWeight: 900, color: "#4a0e0e", letterSpacing: 0.5, textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>
            {org?.name || "—"}
          </div>
          {org?.slogan && (
            <div style={{ fontSize: 12, color: "#7c2d12", marginTop: 2, fontStyle: "italic" }}>{org.slogan}</div>
          )}

          <div
            style={{
              marginTop: 14,
              fontFamily: '"Playfair Display", serif',
              fontSize: 38,
              fontWeight: 900,
              color: "#7c2d12",
              letterSpacing: 6,
              textTransform: "uppercase",
              textShadow: "0 2px 4px rgba(180,83,9,0.25)",
            }}
          >
            Certificate
          </div>
          <div style={{ fontSize: 13, color: "#4a0e0e", letterSpacing: 4, marginTop: 0, fontWeight: 700 }}>
            of Appreciation
          </div>
          <div style={{ fontSize: 15, color: "#7c2d12", marginTop: 4, fontWeight: 700 }}>
            కృతజ్ఞతా పత్రం
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "#3f1d0a", fontWeight: 500 }}>
            This certificate is proudly presented to
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                overflow: "hidden",
                border: "4px solid #b45309",
                boxShadow: "0 0 0 3px #fff7ed, 0 4px 12px rgba(124,45,18,0.3)",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User style={{ width: 44, height: 44, color: "#b45309" }} />
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontFamily: '"Dancing Script", cursive',
              fontSize: 44,
              fontWeight: 700,
              color: "#4a0e0e",
              lineHeight: 1.1,
              textShadow: "0 1px 0 rgba(255,255,255,0.6)",
            }}
          >
            {fullName}
          </div>
          <div style={{ borderBottom: "2px solid #b45309", width: "70%", margin: "4px auto 0" }} />

          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7, color: "#3f1d0a", padding: "0 8mm", fontWeight: 500 }}>
            గౌరవప్రదమైన విరాళంతో సంఘ సేవలో పాలుపంచుకున్నందుకు
            హృదయపూర్వక కృతజ్ఞతలు తెలియజేస్తున్నాము.
            <br />
            <span style={{ fontStyle: "italic", color: "#7c2d12", fontSize: 12 }}>
              In grateful recognition of your generous contribution
              towards our society's mission.
            </span>
          </div>

          <div
            style={{
              marginTop: 14,
              background: "linear-gradient(135deg, #fff7ed 0%, #fde68a 100%)",
              border: "2px solid #b45309",
              borderRadius: 10,
              padding: "10px 28px",
              fontSize: 24,
              fontWeight: 900,
              color: "#4a0e0e",
              boxShadow: "0 4px 10px rgba(124,45,18,0.2)",
              letterSpacing: 0.5,
            }}
          >
            ₹ {amount.toLocaleString("en-IN")}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 20,
              fontSize: 11,
              color: "#3f1d0a",
              fontWeight: 600,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ borderTop: "1.5px solid #7c2d12", paddingTop: 3, minWidth: 90, color: "#7c2d12", fontWeight: 700 }}>Date</div>
              <div>{dateStr}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ borderTop: "1.5px solid #7c2d12", paddingTop: 3, minWidth: 120, color: "#7c2d12", fontWeight: 700 }}>అధ్యక్షుడు</div>
              <div>{org?.president_name || "—"}</div>
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
