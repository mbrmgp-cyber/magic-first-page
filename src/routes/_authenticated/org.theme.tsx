import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getMyOrg, updateOrgTheme, updateOrgAdBanners } from "@/lib/org.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Palette, Square, Frame, Sparkles, MousePointerClick,
  Type, AlignLeft, BookOpen, Users, Briefcase, IdCard,
  AlignCenter, AlignRight, Quote, Image as ImageIcon, Upload, Trash2, Eye, EyeOff,
} from "lucide-react";
import {
  DEFAULT_THEME, HEAD_FONTS, TEXT_ALIGNS, type TextAlign, type ThemeSettings, resolveTheme,
} from "@/lib/theme";
import { localizeText, transliterateText, useI18n } from "@/lib/i18n";

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
  { key: "inputBg", en: "Input Box Fill", te: "టెక్స్ట్ బాక్స్ కలర్", icon: Square },
  { key: "inputText", en: "Input Text", te: "టెక్స్ట్ బాక్స్ అక్షరాల కలర్", icon: Type },
];

const ALIGN_ICON: Record<TextAlign, any> = { left: AlignLeft, center: AlignCenter, right: AlignRight };

function ColorRow({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const Icon = f.icon;
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{lt(f.en, f.te)}</p>
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
  const [nameEn, setNameEn] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (org) {
      setT(resolveTheme(org));
      setNameEn(org.name_en || "");
    }
  }, [org?.id]);

  function set<K extends keyof ThemeSettings>(k: K, v: any) {
    setT((p) => {
      const next = { ...p, [k]: v };
      if (k === "miniBox") next.box = v;
      return next;
    });
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
        name_en: nameEn.trim() || null,
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

  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const orgName = (lang === "en" && (nameEn.trim() || org?.name_en)) ? (nameEn.trim() || org?.name_en) : transliterateText(org?.name || "చిట్వేల్ హెల్ప్‌లైన్ సొసైటీ", lang);
  const orgSlogan = transliterateText(org?.slogan || "॥ మానవసేవే మాధవసేవ ॥", lang);
  const orgReg = org?.gov_reg_number || "235/16";

  return (
    <div className="min-h-screen bg-black text-white pb-12" style={{ fontFamily: `${t.headFont}, system-ui, sans-serif` }}>
      <div className="max-w-3xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/dashboard" })} className="text-zinc-300">
            <ArrowLeft className="h-4 w-4 mr-1" /> {lt("Back", "వెనక్కి")}
          </Button>
          <h1 className="text-base md:text-lg font-bold text-center leading-tight">
            {lt("Theme & Design Customizer", "థీమ్ & డిజైన్ కస్టమైజర్")}
          </h1>
          <div className="w-12" />
        </div>

        {/* Live preview — mirrors dashboard layout */}
        <Card className="p-4 space-y-3 border bg-zinc-950 border-zinc-800">
          <p className="text-[11px] uppercase tracking-wide text-white/80">
            {lt("Live Preview", "ప్రివ్యూ")}
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
                    {lt("Reg No", "నమోదు సంఖ్య")}: <span style={{ color: t.icon }}>{orgReg}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Menu tiles */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { i: BookOpen, l: lt("Rules", "నియమాలు") },
                { i: Users, l: lt("Members", "సభ్యులు") },
                { i: Briefcase, l: lt("Committee", "కమిటీ") },
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
                <p style={{ color: t.headColor }} className="text-sm font-semibold">{lt("Member ID Card", "సభ్యుల ID కార్డ్")}</p>
                <p style={{ color: t.smallColor, fontSize: t.smallSize }}>{lt("Auto-themed for letter pads & ID cards", "లెటర్‌ప్యాడ్‌లు & ID కార్డులకు ఆటో థీమ్")}</p>
              </div>
              <button className="px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{ background: t.buttonBg, color: t.buttonText }}>
                {lt("Action", "చర్య")}
              </button>
            </div>
          </div>
        </Card>

        {/* English organization name for language switch */}
        <Card className="p-4 space-y-2 border bg-zinc-950 border-zinc-800">
          <p className="text-sm font-semibold text-white">
            {lt("English Society Name", "సొసైటీ ఇంగ్లీష్ పేరు")}
          </p>
          <p className="text-[11px] text-zinc-400">
            {lt("This name appears in the header when English is selected. If empty, the society name is shown automatically.", "లాంగ్వేజ్ English అయినప్పుడు హెడర్‌లో ఈ పేరు కనిపిస్తుంది. ఖాళీగా ఉంచితే తెలుగు పేరు ఆటోగా చూపబడుతుంది.")}
          </p>
          <Input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Chitvel Helpline Society"
            className="bg-zinc-900 border-zinc-700 text-white"
            maxLength={200}
          />
        </Card>

        {/* Text alignment */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlignCenter className="h-4 w-4" style={{ color: t.icon }} />
            {lt("Header Text Alignment", "హెడర్ టెక్స్ట్ అలైన్‌మెంట్")}
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
                  <span className="text-xs font-semibold text-white">{lt(a.en, a.te)}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Colors */}
        <Card className="bg-zinc-950 border-zinc-800 p-4" style={previewVars}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-white">
            <Palette className="h-4 w-4" style={{ color: t.icon }} /> {lt("Colors", "రంగులు")}
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
            {lt("Head Title Style & Color", "హెడ్ టైటిల్ స్టైల్ & కలర్")}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">{lt("Color", "కలర్")}</span>
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
                <div className="text-[11px] text-zinc-400">{lt("Sample Society Name", "నమూనా సొసైటీ పేరు")}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Sub-title style */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Quote className="h-4 w-4" style={{ color: t.icon }} />
            {lt("Sub-Title Style & Color", "సబ్‌టైటిల్ స్టైల్ & కలర్")}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">{lt("Color", "కలర్")}</span>
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
                <div className="text-[11px] italic" style={{ color: t.subColor }}>{orgSlogan}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Small text */}
        <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlignLeft className="h-4 w-4" style={{ color: t.icon }} />
            {lt("Small Letters Style & Color", "స్మాల్ లెటర్స్ స్టైల్ & కలర్")}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">{lt("Color", "కలర్")}</span>
            <input type="color" value={t.smallColor} onChange={(e) => set("smallColor", e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700" />
            <Input value={t.smallColor} onChange={(e) => set("smallColor", e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white font-mono w-24 h-9" maxLength={7} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16">{lt("Size", "సైజ్")}</span>
            <input type="range" min={10} max={16} step={1} value={t.smallSize}
              onChange={(e) => set("smallSize", parseInt(e.target.value))}
              className="flex-1" style={{ accentColor: t.icon }} />
            <span className="font-mono text-xs text-zinc-300 w-10 text-right">{t.smallSize}px</span>
          </div>
          <p style={{ color: t.smallColor, fontSize: t.smallSize }} className="pt-1">
            {lt("Sample small description text — Reg No, captions, helper labels.", "నమూనా చిన్న వివరణ టెక్స్ట్ — నమోదు సంఖ్య, క్యాప్షన్‌లు, సహాయ లేబుల్‌లు.")}
          </p>
        </Card>

        {/* Advertisement Banners — shown at top of member dashboards */}
        <AdBannersCard orgId={org?.id} initial={(org as any)?.ad_banners as any} accent={t.icon} onSaved={() => qc.invalidateQueries({ queryKey: ["my-org"] })} />



        <Button onClick={save} disabled={busy}
          className="w-full font-semibold"
          style={{ background: t.buttonBg, color: t.buttonText, boxShadow: `0 0 24px ${t.buttonBg}66` }}>
          <Save className="h-4 w-4 mr-2" />
          {busy ? lt("Saving…", "సేవ్ అవుతోంది…") : lt("Save Theme", "థీమ్ సేవ్ చేయండి")}
        </Button>
      </div>
    </div>
  );
}

type AdBanner = { url: string; active?: boolean; label?: string | null };

function AdBannersCard({ orgId, initial, accent, onSaved }: { orgId?: string; initial?: AdBanner[]; accent: string; onSaved: () => void }) {
  const saveFn = useServerFn(updateOrgAdBanners);
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setBanners(Array.isArray(initial) ? initial : []);
  }, [orgId, JSON.stringify(initial)]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(banners.map(async (b) => {
        if (!b.url) return;
        if (/^https?:\/\//i.test(b.url) || b.url.startsWith("data:")) { map[b.url] = b.url; return; }
        const { data } = await supabase.storage.from("org-ads").createSignedUrl(b.url, 3600);
        if (data?.signedUrl) map[b.url] = data.signedUrl;
      }));
      if (!cancel) setPreviews(map);
    })();
    return () => { cancel = true; };
  }, [banners]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !orgId) return;
    setUploading(true);
    try {
      const next: AdBanner[] = [...banners];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("org-ads").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        next.push({ url: path, active: true, label: null });
      }
      setBanners(next);
      toast.success("Uploaded / అప్‌లోడ్ అయింది");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function toggle(i: number) {
    setBanners((prev) => prev.map((b, idx) => idx === i ? { ...b, active: !(b.active !== false) } : b));
  }

  async function remove(i: number) {
    const b = banners[i];
    if (b && !/^https?:\/\//i.test(b.url) && !b.url.startsWith("data:")) {
      await supabase.storage.from("org-ads").remove([b.url]).catch(() => {});
    }
    setBanners((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: { ad_banners: banners } });
      onSaved();
      toast.success("Banners saved / బ్యానర్‌లు సేవ్ అయ్యాయి");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ImageIcon className="h-4 w-4" style={{ color: accent }} />
        Member Dashboard Ads / సభ్యుల డాష్‌బోర్డ్ ప్రకటనలు
      </div>
      <p className="text-[11px] text-zinc-400">
        Upload banners to display at the top of every member's dashboard. Toggle any banner off to hide it. When no banners are active, the slot auto-hides.
      </p>
      <div className="rounded-lg border border-dashed p-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: `${accent}55`, background: `${accent}0f`, color: "#e4e4e7" }}>
        <p className="font-semibold text-white mb-0.5">
          Recommended Banner Size / సిఫార్సు చేయబడిన బ్యానర్ సైజ్
        </p>
        <p>
          <span className="font-mono text-white">1200 × 160 px</span> (ratio 15:2) —
          slim horizontal banner, max height <span className="font-mono">80px</span> on mobile.
        </p>
        <p className="text-zinc-400">
          మొబైల్ స్క్రీన్ కోసం సన్నని అడ్డం బ్యానర్ — వెడల్పు 1200px, పొడవు 160px. JPG/PNG, 500KB లోపు.
        </p>
      </div>

      <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 py-4 cursor-pointer hover:border-zinc-500 transition">
        <Upload className="h-4 w-4" style={{ color: accent }} />
        <span className="text-sm text-white">{uploading ? "Uploading…" : "Upload banner image(s)"}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading || !orgId} />
      </label>

      {banners.length === 0 ? (
        <p className="text-[12px] text-zinc-500 italic text-center py-2">No banners yet — dashboards will show none.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {banners.map((b, i) => {
            const active = b.active !== false;
            const src = previews[b.url] || "";
            return (
              <div key={`${b.url}-${i}`} className="rounded-lg overflow-hidden border relative"
                style={{ borderColor: active ? `${accent}66` : "#3f3f46", opacity: active ? 1 : 0.5 }}>
                {src ? (
                  <img src={src} alt="" className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-zinc-900 animate-pulse" />
                )}
                <div className="flex items-center justify-between p-1.5 bg-zinc-900/90">
                  <button type="button" onClick={() => toggle(i)}
                    className="inline-flex items-center gap-1 text-[11px] text-white/90 hover:text-white">
                    {active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {active ? "Active" : "Hidden"}
                  </button>
                  <button type="button" onClick={() => remove(i)}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={save} disabled={busy}
        className="w-full font-semibold"
        style={{ background: accent, color: "#fff" }}>
        <Save className="h-4 w-4 mr-2" />
        {busy ? "Saving…" : "Save Banners / బ్యానర్‌లు సేవ్ చేయండి"}
      </Button>
    </Card>
  );
}

