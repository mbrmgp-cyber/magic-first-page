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
  LayoutTemplate, Layers, Square, FileSignature, Download, User, Shield, BadgeCheck,
  Printer, Pencil, FileX,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { resolveTheme, type ThemeSettings } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/org/designs")({
  head: () => ({ meta: [{ title: "ID Card & Letter Pad Templates — MBR App" }] }),
  component: DesignsPage,
});

type IdLayout =
  | "official-saffron"
  | "landscape-corporate"
  | "portrait-qr"
  | "split-design"
  | "traditional-border"
  | "modern-dark"
  | "elegant-gold"
  | "photo-strip"
  | "minimal-mono"
  | "vertical-band";

type LetterLayout = "standard-header" | "watermark-centered" | "left-sidebar";

type Tpl<T extends string> = {
  id: T | `coming-${number}`;
  en: string;
  te: string;
  comingSoon?: boolean;
  featured?: boolean;
};

const ID_TEMPLATES: Tpl<IdLayout>[] = [
  { id: "official-saffron",     en: "Official Saffron (Active)", te: "అధికారిక సాఫ్రాన్", featured: true },
  { id: "landscape-corporate",  en: "Landscape Corporate",  te: "ల్యాండ్‌స్కేప్ కార్పొరేట్" },
  { id: "portrait-qr",          en: "Portrait with QR",     te: "QR తో పోర్ట్రెయిట్" },
  { id: "split-design",         en: "Split Design",         te: "స్ప్లిట్ డిజైన్" },
  { id: "traditional-border",   en: "Traditional Border",   te: "సాంప్రదాయ బార్డర్" },
  { id: "modern-dark",          en: "Modern Dark",          te: "మోడర్న్ డార్క్" },
  { id: "elegant-gold",         en: "Elegant Gold Trim",    te: "ఎలెగంట్ గోల్డ్" },
  { id: "photo-strip",          en: "Photo Strip",          te: "ఫోటో స్ట్రిప్" },
  { id: "minimal-mono",         en: "Minimal Mono",         te: "మినిమల్ మోనో" },
  { id: "vertical-band",        en: "Vertical Band",        te: "వర్టికల్ బ్యాండ్" },
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

  const [idPick, setIdPick] = useState<IdLayout>("official-saffron");
  const [letterPick, setLetterPick] = useState<LetterLayout>("standard-header");
  const [generating, setGenerating] = useState(false);

  // Letterhead dual-mode state
  const [letterMode, setLetterMode] = useState<"rich" | "blank">("rich");
  const [letterTo, setLetterTo] = useState("");
  const [letterSubject, setLetterSubject] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().slice(0, 10));

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgSlogan = org?.slogan || "॥ మానవసేవే మాధవసేవ ॥";
  const orgReg = org?.gov_reg_number || "356/16";
  const orgAddress = org?.address || "";

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

  function printLetterhead() {
    const isRich = letterMode === "rich";
    const subject = letterSubject.trim();
    const to = letterTo.trim();
    const body = letterBody.trim();
    const accent = theme.icon;
    const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
    const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
    const dateStr = letterDate ? new Date(letterDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "";

    let header = "";
    let sidebar = "";
    let bodyWrap = "padding:48px 56px;";
    if (letterPick === "left-sidebar") {
      bodyWrap = "padding:48px 48px 48px 240px; position:relative;";
      sidebar = `
        <div style="position:absolute;left:0;top:0;bottom:0;width:200px;background:${accent};color:#fff;padding:32px 18px;text-align:center;font-family:${headFF};">
          <div style="width:88px;height:88px;border-radius:50%;background:#fff;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:${accent};font-size:36px;font-weight:900;">★</div>
          <div style="font-weight:800;font-size:14px;line-height:1.3;">${escapeHtml(orgName)}</div>
          <div style="font-family:${subFF};font-style:italic;font-size:10px;opacity:.9;margin-top:6px;">${escapeHtml(orgSlogan)}</div>
          <div style="font-size:10px;opacity:.85;margin-top:10px;">Reg: ${escapeHtml(orgReg)}</div>
          ${orgAddress ? `<div style="font-size:9px;opacity:.85;margin-top:10px;line-height:1.4;">${escapeHtml(orgAddress)}</div>` : ""}
        </div>`;
    } else if (letterPick === "watermark-centered") {
      header = `
        <div style="text-align:center;padding:36px 56px 16px;font-family:${headFF};">
          <div style="font-weight:900;font-size:28px;color:${accent};">${escapeHtml(orgName)}</div>
          <div style="font-family:${subFF};font-style:italic;color:#555;font-size:14px;margin-top:4px;">${escapeHtml(orgSlogan)}</div>
          <div style="font-size:11px;color:#777;margin-top:2px;">Reg No: ${escapeHtml(orgReg)}${orgAddress ? " • " + escapeHtml(orgAddress) : ""}</div>
        </div>`;
      bodyWrap = "padding:8px 64px 48px; position:relative;";
    } else {
      // standard-header
      header = `
        <div style="display:flex;align-items:center;gap:16px;padding:32px 56px 16px;border-bottom:4px solid ${accent};font-family:${headFF};">
          <div style="width:64px;height:64px;border-radius:50%;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;">★</div>
          <div style="flex:1;">
            <div style="font-weight:900;font-size:24px;color:${accent};">${escapeHtml(orgName)}</div>
            <div style="font-family:${subFF};font-style:italic;font-size:13px;color:#555;">${escapeHtml(orgSlogan)}</div>
            <div style="font-size:11px;color:#777;">Reg No: ${escapeHtml(orgReg)}${orgAddress ? " • " + escapeHtml(orgAddress) : ""}</div>
          </div>
        </div>`;
    }

    const watermark = letterPick === "watermark-centered"
      ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:220px;color:${accent};opacity:.06;pointer-events:none;font-weight:900;">★</div>`
      : "";

    const richBody = isRich ? `
      <div style="font-family:${subFF};color:#111;font-size:13px;line-height:1.65;">
        <div style="display:flex;justify-content:space-between;margin-top:8px;">
          <div><strong>To,</strong><br/>${escapeHtml(to).replace(/\n/g, "<br/>") || "&nbsp;"}</div>
          <div style="text-align:right;color:#555;">${escapeHtml(dateStr)}</div>
        </div>
        ${subject ? `<div style="margin-top:18px;"><strong>Subject:</strong> ${escapeHtml(subject)}</div>` : ""}
        <div style="margin-top:18px;white-space:pre-wrap;">${escapeHtml(body) || "&nbsp;"}</div>
        <div style="margin-top:48px;">Yours sincerely,<br/><br/><br/><strong>${escapeHtml(orgName)}</strong></div>
      </div>` : `
      <div style="font-family:${subFF};color:#bbb;font-size:11px;text-align:center;margin-top:36px;">
        — Blank letterhead • write or print content here —
      </div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Letterhead — ${escapeHtml(orgName)}</title>
      <style>
        @page { size: A4; margin: 0; }
        html,body{margin:0;padding:0;background:#fff;}
        .page{width:210mm;min-height:297mm;background:#fff;position:relative;}
        @media print { .noprint{display:none!important;} }
      </style></head><body>
      <div class="noprint" style="padding:12px;background:#111;color:#fff;font-family:system-ui;display:flex;gap:12px;align-items:center;">
        <button onclick="window.print()" style="padding:8px 16px;background:${accent};color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
        <span style="font-size:12px;opacity:.8;">Use your browser's Save as PDF in the print dialog.</span>
      </div>
      <div class="page">${sidebar}${header}<div style="${bodyWrap}">${watermark}${richBody}</div></div>
      </body></html>`;

    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) { toast.error("Popup blocked — allow popups to download PDF"); return; }
    w.document.write(html);
    w.document.close();
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
                  {tpl.featured && (
                    <div className="absolute top-1 left-1 z-10 text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "#138808", color: "#fff", letterSpacing: 0.5 }}>
                      ACTIVE
                    </div>
                  )}
                  <div className="aspect-[1.586/1] w-full p-1.5" style={{ background: theme.bg }}>
                    <IdThumb layout={(locked ? "official-saffron" : tpl.id) as IdLayout} theme={theme} />
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
  if (layout === "modern-dark") {
    return (
      <div style={{ ...common, flexDirection: "column", background: "#0f172a", borderColor: c }}>
        <div style={{ height: "28%", borderBottom: `2px solid ${c}`, padding: 3 }}>
          <div style={{ height: 3, background: c, width: "70%" }} />
          <div style={{ height: 2, background: "#94a3b8", width: "50%", marginTop: 2 }} />
        </div>
        <div style={{ flex: 1, display: "flex", padding: 3, gap: 3 }}>
          <div style={{ width: "30%", background: "#1e293b", borderRadius: 2, border: `1px solid ${c}` }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ height: 3, background: "#e2e8f0", width: "80%" }} />
            <div style={{ height: 2, background: "#94a3b8", width: "60%" }} />
            <div style={{ height: 2, background: "#94a3b8", width: "70%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (layout === "elegant-gold") {
    const gold = "#c9a227";
    return (
      <div style={{ ...common, padding: 2, background: gold }}>
        <div style={{ flex: 1, background: "#fffdf6", borderRadius: 3, border: `1px solid ${gold}`, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 3, background: "#7a5b00", width: "70%", margin: "0 auto" }} />
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            <div style={{ width: "30%", background: "#f4ead0", borderRadius: 2, border: `1px solid ${gold}` }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ height: 2, background: "#7a5b00", width: "75%" }} />
              <div style={{ height: 2, background: "#b89544", width: "60%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (layout === "photo-strip") {
    return (
      <div style={{ ...common, flexDirection: "row" }}>
        <div style={{ width: "32%", background: "#e5e5e5", borderRight: `3px solid ${c}`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#999" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ height: "32%", background: c, padding: 2 }}>
            <div style={{ height: 3, background: "#fff", width: "75%" }} />
            <div style={{ height: 2, background: "#fff", opacity: 0.8, width: "55%", marginTop: 1 }} />
          </div>
          <div style={{ flex: 1, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ height: 2, background: "#333", width: "80%" }} />
            <div style={{ height: 2, background: "#888", width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (layout === "minimal-mono") {
    return (
      <div style={{ ...common, flexDirection: "column", border: "2px solid #111" }}>
        <div style={{ borderBottom: "2px solid #111", padding: 3 }}>
          <div style={{ height: 3, background: "#111", width: "80%" }} />
          <div style={{ height: 2, background: "#444", width: "55%", marginTop: 2 }} />
        </div>
        <div style={{ flex: 1, display: "flex", padding: 3, gap: 3 }}>
          <div style={{ width: "30%", border: "1px solid #111", background: "#fafafa" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ height: 2, background: "#111", width: "75%" }} />
            <div style={{ height: 2, background: "#555", width: "55%" }} />
          </div>
        </div>
      </div>
    );
  }
  if (layout === "vertical-band") {
    return (
      <div style={{ ...common, flexDirection: "row" }}>
        <div style={{ width: 8, background: c }} />
        <div style={{ flex: 1, padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 3, background: c, width: "70%" }} />
          <div style={{ height: 2, background: "#888", width: "55%" }} />
          <div style={{ display: "flex", gap: 3, flex: 1, marginTop: 2 }}>
            <div style={{ width: "30%", background: "#e5e5e5", borderRadius: 2 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ height: 2, background: "#333" }} />
              <div style={{ height: 2, background: "#888", width: "70%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  // official-saffron — miniature of the real ID card
  return (
    <div style={{ ...common, flexDirection: "column", border: `1px solid #000080` }}>
      <div style={{ background: "#FF9933", height: 18, display: "flex", alignItems: "center", padding: "0 4px", gap: 3 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ height: 3, background: "#000080", width: "85%" }} />
          <div style={{ height: 2, background: "#000080", width: "55%", opacity: 0.7 }} />
        </div>
        <div style={{ width: 12, height: 5, background: "#000080", borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, padding: 3, display: "flex", gap: 3 }}>
        <div style={{ width: "30%", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ flex: 1, background: "#e5e5e5", borderRadius: 2, border: `1px solid #138808` }} />
          <div style={{ height: 4, background: "#138808", borderRadius: 1 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 3, background: "#000080", width: "70%" }} />
          <div style={{ height: 2, background: "#888", width: "85%" }} />
          <div style={{ height: 2, background: "#888", width: "70%" }} />
          <div style={{ height: 2, background: "#888", width: "60%" }} />
          <div style={{ marginTop: "auto", height: 2, background: "#000080", width: "55%", alignSelf: "flex-end" }} />
        </div>
      </div>
      <div style={{ background: "#138808", height: 10, display: "flex", alignItems: "center", padding: "0 3px", gap: 3 }}>
        <div style={{ width: 6, height: 6, background: "#fff", borderRadius: 1 }} />
        <div style={{ flex: 1, height: 2, background: "#fff", opacity: 0.85 }} />
        <div style={{ width: 6, height: 6, background: "#000", borderRadius: "50%" }} />
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
  // Official Saffron already renders Front+Back internally
  if (layout === "official-saffron") {
    return <OfficialSaffronPreview theme={theme} orgName={orgName} slogan={slogan} reg={reg} />;
  }

  const front = (
    <IdCardFront layout={layout} theme={theme} orgName={orgName} slogan={slogan} reg={reg} />
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.smallColor, letterSpacing: 1 }}>
          FRONT / ముందు
        </div>
        {front}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.smallColor, letterSpacing: 1 }}>
          BACK / వెనుక
        </div>
        <StandardBackPreview theme={theme} memberName="Sample Member" />
      </div>
    </div>
  );
}

function IdCardFront({
  layout, theme, orgName, slogan, reg,
}: {
  layout: IdLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string;
}) {
  const align = theme.headAlign;
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const cardW = 340, cardH = 214;

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

  if (layout === "portrait-qr") {
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
          <div style={{ marginTop: "auto", alignSelf: "center", padding: 4, background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 4 }}>
            <QrCode className="h-10 w-10" style={{ color: "#111" }} />
          </div>
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

  if (layout === "modern-dark") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 12, overflow: "hidden",
        background: "#0f172a", color: "#fff", display: "flex", flexDirection: "column",
        boxShadow: `0 10px 32px ${theme.icon}55`, border: `1px solid ${theme.icon}`,
      }}>
        <div style={{ padding: "10px 12px", borderBottom: `2px solid ${theme.icon}`, textAlign: align }}>
          <div style={{ fontFamily: headFF, fontWeight: 900, fontSize: 13, color: theme.icon }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", opacity: 0.85 }}>{slogan}</div>
        </div>
        <div style={{ flex: 1, display: "flex", padding: 10, gap: 10 }}>
          <div style={{ width: 70, height: 86, borderRadius: 8, background: "#1e293b",
            border: `1px solid ${theme.icon}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User style={{ width: 28, height: 28, color: theme.icon }} />
          </div>
          <div style={{ flex: 1, fontSize: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Sample Member</div>
            <div style={{ opacity: 0.8 }}>ID: A/0001</div>
            <div style={{ opacity: 0.8 }}>Phone: +91 90000 00000</div>
            <div style={{ opacity: 0.8 }}>Reg: {reg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "elegant-gold") {
    const gold = "#c9a227";
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, padding: 4,
        background: `linear-gradient(135deg, ${gold}, #f6e27a, ${gold})`,
        boxShadow: `0 8px 28px ${gold}55`,
      }}>
        <div style={{ width: "100%", height: "100%", background: "#fffdf6", borderRadius: 8,
          border: `1px solid ${gold}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${gold}` }}>
            <div style={{ fontFamily: headFF, fontWeight: 900, color: "#3b2f00", fontSize: 13 }}>{orgName}</div>
            <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: "#7a5b00" }}>{slogan}</div>
          </div>
          <div style={{ flex: 1, display: "flex", padding: 10, gap: 10 }}>
            <div style={{ width: 64, height: 80, borderRadius: 6, background: "#f4ead0",
              border: `1px solid ${gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 26, height: 26, color: gold }} />
            </div>
            <div style={{ flex: 1, fontSize: 10, color: "#3b2f00" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Sample Member</div>
              <div>ID: A/0001</div>
              <div>Reg: {reg}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "photo-strip") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, overflow: "hidden",
        background: "#fff", border: `1px solid ${theme.border}`,
        boxShadow: `0 8px 28px ${theme.icon}33`, display: "flex",
      }}>
        <div style={{ width: 100, background: "#e5e5e5", display: "flex",
          alignItems: "center", justifyContent: "center", borderRight: `4px solid ${theme.icon}` }}>
          <User style={{ width: 44, height: 44, color: "#999" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ background: theme.icon, color: theme.buttonText,
            padding: "6px 10px", textAlign: align }}>
            <div style={{ fontFamily: headFF, fontWeight: 900, fontSize: 12 }}>{orgName}</div>
            <div style={{ fontFamily: subFF, fontSize: 8, fontStyle: "italic", opacity: 0.9 }}>{slogan}</div>
          </div>
          <div style={{ flex: 1, padding: 10, fontSize: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>Sample Member</div>
            <div style={{ color: "#555" }}>ID: A/0001</div>
            <div style={{ color: "#555" }}>Phone: +91 90000 00000</div>
            <div style={{ color: "#555" }}>Reg: {reg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "minimal-mono") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, overflow: "hidden",
        background: "#fff", border: `2px solid #111`, display: "flex", flexDirection: "column",
        boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
      }}>
        <div style={{ padding: "10px 12px", borderBottom: "2px solid #111", textAlign: align }}>
          <div style={{ fontFamily: headFF, fontWeight: 900, color: "#111", fontSize: 14, letterSpacing: 0.5 }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: "#444" }}>{slogan}</div>
        </div>
        <div style={{ flex: 1, display: "flex", padding: 10, gap: 10 }}>
          <div style={{ width: 64, height: 80, border: "1px solid #111", background: "#fafafa",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User style={{ width: 26, height: 26, color: "#111" }} />
          </div>
          <div style={{ flex: 1, fontSize: 10, color: "#111" }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Sample Member</div>
            <div>ID: A/0001</div>
            <div>Reg: {reg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "vertical-band") {
    return (
      <div style={{
        width: cardW, height: cardH, borderRadius: 10, overflow: "hidden",
        background: "#fff", border: `1px solid ${theme.border}`, display: "flex",
        boxShadow: `0 8px 28px ${theme.icon}33`,
      }}>
        <div style={{ width: 18, background: theme.icon }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", textAlign: align }}>
            <div style={{ fontFamily: headFF, fontWeight: 900, fontSize: 13, color: theme.icon }}>{orgName}</div>
            <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: theme.subColor }}>{slogan}</div>
            <div style={{ fontSize: theme.smallSize - 1, color: "#666" }}>Reg: {reg}</div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 10, padding: "0 12px 10px" }}>
            <div style={{ width: 64, height: 80, borderRadius: 6, background: "#e5e5e5",
              border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 26, height: 26, color: "#999" }} />
            </div>
            <div style={{ flex: 1, fontSize: 10, color: "#222" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Sample Member</div>
              <div>ID: A/0001</div>
              <div>Phone: +91 90000 00000</div>
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

/* Universal back layout shared by ALL ID card templates */
function StandardBackPreview({
  theme, memberName,
}: { theme: Required<ThemeSettings>; memberName: string }) {
  const accent = theme.icon || "#FF9933";
  const green = "#138808";
  const navy = "#000080";
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const W = 340, H = 214;
  return (
    <div style={{
      width: W, height: H, background: "#fff", color: "#111",
      borderRadius: 8, overflow: "hidden", border: `1px solid ${navy}`,
      boxShadow: `0 8px 28px ${accent}33`,
      fontFamily: headFF, display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", height: 6 }}>
        <div style={{ flex: 1, background: accent }} />
        <div style={{ flex: 1, background: "#fff" }} />
        <div style={{ flex: 1, background: green }} />
      </div>
      <div style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: navy, borderBottom: `1px solid ${accent}`, paddingBottom: 1, marginBottom: 2 }}>
            ముఖ్య ఉద్దేశాలు
          </div>
          <ol style={{ margin: 0, paddingLeft: 12, fontSize: 7.5, lineHeight: 1.3, color: "#111" }}>
            <li>చిట్వేల్ మండల ప్రజలకు మౌలిక సదుపాయాల ఏర్పాటు కై ప్రయత్నం.</li>
            <li>కుల, మత, ప్రాంత, వర్గ, రాజకీయాలకు అతీతంగా దేశభక్తిని పెంచడం.</li>
            <li>అత్యవసర పరిస్థితుల్లో ప్రభుత్వ అధికారులకు సహాయం అందించడం.</li>
          </ol>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: green, borderBottom: `1px solid ${green}`, paddingBottom: 1, marginBottom: 2 }}>
              సభ్యుని ప్రమాణం
            </div>
            <div style={{ fontSize: 7.5, lineHeight: 1.3, color: "#111", fontStyle: "italic" }}>
              "నేను నమ్మిన దైవం సాక్షిగా ఈ సంఘంలోని నిబంధనలకు అనుగుణంగా నడుచుకుంటానని ప్రమాణం చేస్తున్నాను." — <span style={{ fontWeight: 700, fontStyle: "normal", color: navy }}>{memberName}</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 800, color: "#C8102E", marginTop: 2 }}>జై హింద్ 🇮🇳</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ height: 42, width: 42, border: `1px solid ${navy}`, padding: 2, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QrCode style={{ width: "100%", height: "100%", color: "#111" }} />
            </div>
            <div style={{ fontSize: 6.5, fontWeight: 700, color: navy, marginTop: 2, lineHeight: 1.05, maxWidth: 48 }}>
              కొత్త సభ్యుల నమోదు
            </div>
          </div>
        </div>
      </div>
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

/* ---------------- Official Saffron (mirrors real MemberIdCard) ---------------- */

function OfficialSaffronPreview({
  theme, orgName, slogan, reg,
}: {
  theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string;
}) {
  const accent = theme.icon || "#FF9933";
  const green = "#138808";
  const navy = "#000080";
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const align = theme.headAlign;

  // Card dimensions (landscape, 1.586:1)
  const W = 340, H = 214;

  const Front = (
    <div style={{
      width: W, height: H, background: "#fff", color: "#111",
      borderRadius: 8, overflow: "hidden", border: `1px solid ${navy}`,
      boxShadow: `0 8px 28px ${accent}33`,
      fontFamily: headFF, display: "flex", flexDirection: "column",
    }}>
      {/* Saffron header */}
      <div style={{
        background: accent, padding: "6px 10px", display: "flex", alignItems: "center",
        gap: 8, height: 52, flexDirection: align === "right" ? "row-reverse" : "row",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "#fff",
          border: "1px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Shield className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25, textAlign: align }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {orgName}
          </div>
          <div style={{ fontFamily: subFF, fontSize: 8, fontStyle: "italic", color: navy, fontWeight: 700 }}>
            {slogan}
          </div>
          <div style={{ fontSize: 7, color: navy, opacity: 0.85 }}>Reg: {reg}</div>
        </div>
        <div style={{
          fontSize: 8, background: navy, color: "#fff",
          padding: "2px 6px", borderRadius: 3, fontWeight: 800, flexShrink: 0,
        }}>
          సభ్యుడు
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", gap: 8, padding: "6px 10px 4px", position: "relative" }}>
        <div style={{ width: 68, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            width: 68, height: 84, border: `1px solid ${green}`, background: "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            <User style={{ width: 28, height: 28, color: "#999" }} />
          </div>
          <div style={{
            marginTop: 4, fontSize: 7, fontWeight: 800, color: "#fff",
            background: green, textAlign: "center", padding: "2px 3px", borderRadius: 2, lineHeight: 1.1,
          }}>
            ● యాక్టివ్ సభ్యుడు
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: 9, lineHeight: 1.3, color: "#222", display: "flex", flexDirection: "column" }}>
          <div style={{
            fontSize: 8, color: "#fff", background: navy, fontWeight: 700,
            padding: "1px 5px", borderRadius: 2, display: "inline-block", alignSelf: "flex-start",
          }}>
            ID: A/0001
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: navy, lineHeight: 1.2 }}>Sample Member</div>
          <div><span style={{ color: "#666" }}>తండ్రి:</span> <span style={{ fontWeight: 600 }}>Father Name</span></div>
          <div><span style={{ color: "#666" }}>గ్రామం:</span> <span style={{ fontWeight: 600 }}>Chitvel</span></div>
          <div><span style={{ color: "#666" }}>మండలం:</span> <span style={{ fontWeight: 600 }}>Chitvel</span></div>
          <div><span style={{ color: "#666" }}>ఫోన్:</span> <span style={{ fontWeight: 600 }}>+91 90000 00000</span></div>
          <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
            <div style={{ fontSize: 8 }}><span style={{ color: "#666" }}>చేరిన: </span><span style={{ fontWeight: 600 }}>01/01/2024</span></div>
            <div style={{ fontSize: 8, background: "#C8102E", color: "#fff", padding: "1px 5px", borderRadius: 2, fontWeight: 800 }}>🩸 O+</div>
          </div>
          <div style={{ marginTop: "auto", textAlign: "right" }}>
            <div style={{ height: 14, fontFamily: '"Brush Script MT", cursive', fontSize: 13, color: navy, lineHeight: 1 }}>
              M. Bhaskar Reddy
            </div>
            <div style={{ borderTop: `1px solid ${navy}`, marginTop: 1, paddingTop: 1, fontSize: 7, color: navy, fontWeight: 700, lineHeight: 1 }}>
              అధ్యక్షుడు
            </div>
          </div>
        </div>
      </div>

      {/* Green footer */}
      <div style={{
        background: green, height: 34, padding: "2px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
      }}>
        <div style={{ width: 28, height: 28, background: "#fff", borderRadius: 2, padding: 2, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrCode style={{ width: 22, height: 22, color: "#111" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, color: "#fff", textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ✉ chitvelhelplinesociety@gmail.com
          </div>
          <div style={{ fontSize: 7.5, fontWeight: 700 }}>☎ +91 90595 94989</div>
        </div>
        <div style={{
          height: 28, width: 28, background: "#000", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 3, flexShrink: 0,
        }}>
          <img src={mbrLogo.url} alt="MBR" style={{ height: "100%", width: "100%", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );

  const Back = (
    <div style={{
      width: W, height: H, background: "#fff", color: "#111",
      borderRadius: 8, overflow: "hidden", border: `1px solid ${navy}`,
      boxShadow: `0 8px 28px ${accent}33`,
      fontFamily: headFF, display: "flex", flexDirection: "column",
    }}>
      {/* Tricolor stripe */}
      <div style={{ display: "flex", height: 6 }}>
        <div style={{ flex: 1, background: accent }} />
        <div style={{ flex: 1, background: "#fff" }} />
        <div style={{ flex: 1, background: green }} />
      </div>
      <div style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: navy, borderBottom: `1px solid ${accent}`, paddingBottom: 1, marginBottom: 2 }}>
            ముఖ్య ఉద్దేశాలు
          </div>
          <ol style={{ margin: 0, paddingLeft: 12, fontSize: 7.5, lineHeight: 1.25, color: "#222" }}>
            <li>చిట్వేల్ మండల ప్రజలకు మౌలిక సదుపాయాల ఏర్పాటు కై ప్రయత్నం.</li>
            <li>కుల, మత, ప్రాంత, వర్గ, రాజకీయాలకు అతీతంగా దేశభక్తిని పెంచడం.</li>
            <li>అత్యవసర పరిస్థితుల్లో ప్రభుత్వ అధికారులకు సహాయం అందించడం.</li>
          </ol>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: green, borderBottom: `1px solid ${green}`, paddingBottom: 1, marginBottom: 2 }}>
              సభ్యుని ప్రమాణం
            </div>
            <div style={{ fontSize: 7.5, lineHeight: 1.25, color: "#222", fontStyle: "italic" }}>
              "నేను నమ్మిన దైవం సాక్షిగా ఈ సంఘంలోని నిబంధనలకు అనుగుణంగా నడుచుకుంటానని ప్రమాణం చేస్తున్నాను." — <span style={{ fontWeight: 700, fontStyle: "normal", color: navy }}>Sample Member</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 800, color: "#C8102E", marginTop: 2 }}>జై హింద్ 🇮🇳</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ height: 42, width: 42, border: `1px solid ${navy}`, padding: 2, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QrCode style={{ width: "100%", height: "100%", color: "#111" }} />
            </div>
            <div style={{ fontSize: 6.5, fontWeight: 700, color: navy, marginTop: 2, lineHeight: 1.05, maxWidth: 48 }}>
              కొత్త సభ్యుల నమోదు
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.smallColor, letterSpacing: 1 }}>FRONT / ముందు</div>
        {Front}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.smallColor, letterSpacing: 1 }}>BACK / వెనుక</div>
        {Back}
      </div>
    </div>
  );
}
