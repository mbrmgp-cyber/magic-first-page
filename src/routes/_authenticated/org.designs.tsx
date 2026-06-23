import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getMyOrg } from "@/lib/org.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, IdCard, FileText, Sparkles, Check, Lock, QrCode,
  Square, Download, User, Shield,
  Printer, Pencil, FileX, Receipt, Pencil as EditIcon, ChevronLeft,
  Palette, Type as TypeIcon, Upload,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import mbrLogo from "@/assets/mbr-logo.png.asset.json";
import { resolveTheme, type ThemeSettings, DEFAULT_THEME } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/org/designs")({
  head: () => ({ meta: [{ title: "Designs Studio — MBR App" }] }),
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
  | "vertical-band"
  | "portrait-vertical"
  | "keychain-mini";

type LetterLayout = "standard-header" | "watermark-centered" | "left-sidebar";
type ReceiptLayout = "classic" | "saffron-strip" | "minimal-line";

type Tpl<T extends string> = {
  id: T | `coming-${number}`;
  en: string;
  te: string;
  comingSoon?: boolean;
  featured?: boolean;
};

const ID_TEMPLATES: Tpl<IdLayout>[] = [
  { id: "official-saffron",     en: "Official Saffron", te: "అధికారిక సాఫ్రాన్", featured: true },
  { id: "landscape-corporate",  en: "Landscape Corporate",  te: "ల్యాండ్‌స్కేప్ కార్పొరేట్" },
  { id: "portrait-vertical",    en: "Vertical Portrait",    te: "నిలువు ఐడి కార్డ్", featured: true },
  { id: "keychain-mini",        en: "Keychain Mini",        te: "కీ చైన్ టైప్" },
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
];

const RECEIPT_TEMPLATES: Tpl<ReceiptLayout>[] = [
  { id: "classic",        en: "Classic Receipt",   te: "క్లాసిక్" },
  { id: "saffron-strip",  en: "Saffron Strip",     te: "సాఫ్రాన్ స్ట్రిప్" },
  { id: "minimal-line",   en: "Minimal Line",      te: "మినిమల్" },
];

export type MemberData = {
  name: string;
  memberId: string;
  fatherName: string;
  phone: string;
  bloodGroup: string;
  village: string;
  mandal: string;
  joinDate: string;
};

const DEFAULT_MEMBER: MemberData = {
  name: "Sample Member",
  memberId: "A/0001",
  fatherName: "Father Name",
  phone: "+91 90000 00000",
  bloodGroup: "O+",
  village: "Chitvel",
  mandal: "Chitvel",
  joinDate: "01/01/2024",
};

export type ReceiptData = {
  receiptNo: string;
  date: string;
  payerName: string;
  amount: string;
  purpose: string;
  mode: string;
};

const DEFAULT_RECEIPT: ReceiptData = {
  receiptNo: "R-0001",
  date: new Date().toISOString().slice(0, 10),
  payerName: "",
  amount: "",
  purpose: "Donation",
  mode: "Cash",
};

// Forced premium dark theme for this page (no neon blue, matches accounting modules)
const PAGE_BG = "#0a0a0a";
const PAGE_PANEL = "#111113";
const PAGE_BORDER = "#27272a";
const PAGE_HEAD = "#fafafa";
const PAGE_SUB = "#a1a1aa";

const FONT_OPTIONS = [
  { v: "Inter", label: "Inter (Modern)" },
  { v: "Poppins", label: "Poppins (Bold)" },
  { v: "Playfair Display", label: "Playfair (Serif)" },
  { v: "Merriweather", label: "Merriweather (Editorial)" },
  { v: "Roboto Slab", label: "Roboto Slab (Classic)" },
  { v: "Noto Sans", label: "Noto Sans (Clean)" },
  { v: "Georgia", label: "Georgia (Traditional)" },
  { v: "Courier New", label: "Courier (Mono)" },
];

