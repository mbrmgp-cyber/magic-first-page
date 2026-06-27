import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getMyOrg, updateOrgTheme } from "@/lib/org.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Palette, Square, Frame, Sparkles, MousePointerClick,
  Type, AlignLeft, BookOpen, Users, Briefcase, IdCard,
  AlignCenter, AlignRight, Quote,
} from "lucide-react";
import {
  DEFAULT_THEME, HEAD_FONTS, TEXT_ALIGNS, type TextAlign, type ThemeSettings, resolveTheme,
} from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/org/theme")({
  head: () => ({ meta: [{ title: "Theme & Design Customizer — MBR App" }] }),
  component: OrgThemePage,
});

type Field = { key: keyof ThemeSettings; en: string; te: string; icon: any };

const COLOR_FIELDS: Field[] = [
  { key: "bg", en: "Background", te: "బ్యాక్‌గ్రౌండ్ కలర్", icon: Palette },
  { key: "bigBox", en: "Big Box Fill", te: "బిగ్ బాక్స్ కలర్", icon: Square },
  { key: "miniBox", en: "Mini Box Fill", te: "మినీ బాక్స్ కలర్", icon: Square },
  { key: "border", en: "Border Lines", te: "బార్డర్ లైన్ కలర్", icon: Frame },
  { key: "icon", en: "Icons", te: "ఐకాన్ కలర్", icon: Sparkles },
  { key: "buttonBg", en: "Button Fill", te: "బటన్ కలర్", icon: MousePointerClick },
  { key: "buttonText", en: "Button Text", te: "బటన్ టెక్స్ట్", icon: Type },
];

const ALIGN_ICON: Record<TextAlign, any> = { left: AlignLeft, center: AlignCenter, right: AlignRight };

function ColorRow({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const Icon = f.icon;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{f.en}</p>
        <p className="text-[11px] text-zinc-500 truncate">{f.te}</p>
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border-zinc-700 text-white font-mono w-24 h-9"
        maxLength={7}
      />
    </div>
  );
}

function OrgThemePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const saveTheme = useServerFn(updateOrgTheme);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const org: any = orgQ.data?.org;

  const [t, setT] = useState<Required<ThemeSettings>>(DEFAULT_THEME);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (org) setT(resolveTheme(org));
  }, [org?.id]);

  function set<K extends keyof ThemeSettings>(k: K, v: any) {
    setT((p) => ({ ...p, [k]: v }));
  }

  const previewVars = useMemo<React.CSSProperties>(() => ({
    ["--tbg" as any]: t.bg,
    ["--tbox" as any]: t.box,
    ["--tbigbox" as any]: t.bigBox,
    ["--tminibox" as any]: t.miniBox,
    ["--tborder" as any]: t.border,
    ["--ticon" as any]: t.icon,
    ["--tbtn" as any]: t.buttonBg,
    ["--tbtnText" as any]: t.buttonText,
    ["--thead" as any]: t.headColor,
    ["--tsub" as any]: t.subColor,
    ["--tsmall" as any]: t.smallColor,
  }), [t]);

  async function save() {
    setBusy(true);
    try {
      await saveTheme({ data: {
        theme_color: t.icon,
        theme_font: t.headFont,
        theme_settings: t,
      }});
      await qc.invalidateQueries({ queryKey: ["my-org"] });
      await qc.invalidateQueries({ queryKey: ["my-membership"] });
      toast.success("Theme saved / థీమ్ సేవ్ అయింది");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const orgName = org?.name || "Chitvel Help Line Society";
  const orgSlogan = org?.slogan || "॥ మానవసేవే మాధవసేవ ॥";
  const orgReg = org?.gov_reg_number || "235/16";

  return (
    <div className="min-h-screen bg-black text-white pb-12" style={{ fontFamily: `${t.headFont}, system-ui, sans-serif` }}>
      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/dashboard" })} className="text-zinc-300">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-base md:text-lg font-bold text-center leading-tight">
            Theme &amp; Design<br className="md:hidden" />
            <span className="text-zinc-400 text-sm font-normal"> థీమ్ &amp; డిజైన్ కస్టమైజర్</span>
          </h1>
          <div className="w-12" />
        </div>

        {/* Live preview — mirrors dashboard layout */}
        <Card className="p-4 space-y-3 border bg-zinc-950 border-zinc-800">
          <p className="text-[11px] uppercase tracking-wide text-white/80">
            Live Preview / ప్రివ్యూ
          </p>
          <div className="rounded-xl p-3 space-y-3" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            {/* Headline card (mirrors org.dashboard) */}
            <div className="rounded-lg p-3 border" style={{ background: t.bigBox, borderColor: t.border, boxShadow: `0 0 24px ${t.icon}22` }}>
              <div className={`flex items-start gap-3 ${t.headAlign === "right" ? "flex-row-reverse" : ""}`}>
                <div className="w-12 h-12 shrink-0 rounded-full border flex items-center justify-center"
                  style={{ background: t.bg, borderColor: t.border, color: t.smallColor }}>
                  <Sparkles className="w-5 h-5" style={{ color: t.icon }} />
                </div>
                <div className="flex-1 min-w-0" style={{ textAlign: t.headAlign }}>
                  <h2 className="font-extrabold leading-tight tracking-tight text-base"
                    style={{ color: t.headColor, fontFamily: `${t.headFont}, system-ui, sans-serif` }}>
                    {orgName}
                  </h2>
                  <p className="italic mt-0.5 text-[12px]"
                    style={{ color: t.subColor, fontFamily: `${t.subFont}, system-ui, sans-serif` }}>
                    {orgSlogan}
                  </p>
                  <p className="mt-0.5" style={{ color: t.smallColor, fontSize: t.smallSize }}>
                    Reg No: <span style={{ color: t.icon }}>{orgReg}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Menu tiles */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { i: BookOpen, l: "Rules" },
                { i: Users, l: "Members" },
                { i: Briefcase, l: "Committee" },
              ].map((x) => (
                <div key={x.l} className="rounded-lg p-3 flex flex-col items-center gap-2 border"
                  style={{ background: t.miniBox, borderColor: t.border }}>
                  <div className="h-9 w-9 rounded-md flex items-center justify-center" style={{ background: `${t.icon}22` }}>
                    <x.i className="h-5 w-5" style={{ color: t.icon }} />
                  </div>
                  <p style={{ color: t.headColor }} className="text-xs font-semibold">{x.l}</p>
                </div>
              ))}
            </div>

            {/* ID card row */}
            <div className="rounded-lg p-3 flex items-center gap-3 border" style={{ background: t.miniBox, borderColor: t.border }}>
              <IdCard className="h-5 w-5" style={{ color: t.icon }} />
              <div className="flex-1">
                <p style={{ color: t.headColor }} className="text-sm font-semibold">Member ID Card</p>
                <p style={{ color: t.smallColor, fontSize: t.smallSize }}>Auto-themed for letter pads &amp; ID cards</p>
              </div>
              <button className="px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{ background: t.buttonBg, color: t.buttonText }}>
                Action
              </button>
            </div>
          </div>
        </Card>

        {/* Text alignment */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlignCenter className="h-4 w-4" style={{ color: t.icon }} />
            Header Text Alignment / టెక్స్ట్ అలైన్‌మెంట్
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_ALIGNS.map((a) => {
              const Icon = ALIGN_ICON[a.value];
              const active = t.headAlign === a.value;
              return (
                <button key={a.value} onClick={() => set("headAlign", a.value)}
                  className="rounded-lg border p-3 flex flex-col items-center gap-1 transition"
                  style={{
                    borderColor: active ? t.icon : "#27272a",
                    background: active ? `${t.icon}1a` : "transparent",
                  }}>
                  <Icon className="h-5 w-5" style={{ color: active ? t.icon : "#a1a1aa" }} />
                  <span className="text-xs font-semibold text-white">{a.en}</span>
                  <span className="text-[10px] text-zinc-400">{a.te}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Colors */}
        <Card className="bg-zinc-950 border-zinc-800 p-4" style={previewVars}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-white">
            <Palette className="h-4 w-4" style={{ color: t.icon }} /> Colors / రంగులు
          </div>
          <div className="divide-y divide-zinc-800">
            {COLOR_FIELDS.map((f) => (
              <ColorRow key={f.key} f={f} value={(t as any)[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
          </div>
        </Card>

        {/* Header style */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Type className="h-4 w-4" style={{ color: t.icon }} />
            Head Title Style &amp; Color / హెడ్ టైటిల్ స్టైల్
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">Color</span>
            <input type="color" value={t.headColor} onChange={(e) => set("headColor", e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700" />
            <Input value={t.headColor} onChange={(e) => set("headColor", e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white font-mono w-24 h-9" maxLength={7} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {HEAD_FONTS.map((f) => (
              <button key={f.value} onClick={() => set("headFont", f.value)}
                className="rounded-lg border p-3 text-left transition"
                style={{
                  borderColor: t.headFont === f.value ? t.icon : "#27272a",
                  background: t.headFont === f.value ? `${t.icon}1a` : "transparent",
                  fontFamily: `${f.value}, system-ui, sans-serif`,
                }}>
                <div className="text-sm font-semibold text-white">{f.label}</div>
                <div className="text-[11px] text-zinc-400">Sample Society Name</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Sub-title style */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Quote className="h-4 w-4" style={{ color: t.icon }} />
            Sub-Title Style &amp; Color / సబ్‌టైటిల్ స్టైల్ &amp; కలర్
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">Color</span>
            <input type="color" value={t.subColor} onChange={(e) => set("subColor", e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700" />
            <Input value={t.subColor} onChange={(e) => set("subColor", e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white font-mono w-24 h-9" maxLength={7} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {HEAD_FONTS.map((f) => (
              <button key={f.value} onClick={() => set("subFont", f.value)}
                className="rounded-lg border p-3 text-left transition"
                style={{
                  borderColor: t.subFont === f.value ? t.icon : "#27272a",
                  background: t.subFont === f.value ? `${t.icon}1a` : "transparent",
                  fontFamily: `${f.value}, system-ui, sans-serif`,
                }}>
                <div className="text-sm font-semibold text-white italic">{f.label}</div>
                <div className="text-[11px] italic" style={{ color: t.subColor }}>॥ మానవసేవే మాధవసేవ ॥</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Small text */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlignLeft className="h-4 w-4" style={{ color: t.icon }} />
            Small Letters Style &amp; Color / స్మాల్ లెటర్స్ స్టైల్
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">Color</span>
            <input type="color" value={t.smallColor} onChange={(e) => set("smallColor", e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700" />
            <Input value={t.smallColor} onChange={(e) => set("smallColor", e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white font-mono w-24 h-9" maxLength={7} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">Size</span>
            <input type="range" min={10} max={16} step={1} value={t.smallSize}
              onChange={(e) => set("smallSize", parseInt(e.target.value))}
              className="flex-1" style={{ accentColor: t.icon }} />
            <span className="font-mono text-xs text-zinc-300 w-10 text-right">{t.smallSize}px</span>
          </div>
          <p style={{ color: t.smallColor, fontSize: t.smallSize }} className="pt-1">
            Sample small description text — Reg No, captions, helper labels.
          </p>
        </Card>

        <Button onClick={save} disabled={busy}
          className="w-full font-semibold"
          style={{ background: t.buttonBg, color: t.buttonText, boxShadow: `0 0 24px ${t.buttonBg}66` }}>
          <Save className="h-4 w-4 mr-2" />
          {busy ? "Saving…" : "Save Theme / సేవ్ చేయండి"}
        </Button>
      </div>
    </div>
  );
}
