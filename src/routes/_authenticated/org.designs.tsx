import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getMyOrg } from "@/lib/org.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, IdCard, FileText, Sparkles, Check, Wand2, Lock, QrCode,
  LayoutTemplate, Layers, Square, FileSignature, Download,
} from "lucide-react";
import { resolveTheme, type ThemeSettings } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/org/designs")({
  head: () => ({ meta: [{ title: "ID Card & Letter Pad Templates — MBR App" }] }),
  component: DesignsPage,
});

type IdLayout =
  | "portrait-classic"
  | "landscape-corporate"
  | "portrait-qr"
  | "split-design"
  | "traditional-border";

type LetterLayout = "standard-header" | "watermark-centered" | "left-sidebar";

type Tpl<T extends string> = {
  id: T | `coming-${number}`;
  en: string;
  te: string;
  comingSoon?: boolean;
};

const ID_TEMPLATES: Tpl<IdLayout>[] = [
  { id: "portrait-classic",     en: "Portrait Classic",     te: "పోర్ట్రెయిట్ క్లాసిక్" },
  { id: "landscape-corporate",  en: "Landscape Corporate",  te: "ల్యాండ్‌స్కేప్ కార్పొరేట్" },
  { id: "portrait-qr",          en: "Portrait with QR",     te: "QR తో పోర్ట్రెయిట్" },
  { id: "split-design",         en: "Split Design",         te: "స్ప్లిట్ డిజైన్" },
  { id: "traditional-border",   en: "Traditional Border",   te: "సాంప్రదాయ బార్డర్" },
  { id: "coming-6",  en: "Premium Layout 6",  te: "త్వరలో", comingSoon: true },
  { id: "coming-7",  en: "Premium Layout 7",  te: "త్వరలో", comingSoon: true },
  { id: "coming-8",  en: "Premium Layout 8",  te: "త్వరలో", comingSoon: true },
  { id: "coming-9",  en: "Premium Layout 9",  te: "త్వరలో", comingSoon: true },
  { id: "coming-10", en: "Premium Layout 10", te: "త్వరలో", comingSoon: true },
];

const LETTER_TEMPLATES: Tpl<LetterLayout>[] = [
  { id: "standard-header",     en: "Standard Header",     te: "స్టాండర్డ్ హెడర్" },
  { id: "watermark-centered",  en: "Watermark Centered",  te: "వాటర్‌మార్క్ సెంటర్" },
  { id: "left-sidebar",        en: "Left Sidebar Modern", te: "లెఫ్ట్ సైడ్‌బార్ మోడర్న్" },
  { id: "coming-4", en: "Premium Letterhead", te: "త్వరలో", comingSoon: true },
];