function DesignsPage() {
  const navigate = useNavigate();
  const fetchOrg = useServerFn(getMyOrg);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const org: any = orgQ.data?.org;

  // Resolve org theme then overlay our premium-dark page chrome so background is never neon.
  const baseTheme = useMemo(() => resolveTheme(org), [org]);
  const theme = useMemo(() => ({
    ...baseTheme,
    bg: PAGE_BG,
    box: PAGE_PANEL,
    border: PAGE_BORDER,
    headColor: PAGE_HEAD,
    smallColor: PAGE_SUB,
    // keep accent (icon/buttonBg) from org theme; fall back to default orange.
    icon: baseTheme.icon || DEFAULT_THEME.icon,
    buttonBg: baseTheme.buttonBg || DEFAULT_THEME.buttonBg,
    buttonText: baseTheme.buttonText || DEFAULT_THEME.buttonText,
  }), [baseTheme]);

  // Module tab
  const [tab, setTab] = useState<"id" | "letter" | "receipt">("id");

  // ID Card state — gallery vs edit mode
  const [idPick, setIdPick] = useState<IdLayout | null>(null);
  const [member, setMember] = useState<MemberData>(DEFAULT_MEMBER);

  // Letter state
  const [letterPick, setLetterPick] = useState<LetterLayout>("standard-header");
  const [letterMode, setLetterMode] = useState<"rich" | "blank">("rich");
  const [letterTo, setLetterTo] = useState("");
  const [letterSubject, setLetterSubject] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().slice(0, 10));

  // Receipt state
  const [receiptPick, setReceiptPick] = useState<ReceiptLayout | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData>(DEFAULT_RECEIPT);
  const [receiptLogo, setReceiptLogo] = useState<string>(mbrLogo.url);

  // Design Customization (per-edit-session overrides)
  const [cardBg, setCardBg] = useState<string>("#ffffff");
  const [accentColor, setAccentColor] = useState<string>(theme.icon);
  const [fontFamily, setFontFamily] = useState<string>(theme.headFont);

  // customTheme applies the user's live styling on top of base theme
  const customTheme = useMemo(() => ({
    ...theme,
    icon: accentColor,
    buttonBg: accentColor,
    headFont: fontFamily,
    subFont: fontFamily,
  }), [theme, accentColor, fontFamily]);

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgSlogan = org?.slogan || "॥ మానవసేవే మాధవసేవ ॥";
  const orgReg = org?.gov_reg_number || "356/16";
  const orgAddress = org?.address || "";

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
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
    <div className="min-h-screen pb-16" style={{ background: PAGE_BG, color: PAGE_HEAD }}>
      <div className="max-w-5xl mx-auto p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/dashboard" })}
            style={{ color: PAGE_SUB }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <div className="text-center">
            <h1 className="text-base md:text-lg font-extrabold leading-tight"
              style={{ color: PAGE_HEAD, fontFamily: `${theme.headFont}, system-ui` }}>
              Designs Studio
            </h1>
            <p className="text-[11px]" style={{ color: PAGE_SUB }}>
              ID Card • Letter Pad • Receipt — Modular Templates
            </p>
          </div>
          <div className="w-20" />
        </div>

        {/* Module tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-11" style={{ background: PAGE_PANEL, border: `1px solid ${PAGE_BORDER}` }}>
            <TabsTrigger value="id" className="gap-2 text-xs sm:text-sm">
              <IdCard className="h-4 w-4" /> ID Card
            </TabsTrigger>
            <TabsTrigger value="letter" className="gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" /> Letter Pad
            </TabsTrigger>
            <TabsTrigger value="receipt" className="gap-2 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" /> Receipt Card
            </TabsTrigger>
          </TabsList>

          {/* ============= MODULE 1: ID CARD ============= */}
          <TabsContent value="id" className="mt-4 space-y-4">
            {idPick === null ? (
              <Section
                icon={<IdCard className="h-5 w-5" style={{ color: theme.icon }} />}
                title="Choose an ID Card Template"
                subtitle="ID కార్డ్ టెంప్లేట్‌ను ఎంచుకోండి — క్లిక్ చేస్తే ఎడిట్ మోడ్ తెరుచుకుంటుంది"
                theme={theme}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {ID_TEMPLATES.map((tpl) => {
                    const locked = !!tpl.comingSoon;
                    return (
                      <button
                        key={tpl.id}
                        disabled={locked}
                        onClick={() => !locked && setIdPick(tpl.id as IdLayout)}
                        className="group relative rounded-xl overflow-hidden border transition text-left hover:scale-[1.02]"
                        style={{
                          borderColor: PAGE_BORDER,
                          background: PAGE_PANEL,
                          opacity: locked ? 0.55 : 1,
                          cursor: locked ? "not-allowed" : "pointer",
                        }}
                      >
                        {tpl.featured && (
                          <div className="absolute top-1 left-1 z-10 text-[8px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "#138808", color: "#fff", letterSpacing: 0.5 }}>
                            POPULAR
                          </div>
                        )}
                        <div className="aspect-[1.586/1] w-full p-1.5" style={{ background: PAGE_BG }}>
                          <IdThumb layout={(locked ? "official-saffron" : tpl.id) as IdLayout} theme={theme} />
                        </div>
                        <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold truncate" style={{ color: PAGE_HEAD }}>{tpl.en}</p>
                            <p className="text-[10px] truncate" style={{ color: PAGE_SUB }}>{tpl.te}</p>
                          </div>
                          {locked ? (
                            <Lock className="h-3 w-3 shrink-0" style={{ color: PAGE_SUB }} />
                          ) : (
                            <EditIcon className="h-3 w-3 shrink-0" style={{ color: theme.icon }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>
            ) : (
              <Section
                icon={<EditIcon className="h-5 w-5" style={{ color: theme.icon }} />}
                title="Edit Mode — Live Preview"
                subtitle="ఎడిట్ చేసుకునే అవకాశం — వివరాలు మార్చండి, ప్రివ్యూ లైవ్‌గా అప్‌డేట్ అవుతుంది"
                theme={theme}
                right={
                  <Button size="sm" variant="ghost" onClick={() => setIdPick(null)} style={{ color: PAGE_SUB }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to gallery
                  </Button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form */}
                  <div className="space-y-3 rounded-lg p-3 border" style={{ background: PAGE_BG, borderColor: PAGE_BORDER }}>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Member Name / పేరు" value={member.name} onChange={(v) => setMember({ ...member, name: v })} />
                      <Field label="ID Number" value={member.memberId} onChange={(v) => setMember({ ...member, memberId: v })} />
                      <Field label="Father's Name / తండ్రి" value={member.fatherName} onChange={(v) => setMember({ ...member, fatherName: v })} />
                      <Field label="Phone / ఫోన్" value={member.phone} onChange={(v) => setMember({ ...member, phone: v })} />
                      <Field label="Blood Group" value={member.bloodGroup} onChange={(v) => setMember({ ...member, bloodGroup: v })} />
                      <Field label="Village / గ్రామం" value={member.village} onChange={(v) => setMember({ ...member, village: v })} />
                      <Field label="Mandal / మండలం" value={member.mandal} onChange={(v) => setMember({ ...member, mandal: v })} />
                      <Field label="Join Date" value={member.joinDate} onChange={(v) => setMember({ ...member, joinDate: v })} />
                    </div>

                    <StyleControls
                      cardBg={cardBg} setCardBg={setCardBg}
                      accent={accentColor} setAccent={setAccentColor}
                      font={fontFamily} setFont={setFontFamily}
                    />

                    <Button
                      onClick={() => toast.success("ID Card ready — printable PDF available shortly")}
                      className="w-full font-semibold h-10"
                      style={{ background: customTheme.buttonBg, color: customTheme.buttonText }}
                    >
                      <Download className="h-4 w-4 mr-2" /> Save & Download PDF
                    </Button>
                  </div>

                  {/* Live Preview */}
                  <div className="rounded-lg p-3 border flex items-center justify-center" style={{ background: PAGE_BG, borderColor: PAGE_BORDER, minHeight: 260 }}>
                    <IdCardPreview layout={idPick} theme={customTheme} orgName={orgName} slogan={orgSlogan} reg={orgReg} member={member} cardBg={cardBg} />
                  </div>
                </div>
              </Section>
            )}
          </TabsContent>

          {/* ============= MODULE 2: LETTER PAD ============= */}
          <TabsContent value="letter" className="mt-4 space-y-4">
            <Section
              icon={<FileText className="h-5 w-5" style={{ color: theme.icon }} />}
              title="Letter Pad Templates"
              subtitle="లెటర్ ప్యాడ్ టెంప్లేట్స్ — Rich Text మోడ్ లేదా Blank మోడ్"
              theme={theme}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LETTER_TEMPLATES.map((tpl) => {
                  const active = tpl.id === letterPick;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setLetterPick(tpl.id as LetterLayout)}
                      className="group relative rounded-xl overflow-hidden border transition text-left hover:scale-[1.02]"
                      style={{
                        borderColor: active ? theme.icon : PAGE_BORDER,
                        background: PAGE_PANEL,
                        boxShadow: active ? `0 0 0 2px ${theme.icon}` : undefined,
                      }}
                    >
                      <div className="aspect-[0.77/1] w-full p-1.5" style={{ background: PAGE_BG }}>
                        <LetterThumb layout={tpl.id as LetterLayout} theme={theme} />
                      </div>
                      <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: PAGE_HEAD }}>{tpl.en}</p>
                          <p className="text-[10px] truncate" style={{ color: PAGE_SUB }}>{tpl.te}</p>
                        </div>
                        {active && (
                          <div className="rounded-full p-0.5" style={{ background: theme.icon }}>
                            <Check className="h-3 w-3" style={{ color: theme.buttonText }} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Tabs value={letterMode} onValueChange={(v) => setLetterMode(v as "rich" | "blank")} className="w-full">
                <TabsList className="grid grid-cols-2 w-full" style={{ background: PAGE_BG, border: `1px solid ${PAGE_BORDER}` }}>
                  <TabsTrigger value="rich" className="gap-2"><Pencil className="h-3.5 w-3.5" /> Rich Text / టైప్</TabsTrigger>
                  <TabsTrigger value="blank" className="gap-2"><FileX className="h-3.5 w-3.5" /> Blank / ఖాళీ</TabsTrigger>
                </TabsList>

                <TabsContent value="rich" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]" style={{ color: PAGE_SUB }}>To / గ్రహీత</Label>
                      <Textarea rows={2} value={letterTo} onChange={(e) => setLetterTo(e.target.value)} placeholder="Recipient name & address" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]" style={{ color: PAGE_SUB }}>Date / తేదీ</Label>
                      <Input type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" style={{ color: PAGE_SUB }}>Subject / విషయం</Label>
                    <Input value={letterSubject} onChange={(e) => setLetterSubject(e.target.value)} placeholder="Regarding..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" style={{ color: PAGE_SUB }}>Body / లేఖ విషయం</Label>
                    <Textarea rows={8} value={letterBody} onChange={(e) => setLetterBody(e.target.value)} placeholder="Type your letter body here..." />
                  </div>
                </TabsContent>

                <TabsContent value="blank" className="mt-3">
                  <div className="rounded-lg border p-3 text-[12px]" style={{ background: PAGE_BG, borderColor: PAGE_BORDER, color: PAGE_SUB }}>
                    Blank template — header &amp; footer only. Download as PDF, print, and write content by hand.
                  </div>
                </TabsContent>
              </Tabs>

              <LivePreview title="Letter Pad Live Preview" theme={theme}>
                <LetterPreview layout={letterPick} theme={theme} orgName={orgName} slogan={orgSlogan} reg={orgReg} />
              </LivePreview>

              <Button onClick={printLetterhead} className="w-full font-semibold h-11"
                style={{ background: theme.buttonBg, color: theme.buttonText }}>
                <Printer className="h-4 w-4 mr-2" />
                {letterMode === "rich" ? "Preview & Download Letter PDF" : "Download Blank Letterhead PDF"}
              </Button>
            </Section>
          </TabsContent>

          {/* ============= MODULE 3: RECEIPT CARD ============= */}
          <TabsContent value="receipt" className="mt-4 space-y-4">
            {receiptPick === null ? (
              <Section
                icon={<Receipt className="h-5 w-5" style={{ color: theme.icon }} />}
                title="Choose a Receipt Template"
                subtitle="రసీదు టెంప్లేట్‌ను ఎంచుకోండి"
                theme={theme}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RECEIPT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setReceiptPick(tpl.id as ReceiptLayout)}
                      className="group relative rounded-xl overflow-hidden border transition text-left hover:scale-[1.02]"
                      style={{ borderColor: PAGE_BORDER, background: PAGE_PANEL, cursor: "pointer" }}
                    >
                      <div className="aspect-[1.6/1] w-full p-2" style={{ background: PAGE_BG }}>
                        <ReceiptThumb layout={tpl.id as ReceiptLayout} accent={theme.icon} />
                      </div>
                      <div className="px-2 py-1.5 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold" style={{ color: PAGE_HEAD }}>{tpl.en}</p>
                          <p className="text-[10px]" style={{ color: PAGE_SUB }}>{tpl.te}</p>
                        </div>
                        <EditIcon className="h-3 w-3" style={{ color: theme.icon }} />
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            ) : (
              <Section
                icon={<EditIcon className="h-5 w-5" style={{ color: theme.icon }} />}
                title="Edit Mode — Receipt"
                subtitle="వివరాలు నింపండి — ప్రివ్యూ లైవ్"
                theme={theme}
                right={
                  <Button size="sm" variant="ghost" onClick={() => setReceiptPick(null)} style={{ color: PAGE_SUB }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to gallery
                  </Button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 rounded-lg p-3 border" style={{ background: PAGE_BG, borderColor: PAGE_BORDER }}>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Receipt No" value={receipt.receiptNo} onChange={(v) => setReceipt({ ...receipt, receiptNo: v })} />
                      <Field label="Date" value={receipt.date} onChange={(v) => setReceipt({ ...receipt, date: v })} type="date" />
                      <Field label="Payer Name / పేరు" value={receipt.payerName} onChange={(v) => setReceipt({ ...receipt, payerName: v })} />
                      <Field label="Amount (₹)" value={receipt.amount} onChange={(v) => setReceipt({ ...receipt, amount: v })} />
                      <Field label="Purpose" value={receipt.purpose} onChange={(v) => setReceipt({ ...receipt, purpose: v })} />
                      <Field label="Mode" value={receipt.mode} onChange={(v) => setReceipt({ ...receipt, mode: v })} />
                    </div>

                    <LogoUploader logoUrl={receiptLogo} onChange={setReceiptLogo} />

                    <StyleControls
                      cardBg={cardBg} setCardBg={setCardBg}
                      accent={accentColor} setAccent={setAccentColor}
                      font={fontFamily} setFont={setFontFamily}
                    />

                    <Button
                      onClick={() => toast.success("Receipt ready — printable PDF available shortly")}
                      className="w-full font-semibold h-10"
                      style={{ background: customTheme.buttonBg, color: customTheme.buttonText }}
                    >
                      <Download className="h-4 w-4 mr-2" /> Save & Download Receipt
                    </Button>
                  </div>
                  <div className="rounded-lg p-3 border flex items-center justify-center" style={{ background: PAGE_BG, borderColor: PAGE_BORDER, minHeight: 260 }}>
                    <ReceiptPreview layout={receiptPick} theme={customTheme} orgName={orgName} slogan={orgSlogan} reg={orgReg} data={receipt} cardBg={cardBg} logoUrl={receiptLogo} />
                  </div>
                </div>
              </Section>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- Layout helpers ---------------- */

function Section({
  icon, title, subtitle, theme, children, right,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  theme: Required<ThemeSettings>; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <Card className="p-4 space-y-4 border" style={{ background: PAGE_PANEL, borderColor: PAGE_BORDER }}>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-sm md:text-base font-bold" style={{ color: PAGE_HEAD }}>{title}</h2>
            <p className="text-[11px]" style={{ color: PAGE_SUB }}>{subtitle}</p>
          </div>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

function LivePreview({
  title, theme, children,
}: { title: string; theme: Required<ThemeSettings>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: PAGE_BG, borderColor: PAGE_BORDER }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: theme.icon }} />
        <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: PAGE_HEAD }}>
          {title} / లైవ్ ప్రివ్యూ
        </p>
      </div>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]" style={{ color: PAGE_SUB }}>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 text-[12px]"
        style={{ background: PAGE_PANEL, borderColor: PAGE_BORDER, color: PAGE_HEAD }} />
    </div>
  );
}

/* ---------------- Design Customization Panel ---------------- */

function StyleControls({
  cardBg, setCardBg, accent, setAccent, font, setFont,
}: {
  cardBg: string; setCardBg: (v: string) => void;
  accent: string; setAccent: (v: string) => void;
  font: string; setFont: (v: string) => void;
}) {
  return (
    <div className="rounded-lg p-3 border space-y-3" style={{ background: PAGE_PANEL, borderColor: PAGE_BORDER }}>
      <div className="flex items-center gap-2">
        <Palette className="h-3.5 w-3.5" style={{ color: accent }} />
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: PAGE_HEAD }}>
          Design Customization / డిజైన్
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]" style={{ color: PAGE_SUB }}>Card Background</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={cardBg} onChange={(e) => setCardBg(e.target.value)}
              className="h-9 w-12 rounded border cursor-pointer" style={{ borderColor: PAGE_BORDER, background: "transparent" }} />
            <Input value={cardBg} onChange={(e) => setCardBg(e.target.value)}
              className="h-9 text-[11px] flex-1"
              style={{ background: PAGE_BG, borderColor: PAGE_BORDER, color: PAGE_HEAD }} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]" style={{ color: PAGE_SUB }}>Accent / Strip Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-12 rounded border cursor-pointer" style={{ borderColor: PAGE_BORDER, background: "transparent" }} />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)}
              className="h-9 text-[11px] flex-1"
              style={{ background: PAGE_BG, borderColor: PAGE_BORDER, color: PAGE_HEAD }} />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] flex items-center gap-1" style={{ color: PAGE_SUB }}>
          <TypeIcon className="h-3 w-3" /> Font Style / ఫాంట్
        </Label>
        <Select value={font} onValueChange={setFont}>
          <SelectTrigger className="h-9 text-[12px]" style={{ background: PAGE_BG, borderColor: PAGE_BORDER, color: PAGE_HEAD }}>
            <SelectValue placeholder="Choose font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.v} value={f.v} style={{ fontFamily: f.v }}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LogoUploader({ logoUrl, onChange }: { logoUrl: string; onChange: (url: string) => void }) {
  return (
    <div className="rounded-lg p-3 border flex items-center gap-3" style={{ background: PAGE_PANEL, borderColor: PAGE_BORDER }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, border: `1px solid ${PAGE_BORDER}` }}>
        {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: PAGE_HEAD }}>Society Logo / లోగో</p>
        <p className="text-[10px]" style={{ color: PAGE_SUB }}>Shown in the receipt header</p>
      </div>
      <label className="inline-flex items-center gap-1 px-3 h-8 rounded-md text-[11px] cursor-pointer border"
        style={{ background: PAGE_BG, borderColor: PAGE_BORDER, color: PAGE_HEAD }}>
        <Upload className="h-3 w-3" /> Upload
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = URL.createObjectURL(f); onChange(url);
        }} />
      </label>
    </div>
  );
}


