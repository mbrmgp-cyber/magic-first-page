import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Award, Printer, User } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

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
  const { symbol: sym } = useCurrency();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.62);

  useEffect(() => {
    if (!wrapRef.current) return;
    // A5 width = 148mm ≈ 559px at 96dpi. Fit to wrapper width with a little padding.
      const CARD_W = 559;
      const SAFE_GAP = 20;
    const compute = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
        if (w > 0) setScale(Math.min(1, Math.max(0.35, (w - SAFE_GAP) / CARD_W)));
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
      <div ref={wrapRef} style={{ width: "100%", overflow: "hidden", padding: "0 6px" }}>
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

            overflow: "hidden",
            backgroundColor: "#fff8e3",
            backgroundImage:
              "radial-gradient(circle at 50% 7%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 28%, transparent 42%), linear-gradient(180deg, #fffdf4 0%, #fff4c8 46%, #ffe6a1 100%)",
            border: "7px solid #8b1e1e",
            boxShadow: "inset 0 0 0 3px #d6a540, inset 0 0 0 10px #fff7d6, inset 0 0 0 12px #b78322",
            padding: "17mm 13mm 15mm",
            color: "#2b1207",
            fontFamily:
              '"Noto Sans Telugu", "Playfair Display", system-ui, sans-serif',
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* gold inner frame */}
          <div style={{ position: "absolute", inset: 24, border: "2px solid #b78322", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 34, border: "1px solid rgba(139,30,30,0.55)", pointerEvents: "none" }} />
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
                width: 24,
                height: 24,
                border: "2px solid #8b1e1e",
                background: "#fffdf4",
                transform: "rotate(45deg)",
                ...pos,
              }}
            />
          ))}

          {org?.logo_url && (
            <img src={org.logo_url} alt="" style={{ width: 60, height: 60, objectFit: "contain", marginBottom: 6 }} />
          )}
          <div style={{ fontSize: 21, fontWeight: 900, color: "#7a1616", textShadow: "0 1px 0 #ffffff", maxWidth: "100%", lineHeight: 1.25 }}>
            {org?.name || "—"}
          </div>
          {org?.slogan && (
            <div style={{ fontSize: 12, color: "#5a220d", marginTop: 2, fontWeight: 700 }}>{org.slogan}</div>
          )}

          <div
            style={{
              marginTop: 12,
              fontFamily: '"Playfair Display", serif',
              fontSize: 37,
              fontWeight: 900,
              color: "#8b1e1e",
              letterSpacing: 6,
              textTransform: "uppercase",
              textShadow: "0 1px 0 #ffffff, 0 2px 0 rgba(183,131,34,0.25)",
            }}
          >
            Certificate
          </div>
          <div style={{ fontSize: 13, color: "#2b1207", letterSpacing: 4, marginTop: 0, fontWeight: 900 }}>
            of Appreciation
          </div>
          <div style={{ fontSize: 15, color: "#7a1616", marginTop: 4, fontWeight: 900 }}>
            కృతజ్ఞతా పత్రం
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#2b1207", fontWeight: 800 }}>
            This certificate is proudly presented to
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                overflow: "hidden",
                border: "4px solid #8b1e1e",
                boxShadow: "0 0 0 4px #fffdf4, 0 0 0 7px #d6a540, 0 5px 14px rgba(43,18,7,0.28)",
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
              marginTop: 12,
              fontFamily: '"Dancing Script", cursive',
              fontSize: fullName.length > 24 ? 36 : 43,
              fontWeight: 700,
              color: "#5f1111",
              lineHeight: 1.1,
              textShadow: "0 1px 0 #ffffff, 0 2px 0 rgba(183,131,34,0.3)",
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}
          >
            {fullName}
          </div>
          <div style={{ borderBottom: "3px solid #b78322", width: "72%", margin: "5px auto 0" }} />

          <div style={{ marginTop: 13, fontSize: 13, lineHeight: 1.65, color: "#2b1207", padding: "0 7mm", fontWeight: 800 }}>
            గౌరవప్రదమైన విరాళంతో సంఘ సేవలో పాలుపంచుకున్నందుకు
            హృదయపూర్వక కృతజ్ఞతలు తెలియజేస్తున్నాము.
            <br />
            <span style={{ color: "#5a220d", fontSize: 12, fontWeight: 700 }}>
              In grateful recognition of your generous contribution
              towards our society's mission.
            </span>
          </div>

          <div
            style={{
              marginTop: 14,
              background: "linear-gradient(135deg, #fffdf4 0%, #ffe082 100%)",
              border: "2px solid #8b1e1e",
              borderRadius: 10,
              padding: "10px 28px",
              fontSize: 24,
              fontWeight: 900,
              color: "#0f766e",
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
              color: "#2b1207",
              fontWeight: 600,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ borderTop: "2px solid #8b1e1e", paddingTop: 3, minWidth: 90, color: "#7a1616", fontWeight: 900 }}>Date</div>
              <div>{dateStr}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ borderTop: "2px solid #8b1e1e", paddingTop: 3, minWidth: 120, color: "#7a1616", fontWeight: 900 }}>అధ్యక్షుడు</div>
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