function DesignsPage() {
  const navigate = useNavigate();
  const fetchOrg = useServerFn(getMyOrg);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const org: any = orgQ.data?.org;
  const theme = useMemo(() => resolveTheme(org), [org]);

  const [idPick, setIdPick] = useState<IdLayout>("portrait-classic");
  const [letterPick, setLetterPick] = useState<LetterLayout>("standard-header");
  const [generating, setGenerating] = useState(false);

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgSlogan = org?.slogan || "॥ మానవసేవే మాధవసేవ ॥";
  const orgReg = org?.gov_reg_number || "356/16";

  async function applyAndGenerate() {
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1400));
      toast.success(
        "ID Cards generated for all members / అన్ని సభ్యుల ID కార్డులు సిద్ధం",
        { description: "Ready for PDF download using the selected layout." },
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: theme.bg, color: theme.headColor }}>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/dashboard" })}
            style={{ color: theme.smallColor }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-center">
            <h1 className="text-base md:text-lg font-extrabold leading-tight"
              style={{ color: theme.headColor, fontFamily: `${theme.headFont}, system-ui` }}>
              ID Card &amp; Letter Pad Templates
            </h1>
            <p className="text-[11px]" style={{ color: theme.smallColor }}>
              టెంప్లేట్ సెలెక్టర్ — Live preview inherits your theme
            </p>
          </div>
          <div className="w-12" />
        </div>

        {/* ID Card Gallery */}
        <Section
          icon={<IdCard className="h-5 w-5" style={{ color: theme.icon }} />}
          title="ID Card Templates"
          subtitle="ID కార్డ్ లేఅవుట్ గ్యాలరీ — 10 options"
          theme={theme}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ID_TEMPLATES.map((tpl) => {
              const active = tpl.id === idPick;
              const locked = !!tpl.comingSoon;
              return (
                <button
                  key={tpl.id}
                  disabled={locked}
                  onClick={() => !locked && setIdPick(tpl.id as IdLayout)}
                  className="group relative rounded-xl overflow-hidden border transition text-left"
                  style={{
                    borderColor: active ? theme.icon : theme.border,
                    background: theme.box,
                    boxShadow: active ? `0 0 0 2px ${theme.icon}` : undefined,
                    opacity: locked ? 0.55 : 1,
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="aspect-[1.586/1] w-full p-1.5" style={{ background: theme.bg }}>
                    <IdThumb layout={(locked ? "portrait-classic" : tpl.id) as IdLayout} theme={theme} />
                  </div>
                  <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: theme.headColor }}>{tpl.en}</p>
                      <p className="text-[10px] truncate" style={{ color: theme.smallColor }}>{tpl.te}</p>
                    </div>
                    {locked ? (
                      <Lock className="h-3 w-3 shrink-0" style={{ color: theme.smallColor }} />
                    ) : active ? (
                      <div className="rounded-full p-0.5" style={{ background: theme.icon }}>
                        <Check className="h-3 w-3" style={{ color: theme.buttonText }} />
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <LivePreview title="ID Card Live Preview" theme={theme}>
            <IdCardPreview layout={idPick} theme={theme} orgName={orgName} slogan={orgSlogan} reg={orgReg} />
          </LivePreview>
        </Section>

        {/* Letter Pad Gallery */}
        <Section
          icon={<FileText className="h-5 w-5" style={{ color: theme.icon }} />}
          title="Letter Pad Templates"
          subtitle="లెటర్ ప్యాడ్ టెంప్లేట్స్"
          theme={theme}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {LETTER_TEMPLATES.map((tpl) => {
              const active = tpl.id === letterPick;
              const locked = !!tpl.comingSoon;
              return (
                <button
                  key={tpl.id}
                  disabled={locked}
                  onClick={() => !locked && setLetterPick(tpl.id as LetterLayout)}
                  className="group relative rounded-xl overflow-hidden border transition text-left"
                  style={{
                    borderColor: active ? theme.icon : theme.border,
                    background: theme.box,
                    boxShadow: active ? `0 0 0 2px ${theme.icon}` : undefined,
                    opacity: locked ? 0.55 : 1,
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  <div className="aspect-[0.77/1] w-full p-1.5" style={{ background: theme.bg }}>
                    <LetterThumb layout={(locked ? "standard-header" : tpl.id) as LetterLayout} theme={theme} />
                  </div>
                  <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: theme.headColor }}>{tpl.en}</p>
                      <p className="text-[10px] truncate" style={{ color: theme.smallColor }}>{tpl.te}</p>
                    </div>
                    {locked ? (
                      <Lock className="h-3 w-3 shrink-0" style={{ color: theme.smallColor }} />
                    ) : active ? (
                      <div className="rounded-full p-0.5" style={{ background: theme.icon }}>
                        <Check className="h-3 w-3" style={{ color: theme.buttonText }} />
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <LivePreview title="Letter Pad Live Preview" theme={theme}>
            <LetterPreview layout={letterPick} theme={theme} orgName={orgName} slogan={orgSlogan} reg={orgReg} />
          </LivePreview>
        </Section>

        {/* Generate */}
        <Button
          disabled={generating}
          onClick={applyAndGenerate}
          className="w-full font-semibold h-12"
          style={{
            background: theme.buttonBg,
            color: theme.buttonText,
            boxShadow: `0 0 28px ${theme.buttonBg}66`,
          }}
        >
          {generating ? (
            <>
              <Wand2 className="h-4 w-4 mr-2 animate-pulse" /> Generating for all members…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Apply &amp; Generate for All Members / అన్ని సభ్యులకు తయారు చేయండి
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Layout helpers ---------------- */

function Section({
  icon, title, subtitle, theme, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  theme: Required<ThemeSettings>; children: React.ReactNode;
}) {
  return (
    <Card className="p-4 space-y-4 border" style={{ background: theme.box, borderColor: theme.border }}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm md:text-base font-bold" style={{ color: theme.headColor }}>{title}</h2>
          <p className="text-[11px]" style={{ color: theme.smallColor }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function LivePreview({
  title, theme, children,
}: { title: string; theme: Required<ThemeSettings>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: theme.bg, borderColor: theme.border }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: theme.icon }} />
        <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: theme.headColor }}>
          {title} / లైవ్ ప్రివ్యూ
        </p>
      </div>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}

/* ---------------- Thumbnails ---------------- */

function IdThumb({ layout, theme }: { layout: IdLayout; theme: Required<ThemeSettings> }) {
  const c = theme.icon, b = theme.box, br = theme.border, bg = "#ffffff";
  const common: React.CSSProperties = {
    width: "100%", height: "100%", borderRadius: 6,
    background: bg, border: `1px solid ${br}`, overflow: "hidden",
    display: "flex",
  };
  if (layout === "landscape-corporate") {
    return (
      <div style={{ ...common, flexDirection: "column" }}>
        <div style={{ height: "30%", background: c }} />
        <div style={{ flex: 1, display: "flex", padding: 4, gap: 4 }}>
          <div style={{ width: "30%", background: "#e5e5e5", borderRadius: 3 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ height: 4, background: "#333", width: "80%" }} />
            <div style={{ height: 3, background: "#777", width: "60%" }} />
            <div style={{ height: 3, background: "#bbb", width: "70%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (layout === "portrait-qr") {
    return (
      <div style={{ ...common, flexDirection: "column" }}>
        <div style={{ background: c, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ height: 4, width: "60%", background: "#fff", borderRadius: 1 }} />
        </div>
        <div style={{ flex: 1, padding: 4, display: "flex", gap: 4 }}>
          <div style={{ width: "40%", background: "#e5e5e5", borderRadius: 3 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ height: 3, background: "#333" }} />
            <div style={{ height: 2, background: "#888" }} />
            <div style={{ marginTop: "auto", alignSelf: "flex-end" }}>
              <QrCode className="h-4 w-4" style={{ color: c }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (layout === "split-design") {
    return (
      <div style={{ ...common, flexDirection: "row" }}>
        <div style={{ width: "40%", background: c, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
        </div>
        <div style={{ flex: 1, padding: 4, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ height: 3, background: "#333", width: "80%" }} />
          <div style={{ height: 2, background: "#888", width: "60%" }} />
          <div style={{ height: 2, background: "#bbb", width: "70%" }} />
        </div>
      </div>
    );
  }
  if (layout === "traditional-border") {
    return (
      <div style={{ ...common, padding: 3 }}>
        <div style={{ flex: 1, border: `2px double ${c}`, borderRadius: 4, padding: 3, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ height: 4, background: c, width: "70%", margin: "0 auto" }} />
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            <div style={{ width: "30%", background: "#e5e5e5", borderRadius: 2 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ height: 2, background: "#777" }} />
              <div style={{ height: 2, background: "#aaa", width: "70%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  // portrait-classic
  return (
    <div style={{ ...common, flexDirection: "column" }}>
      <div style={{ background: c, height: 16, display: "flex", alignItems: "center", padding: "0 4px", gap: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
        <div style={{ height: 3, background: "#fff", flex: 1, opacity: 0.8 }} />
      </div>
      <div style={{ flex: 1, padding: 4, display: "flex", gap: 4 }}>
        <div style={{ width: "35%", background: "#e5e5e5", borderRadius: 3 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ height: 3, background: "#333" }} />
          <div style={{ height: 2, background: "#888", width: "80%" }} />
          <div style={{ height: 2, background: "#aaa", width: "60%" }} />
          <div style={{ height: 2, background: "#aaa", width: "70%" }} />
        </div>
      </div>
    </div>
  );
}

function LetterThumb({ layout, theme }: { layout: LetterLayout; theme: Required<ThemeSettings> }) {
  const c = theme.icon, br = theme.border;
  const common: React.CSSProperties = {
    width: "100%", height: "100%", borderRadius: 4,
    background: "#fff", border: `1px solid ${br}`, overflow: "hidden", padding: 5,
  };
  if (layout === "watermark-centered") {
    return (
      <div style={{ ...common, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.12 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: c }} />
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 4, background: c, width: "60%", margin: "0 auto" }} />
          <div style={{ height: 2, background: "#888", width: "40%", margin: "2px auto 4px" }} />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 2, background: "#ddd", width: `${85 - (i % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (layout === "left-sidebar") {
    return (
      <div style={{ ...common, padding: 0, display: "flex" }}>
        <div style={{ width: "28%", background: c, padding: 4, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", margin: "0 auto" }} />
          <div style={{ height: 2, background: "#fff", opacity: 0.7 }} />
          <div style={{ height: 2, background: "#fff", opacity: 0.5, width: "70%" }} />
        </div>
        <div style={{ flex: 1, padding: 5, display: "flex", flexDirection: "column", gap: 2 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 2, background: "#ccc", width: `${90 - (i % 4) * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }
  // standard-header
  return (
    <div style={common}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: `2px solid ${c}`, paddingBottom: 4 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 3, background: "#333", width: "80%" }} />
          <div style={{ height: 2, background: "#888", width: "50%", marginTop: 2 }} />
        </div>
      </div>
      <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 2, background: "#ddd", width: `${90 - (i % 4) * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Live Previews ---------------- */

function IdCardPreview({
  layout, theme, orgName, slogan, reg,
}: {
  layout: IdLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string;
}) {
  const align = theme.headAlign;
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const cardW = 340, cardH = 214; // landscape default

  const header = (
    <div style={{
      background: theme.icon, padding: "8px 12px",
      display: "flex", alignItems: "center", gap: 10,
      flexDirection: align === "right" ? "row-reverse" : "row",
    }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sparkles className="h-4 w-4" style={{ color: theme.icon }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: align }}>
        <div style={{ fontFamily: headFF, fontWeight: 900, fontSize: 13, color: theme.buttonText,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {orgName}
        </div>
        <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: theme.subColor }}>
          {slogan}
        </div>
        <div style={{ fontSize: theme.smallSize - 2, color: theme.buttonText, opacity: 0.85 }}>
          Reg: {reg}
        </div>
      </div>
    </div>
  );

  const body = (
    <div style={{ flex: 1, padding: 10, display: "flex", gap: 10, background: "#fff" }}>
      <div style={{ width: 68, height: 84, borderRadius: 6, background: "#e5e5e5",
        display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${theme.border}` }}>
        <Square className="h-6 w-6" style={{ color: "#999" }} />
      </div>
      <div style={{ flex: 1, fontFamily: headFF }}>
        <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>Sample Member</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: A/0001</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>Phone: +91 90000 00000</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>Village: Chitvel</div>
      </div>
    </div>
  );

  if (layout === "portrait-classic" || layout === "portrait-qr") {
    return (
      <div style={{
        width: cardH, height: cardW, borderRadius: 10, overflow: "hidden",
        border: `1px solid ${theme.border}`, background: "#fff",
        boxShadow: `0 8px 28px ${theme.icon}33`, display: "flex", flexDirection: "column",
      }}>
        {header}
        <div style={{ flex: 1, padding: 10, background: "#fff", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 90, height: 110, margin: "0 auto", borderRadius: 6, background: "#e5e5e5",
            display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${theme.border}` }}>
            <Square className="h-7 w-7" style={{ color: "#999" }} />
          </div>
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 13 }}>Sample Member</div>
          <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: A/0001</div>
          {layout === "portrait-qr" && (
            <div style={{ marginTop: "auto", alignSelf: "center", padding: 4, background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 4 }}>
              <QrCode className="h-10 w-10" style={{ color: "#111" }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === "split-design") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, overflow: "hidden",
        border: `1px solid ${theme.border}`, background: "#fff", display: "flex",
        boxShadow: `0 8px 28px ${theme.icon}33`,
      }}>
        <div style={{ width: "40%", background: theme.icon, padding: 12,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles className="h-5 w-5" style={{ color: theme.icon }} />
          </div>
          <div style={{ fontFamily: headFF, color: theme.buttonText, fontSize: 10, fontWeight: 800, textAlign: "center" }}>
            {orgName}
          </div>
          <div style={{ fontFamily: subFF, color: theme.subColor, fontSize: 8, fontStyle: "italic", textAlign: "center" }}>
            {slogan}
          </div>
        </div>
        <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 60, height: 72, borderRadius: 6, background: "#e5e5e5",
            border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Square className="h-6 w-6" style={{ color: "#999" }} />
          </div>
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 12 }}>Sample Member</div>
          <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: A/0001</div>
          <div style={{ color: "#555", fontSize: theme.smallSize }}>Reg: {reg}</div>
        </div>
      </div>
    );
  }

  if (layout === "traditional-border") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, padding: 6,
        background: theme.icon, boxShadow: `0 8px 28px ${theme.icon}33`,
      }}>
        <div style={{
          width: "100%", height: "100%", border: `2px double ${theme.icon}`,
          background: "#fff", borderRadius: 6, padding: 8,
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ textAlign: "center", fontFamily: headFF, fontWeight: 900, color: theme.icon, fontSize: 14 }}>
            {orgName}
          </div>
          <div style={{ textAlign: "center", fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: theme.subColor }}>
            {slogan}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 10, padding: 8 }}>
            <div style={{ width: 62, height: 78, borderRadius: 4, background: "#e5e5e5",
              border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Square className="h-6 w-6" style={{ color: "#999" }} />
            </div>
            <div style={{ flex: 1, fontFamily: headFF }}>
              <div style={{ fontWeight: 800, color: "#111", fontSize: 12 }}>Sample Member</div>
              <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: A/0001</div>
              <div style={{ color: "#555", fontSize: theme.smallSize }}>Reg: {reg}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // landscape-corporate (default)
  return (
    <div style={{
      width: cardW, height: cardH, borderRadius: 10, overflow: "hidden",
      border: `1px solid ${theme.border}`, background: "#fff",
      boxShadow: `0 8px 28px ${theme.icon}33`, display: "flex", flexDirection: "column",
    }}>
      {header}
      {body}
    </div>
  );
}

function LetterPreview({
  layout, theme, orgName, slogan, reg,
}: {
  layout: LetterLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string;
}) {
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const W = 320, H = 420;
  const lines = (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ height: 4, background: "#e5e5e5", borderRadius: 2, width: `${95 - (i % 4) * 8}%` }} />
      ))}
    </div>
  );

  if (layout === "watermark-centered") {
    return (
      <div style={{
        width: W, height: H, background: "#fff", borderRadius: 10, padding: 18,
        border: `1px solid ${theme.border}`, boxShadow: `0 8px 28px ${theme.icon}33`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.08, pointerEvents: "none",
        }}>
          <Sparkles style={{ height: 180, width: 180, color: theme.icon }} />
        </div>
        <div style={{ position: "relative", textAlign: theme.headAlign }}>
          <div style={{ fontFamily: headFF, fontWeight: 900, color: theme.icon, fontSize: 18 }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontStyle: "italic", color: theme.subColor, fontSize: 11 }}>{slogan}</div>
          <div style={{ fontSize: theme.smallSize, color: "#666" }}>Reg No: {reg}</div>
        </div>
        {lines}
      </div>
    );
  }

  if (layout === "left-sidebar") {
    return (
      <div style={{
        width: W, height: H, borderRadius: 10, overflow: "hidden", display: "flex",
        border: `1px solid ${theme.border}`, boxShadow: `0 8px 28px ${theme.icon}33`,
      }}>
        <div style={{ width: 88, background: theme.icon, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <Sparkles className="h-6 w-6" style={{ color: theme.icon }} />
          </div>
          <div style={{ fontFamily: headFF, fontSize: 9, color: theme.buttonText, fontWeight: 700, textAlign: "center" }}>
            {orgName}
          </div>
          <div style={{ fontFamily: subFF, fontSize: 8, color: theme.buttonText, opacity: 0.85, fontStyle: "italic", textAlign: "center" }}>
            {slogan}
          </div>
          <div style={{ fontSize: theme.smallSize - 2, color: theme.buttonText, opacity: 0.85, textAlign: "center" }}>
            Reg: {reg}
          </div>
        </div>
        <div style={{ flex: 1, padding: 14, background: "#fff" }}>
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 13 }}>Letter Heading</div>
          {lines}
        </div>
      </div>
    );
  }

  // standard-header
  return (
    <div style={{
      width: W, height: H, background: "#fff", borderRadius: 10, padding: 18,
      border: `1px solid ${theme.border}`, boxShadow: `0 8px 28px ${theme.icon}33`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        paddingBottom: 10, borderBottom: `3px solid ${theme.icon}`,
        flexDirection: theme.headAlign === "right" ? "row-reverse" : "row",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: theme.icon,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles className="h-5 w-5" style={{ color: theme.buttonText }} />
        </div>
        <div style={{ flex: 1, textAlign: theme.headAlign }}>
          <div style={{ fontFamily: headFF, fontWeight: 900, color: theme.icon, fontSize: 16 }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontSize: 10, fontStyle: "italic", color: theme.subColor }}>{slogan}</div>
          <div style={{ fontSize: theme.smallSize, color: "#666" }}>Reg No: {reg}</div>
        </div>
      </div>
      {lines}
    </div>
  );
}