function IdThumb({ layout, theme }: { layout: IdLayout; theme: Required<ThemeSettings> }) {
  const c = theme.icon, br = theme.border, bg = "#ffffff";
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
  // official-saffron
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
        </div>
      </div>
      <div style={{ background: "#138808", height: 10 }} />
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

function ReceiptThumb({ layout, accent }: { layout: ReceiptLayout; accent: string }) {
  const common: React.CSSProperties = {
    width: "100%", height: "100%", borderRadius: 4, background: "#fff",
    overflow: "hidden", padding: 5, display: "flex", flexDirection: "column", gap: 3,
  };
  if (layout === "saffron-strip") {
    return (
      <div style={{ ...common, padding: 0 }}>
        <div style={{ background: accent, height: 14, padding: "2px 6px" }}>
          <div style={{ height: 3, width: "60%", background: "#fff" }} />
        </div>
        <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 2, background: "#ddd", width: `${85 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (layout === "minimal-line") {
    return (
      <div style={common}>
        <div style={{ height: 3, background: "#111", width: "60%" }} />
        <div style={{ height: 1, background: "#111" }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 2, background: "#ddd", width: `${80 - i * 8}%` }} />
        ))}
      </div>
    );
  }
  // classic
  return (
    <div style={{ ...common, border: `2px solid ${accent}` }}>
      <div style={{ textAlign: "center", height: 3, background: accent, width: "70%", margin: "0 auto" }} />
      <div style={{ height: 2, background: "#888", width: "40%", margin: "2px auto" }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 2, background: "#ddd", width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}

/* ---------------- Live Previews ---------------- */

function IdCardPreview({
  layout, theme, orgName, slogan, reg, member, cardBg = "#ffffff",
}: {
  layout: IdLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string; member: MemberData;
  cardBg?: string;
}) {
  if (layout === "official-saffron") {
    return <OfficialSaffronPreview theme={theme} orgName={orgName} slogan={slogan} reg={reg} member={member} cardBg={cardBg} />;
  }
  if (layout === "keychain-mini") {
    // Keychain badge — compact, no back side
    return <KeychainPreview theme={theme} orgName={orgName} member={member} cardBg={cardBg} />;
  }
  const front = <IdCardFront layout={layout} theme={theme} orgName={orgName} slogan={slogan} reg={reg} member={member} cardBg={cardBg} />;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PAGE_SUB, letterSpacing: 1 }}>FRONT / ముందు</div>
        {front}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PAGE_SUB, letterSpacing: 1 }}>BACK / వెనుక</div>
        <StandardBackPreview theme={theme} memberName={member.name} cardBg={cardBg} />
      </div>
    </div>
  );
}

function KeychainPreview({
  theme, orgName, member, cardBg,
}: {
  theme: Required<ThemeSettings>; orgName: string; member: MemberData; cardBg: string;
}) {
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `3px solid ${theme.icon}`, background: "transparent" }} />
      <div style={{ width: 2, height: 14, background: theme.icon }} />
      <div style={{
        width: 220, height: 130, background: cardBg, borderRadius: 12, overflow: "hidden",
        border: `2px solid ${theme.icon}`, boxShadow: `0 8px 28px ${theme.icon}55`,
        display: "flex", flexDirection: "column", fontFamily: headFF,
      }}>
        <div style={{ background: theme.icon, padding: "4px 8px", color: theme.buttonText, fontSize: 10, fontWeight: 900, textAlign: "center", letterSpacing: 0.5 }}>
          {orgName}
        </div>
        <div style={{ flex: 1, display: "flex", padding: 8, gap: 8 }}>
          <div style={{ width: 56, height: 70, borderRadius: 6, background: "#e5e5e5",
            border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User style={{ width: 26, height: 26, color: "#999" }} />
          </div>
          <div style={{ flex: 1, fontSize: 10, color: "#111" }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>{member.name}</div>
            <div style={{ color: "#555", marginTop: 2 }}>ID: {member.memberId}</div>
            <div style={{ color: "#555" }}>📞 {member.phone}</div>
            <div style={{ display: "inline-block", marginTop: 4, background: "#C8102E", color: "#fff",
              fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3 }}>🩸 {member.bloodGroup}</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: PAGE_SUB, letterSpacing: 1 }}>KEYCHAIN / కీ చైన్</div>
    </div>
  );
}

function IdCardFront({
  layout, theme, orgName, slogan, reg, member,
}: {
  layout: IdLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string; member: MemberData;
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
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</div>
        <div style={{ fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: theme.subColor }}>{slogan}</div>
        <div style={{ fontSize: theme.smallSize - 2, color: theme.buttonText, opacity: 0.85 }}>Reg: {reg}</div>
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
        <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>{member.name}</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: {member.memberId}</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>Phone: {member.phone}</div>
        <div style={{ color: "#555", fontSize: theme.smallSize }}>Village: {member.village}</div>
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
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 13 }}>{member.name}</div>
          <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: {member.memberId}</div>
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
          <div style={{ fontFamily: headFF, color: theme.buttonText, fontSize: 10, fontWeight: 800, textAlign: "center" }}>{orgName}</div>
          <div style={{ fontFamily: subFF, color: theme.subColor, fontSize: 8, fontStyle: "italic", textAlign: "center" }}>{slogan}</div>
        </div>
        <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 60, height: 72, borderRadius: 6, background: "#e5e5e5",
            border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Square className="h-6 w-6" style={{ color: "#999" }} />
          </div>
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 12 }}>{member.name}</div>
          <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: {member.memberId}</div>
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
          background: "#fff", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column",
        }}>
          <div style={{ textAlign: "center", fontFamily: headFF, fontWeight: 900, color: theme.icon, fontSize: 14 }}>{orgName}</div>
          <div style={{ textAlign: "center", fontFamily: subFF, fontSize: 9, fontStyle: "italic", color: theme.subColor }}>{slogan}</div>
          <div style={{ flex: 1, display: "flex", gap: 10, padding: 8 }}>
            <div style={{ width: 62, height: 78, borderRadius: 4, background: "#e5e5e5",
              border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Square className="h-6 w-6" style={{ color: "#999" }} />
            </div>
            <div style={{ flex: 1, fontFamily: headFF }}>
              <div style={{ fontWeight: 800, color: "#111", fontSize: 12 }}>{member.name}</div>
              <div style={{ color: "#555", fontSize: theme.smallSize }}>ID: {member.memberId}</div>
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
            <div style={{ fontWeight: 800, fontSize: 13 }}>{member.name}</div>
            <div style={{ opacity: 0.8 }}>ID: {member.memberId}</div>
            <div style={{ opacity: 0.8 }}>Phone: {member.phone}</div>
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
              <div style={{ fontWeight: 800, fontSize: 13 }}>{member.name}</div>
              <div>ID: {member.memberId}</div>
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
          <div style={{ background: theme.icon, color: theme.buttonText, padding: "6px 10px", textAlign: align }}>
            <div style={{ fontFamily: headFF, fontWeight: 900, fontSize: 12 }}>{orgName}</div>
            <div style={{ fontFamily: subFF, fontSize: 8, fontStyle: "italic", opacity: 0.9 }}>{slogan}</div>
          </div>
          <div style={{ flex: 1, padding: 10, fontSize: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>{member.name}</div>
            <div style={{ color: "#555" }}>ID: {member.memberId}</div>
            <div style={{ color: "#555" }}>Phone: {member.phone}</div>
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
            <div style={{ fontWeight: 800, fontSize: 13 }}>{member.name}</div>
            <div>ID: {member.memberId}</div>
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
              <div style={{ fontWeight: 800, fontSize: 13 }}>{member.name}</div>
              <div>ID: {member.memberId}</div>
              <div>Phone: {member.phone}</div>
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
      boxShadow: `0 8px 28px ${accent}33`, fontFamily: headFF, display: "flex", flexDirection: "column",
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
          <div style={{ fontFamily: headFF, fontSize: 9, color: theme.buttonText, fontWeight: 700, textAlign: "center" }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontSize: 8, color: theme.buttonText, opacity: 0.85, fontStyle: "italic", textAlign: "center" }}>{slogan}</div>
          <div style={{ fontSize: theme.smallSize - 2, color: theme.buttonText, opacity: 0.85, textAlign: "center" }}>Reg: {reg}</div>
        </div>
        <div style={{ flex: 1, padding: 14, background: "#fff" }}>
          <div style={{ fontFamily: headFF, fontWeight: 800, color: "#111", fontSize: 13 }}>Letter Heading</div>
          {lines}
        </div>
      </div>
    );
  }

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

/* ---------------- Receipt Preview ---------------- */

function ReceiptPreview({
  layout, theme, orgName, slogan, reg, data,
}: {
  layout: ReceiptLayout; theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string; data: ReceiptData;
}) {
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const accent = theme.icon;
  const W = 360, H = 220;

  const rows = (
    <div style={{ fontSize: 11, color: "#222", lineHeight: 1.7 }}>
      <div><b>Receipt No:</b> {data.receiptNo} &nbsp;&nbsp; <b>Date:</b> {data.date}</div>
      <div><b>Received From:</b> {data.payerName || "—"}</div>
      <div><b>Amount:</b> ₹ {data.amount || "0.00"}</div>
      <div><b>Purpose:</b> {data.purpose}</div>
      <div><b>Mode:</b> {data.mode}</div>
    </div>
  );

  if (layout === "minimal-line") {
    return (
      <div style={{
        width: W, minHeight: H, background: "#fff", borderRadius: 8, padding: 16,
        border: `1px solid ${theme.border}`, fontFamily: headFF,
        boxShadow: `0 8px 28px ${accent}22`,
      }}>
        <div style={{ fontWeight: 900, color: "#111", fontSize: 16 }}>{orgName}</div>
        <div style={{ borderTop: "1px solid #111", marginTop: 6, paddingTop: 8 }}>{rows}</div>
        <div style={{ marginTop: 14, textAlign: "right", fontSize: 10, color: "#555" }}>Authorized Signature</div>
      </div>
    );
  }

  if (layout === "saffron-strip") {
    return (
      <div style={{
        width: W, minHeight: H, background: "#fff", borderRadius: 8, overflow: "hidden",
        border: `1px solid ${theme.border}`, fontFamily: headFF,
        boxShadow: `0 8px 28px ${accent}22`,
      }}>
        <div style={{ background: accent, color: "#fff", padding: "8px 14px" }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{orgName}</div>
          <div style={{ fontSize: 10, opacity: 0.9 }}>{slogan} · Reg: {reg}</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontWeight: 800, color: accent, marginBottom: 6 }}>OFFICIAL RECEIPT</div>
          {rows}
        </div>
      </div>
    );
  }

  // classic
  return (
    <div style={{
      width: W, minHeight: H, background: "#fff", borderRadius: 8, padding: 14,
      border: `2px solid ${accent}`, fontFamily: headFF, boxShadow: `0 8px 28px ${accent}22`,
    }}>
      <div style={{ textAlign: "center", borderBottom: `1px solid ${accent}`, paddingBottom: 6, marginBottom: 8 }}>
        <div style={{ fontWeight: 900, color: accent, fontSize: 16 }}>{orgName}</div>
        <div style={{ fontSize: 10, color: "#666" }}>{slogan} · Reg: {reg}</div>
        <div style={{ fontWeight: 800, color: "#111", marginTop: 4 }}>RECEIPT / రసీదు</div>
      </div>
      {rows}
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555" }}>
        <span>Payer Signature</span>
        <span>Authorized Signature</span>
      </div>
    </div>
  );
}

/* ---------------- Official Saffron live preview ---------------- */

function OfficialSaffronPreview({
  theme, orgName, slogan, reg, member,
}: {
  theme: Required<ThemeSettings>;
  orgName: string; slogan: string; reg: string; member: MemberData;
}) {
  const accent = theme.icon || "#FF9933";
  const green = "#138808";
  const navy = "#000080";
  const headFF = `${theme.headFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const subFF = `${theme.subFont}, "Noto Sans Telugu", system-ui, sans-serif`;
  const align = theme.headAlign;
  const W = 340, H = 214;

  const Front = (
    <div style={{
      width: W, height: H, background: "#fff", color: "#111",
      borderRadius: 8, overflow: "hidden", border: `1px solid ${navy}`,
      boxShadow: `0 8px 28px ${accent}33`, fontFamily: headFF, display: "flex", flexDirection: "column",
    }}>
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
          <div style={{ fontWeight: 900, fontSize: 12, color: navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</div>
          <div style={{ fontFamily: subFF, fontSize: 8, fontStyle: "italic", color: navy, fontWeight: 700 }}>{slogan}</div>
          <div style={{ fontSize: 7, color: navy, opacity: 0.85 }}>Reg: {reg}</div>
        </div>
        <div style={{ fontSize: 8, background: navy, color: "#fff", padding: "2px 6px", borderRadius: 3, fontWeight: 800, flexShrink: 0 }}>సభ్యుడు</div>
      </div>

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
          }}>● యాక్టివ్ సభ్యుడు</div>
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: 9, lineHeight: 1.3, color: "#222", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 8, color: "#fff", background: navy, fontWeight: 700, padding: "1px 5px", borderRadius: 2, display: "inline-block", alignSelf: "flex-start" }}>
            ID: {member.memberId}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: navy, lineHeight: 1.2 }}>{member.name}</div>
          <div><span style={{ color: "#666" }}>తండ్రి:</span> <span style={{ fontWeight: 600 }}>{member.fatherName}</span></div>
          <div><span style={{ color: "#666" }}>గ్రామం:</span> <span style={{ fontWeight: 600 }}>{member.village}</span></div>
          <div><span style={{ color: "#666" }}>మండలం:</span> <span style={{ fontWeight: 600 }}>{member.mandal}</span></div>
          <div><span style={{ color: "#666" }}>ఫోన్:</span> <span style={{ fontWeight: 600 }}>{member.phone}</span></div>
          <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
            <div style={{ fontSize: 8 }}><span style={{ color: "#666" }}>చేరిన: </span><span style={{ fontWeight: 600 }}>{member.joinDate}</span></div>
            <div style={{ fontSize: 8, background: "#C8102E", color: "#fff", padding: "1px 5px", borderRadius: 2, fontWeight: 800 }}>🩸 {member.bloodGroup}</div>
          </div>
        </div>
      </div>

      <div style={{
        background: green, height: 34, padding: "2px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
      }}>
        <div style={{ width: 28, height: 28, background: "#fff", borderRadius: 2, padding: 2, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrCode style={{ width: 22, height: 22, color: "#111" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, color: "#fff", textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>✉ chitvelhelplinesociety@gmail.com</div>
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

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PAGE_SUB, letterSpacing: 1 }}>FRONT / ముందు</div>
        {Front}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: PAGE_SUB, letterSpacing: 1 }}>BACK / వెనుక</div>
        <StandardBackPreview theme={theme} memberName={member.name} />
      </div>
    </div>
  );
}
