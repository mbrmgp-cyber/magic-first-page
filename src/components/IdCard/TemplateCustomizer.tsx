import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { IdCardDesign, ElementKey, CustomText, CustomImage } from "@/lib/idCardTemplates";
import { ELEMENT_LABELS, FONT_OPTIONS } from "@/lib/idCardTemplates";
import { localizeText, useI18n } from "@/lib/i18n";

type Props = {
  design: IdCardDesign;
  onChange: (next: IdCardDesign) => void;
};

const PANEL_BORDER = "var(--design-border, var(--mbr-theme-border, #27272a))";
const PANEL_BG = "var(--design-big-box, var(--mbr-theme-big-card, #111113))";
const MINI_BG = "var(--design-mini-box, var(--mbr-theme-mini-card, #0a0a0a))";
const TEXT_HEAD = "var(--design-heading, var(--mbr-theme-heading, #ffffff))";
const TEXT_SUB = "var(--design-muted, var(--mbr-theme-muted, #a1a1aa))";
const INPUT_BG = "var(--design-input-bg, var(--mbr-theme-input-bg, #0a0a0a))";
const INPUT_TEXT = "var(--design-input-text, var(--mbr-theme-input-text, #ffffff))";

const makeLt = (lang: string) => (en: string, te: string) => localizeText({ en, te }, lang);

export function TemplateCustomizer({ design, onChange }: Props) {
  const { lang } = useI18n();
  const lt = makeLt(lang);
  function setGlobal<K extends keyof IdCardDesign["global"]>(key: K, value: IdCardDesign["global"][K]) {
    onChange({ ...design, global: { ...design.global, [key]: value } });
  }
  function setElement(key: ElementKey, patch: Partial<IdCardDesign["elements"][ElementKey]>) {
    onChange({ ...design, elements: { ...design.elements, [key]: { ...design.elements[key], ...patch } } });
  }

  const keys = Object.keys(design.elements) as ElementKey[];
  const frontKeys = keys.filter((k) => ELEMENT_LABELS[k].side === "front");
  // MBR Small Logo is a permanent forced branding element — not user-toggleable
  const backKeys = keys.filter((k) => ELEMENT_LABELS[k].side === "back" && k !== "mbrLogo");

  return (
    <div className="space-y-4">
      {/* GLOBAL */}
      <Section title={lt("Card Background / Border", "బార్డర్ & బ్యాగ్రౌండ్")}>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label={lt("Background", "బ్యాక్‌గ్రౌండ్")} value={design.global.backgroundColor} onChange={(v) => setGlobal("backgroundColor", v)} />
          <ColorField label={lt("Border Color", "బార్డర్ రంగు")} value={design.global.borderColor} onChange={(v) => setGlobal("borderColor", v)} />
          <ColorField label={lt("Accent / Header", "హెడర్ రంగు")} value={design.global.accentColor} onChange={(v) => setGlobal("accentColor", v)} />
          <NumberField label={lt("Border Width (px)", "బార్డర్ వెడల్పు (px)")} value={design.global.borderWidth} min={0} max={8} onChange={(v) => setGlobal("borderWidth", v)} />
          <NumberField label={lt("Corner Radius", "కార్నర్ రేడియస్")} value={design.global.cornerRadius} min={0} max={32} onChange={(v) => setGlobal("cornerRadius", v)} />
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>{lt("Border Style", "బార్డర్ స్టైల్")}</Label>
            <Select value={design.global.borderStyle} onValueChange={(v) => setGlobal("borderStyle", v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">{lt("Solid", "సాలిడ్")}</SelectItem>
                <SelectItem value="dashed">{lt("Dashed", "డాష్డ్")}</SelectItem>
                <SelectItem value="none">{lt("None", "ఏదీ లేదు")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>{lt("Header Align", "హెడర్ అలైన్")}</Label>
            <Select value={design.global.headerAlign || "left"} onValueChange={(v) => setGlobal("headerAlign", v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">← {lt("Left", "ఎడమ")}</SelectItem>
                <SelectItem value="center">↔ {lt("Center", "మధ్య")}</SelectItem>
                <SelectItem value="right">→ {lt("Right", "కుడి")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Horizontal alignment sliders for Logo and Header Badge */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>
              {lt("Logo X-Offset", "లోగో అలైన్")} — {(design.global.headerLogoOffsetX ?? 0)}px
            </Label>
            <input
              type="range" min={-40} max={40} step={1}
              value={design.global.headerLogoOffsetX ?? 0}
              onChange={(e) => setGlobal("headerLogoOffsetX", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>
              {lt("Active Badge X-Offset", "బ్యాడ్జ్ అలైన్")} — {(design.global.headerBadgeOffsetX ?? 0)}px
            </Label>
            <input
              type="range" min={-40} max={40} step={1}
              value={design.global.headerBadgeOffsetX ?? 0}
              onChange={(e) => setGlobal("headerBadgeOffsetX", Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>




        {/* Independent Footer & ID Badge controls */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <ColorField
            label={lt("Contact Footer BG", "ఫుటర్ రంగు")}
            value={design.global.contactFooterBg || design.global.accentColor}
            onChange={(v) => setGlobal("contactFooterBg", v)}
          />
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>
              {lt("Footer Text Size", "ఫుటర్ సైజ్")} — {(design.global.contactFooterTextSize ?? 8)}px
            </Label>
            <input
              type="range" min={6} max={14} step={1}
              value={design.global.contactFooterTextSize ?? 8}
              onChange={(e) => setGlobal("contactFooterTextSize", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <ColorField
            label={lt("ID Badge BG (A/0001)", "ఐడీ రంగు")}
            value={design.global.memberCodeBadgeBg || design.global.accentColor}
            onChange={(v) => setGlobal("memberCodeBadgeBg", v)}
          />
        </div>

        {/* Background image uploads — front & back */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <BgImageField
            label={lt("Front BG Image", "ముందు బ్యాగ్రౌండ్")}
            value={design.global.frontBgImage}
            onChange={(v) => setGlobal("frontBgImage", v as any)}
          />
          <BgImageField
            label={lt("Back BG Image", "వెనుక బ్యాగ్రౌండ్")}
            value={design.global.backBgImage}
            onChange={(v) => setGlobal("backBgImage", v as any)}
          />
        </div>
      </Section>

      {/* FRONT ELEMENTS */}
      <Section title={lt("Front Side — Lines & Elements", "ఫ్రంట్ లైన్స్")}>
        {frontKeys.map((k) => <ElementRow key={k} k={k} design={design} setElement={setElement} />)}
      </Section>

      {/* BACK MATTER TEXT */}
      <Section title={lt("Back Side Text", "వెనుక మేటర్ (ఎడిట్ చేయండి)")}>
        <Textarea
          value={design.backMatter || ""}
          onChange={(e) => onChange({ ...design, backMatter: e.target.value })}
          rows={5}
          placeholder="వెనుక సైడ్ కు రాయాల్సిన మేటర్..."
          className="text-xs"
        />
        <div className="space-y-1">
          <Label className="text-[11px]" style={{ color: TEXT_SUB }}>
            {lt("Line Height", "లైన్ గ్యాప్")} — {(design.elements.backMatter.lineHeight ?? 1.4).toFixed(2)}
          </Label>
          <input
            type="range" min={1} max={2.2} step={0.05}
            value={design.elements.backMatter.lineHeight ?? 1.4}
            onChange={(e) => setElement("backMatter", { lineHeight: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </Section>

      {/* OATH / ప్రమాణం */}
      <Section title={lt("Oath (Hidden by default — use Show/Hidden toggle below)", "ప్రమాణం (కింద ఉన్న బటన్‌తో చూపించండి/దాచండి)")}>
        <Textarea
          value={design.oathText || ""}
          onChange={(e) => onChange({ ...design, oathText: e.target.value })}
          rows={4}
          placeholder="ఈ సంస్థ ఆశయం కోసం ... ప్రమాణం చేస్తున్నాను — {name}"
          className="text-xs"
        />
        <p className="text-[10px]" style={{ color: TEXT_SUB }}>
          {lt("Tip", "సూచన")}: <code>{"{name}"}</code> {lt("auto-replaces with member's name", "సభ్యుడి పేరుతో ఆటోమేటిక్‌గా మారుతుంది")}.
        </p>
      </Section>


      {/* BACK ELEMENTS */}
      <Section title={lt("Back Side — Lines & Elements", "బ్యాక్ లైన్స్")}>
        {backKeys.map((k) => <ElementRow key={k} k={k} design={design} setElement={setElement} />)}
      </Section>

      {/* CUSTOM ITEMS — add new text / photos, delete them anytime */}
      <CustomItemsSection design={design} onChange={onChange} lt={lt} />
    </div>
  );
}

function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function CustomItemsSection({ design, onChange, lt }: { design: IdCardDesign; onChange: (next: IdCardDesign) => void; lt: (en: string, te: string) => string }) {
  const texts = design.customTexts || [];
  const images = design.customImages || [];

  function setTexts(next: CustomText[]) { onChange({ ...design, customTexts: next }); }
  function setImages(next: CustomImage[]) { onChange({ ...design, customImages: next }); }
  function patchText(id: string, patch: Partial<CustomText>) { setTexts(texts.map((t) => (t.id === id ? { ...t, ...patch } : t))); }
  function patchImage(id: string, patch: Partial<CustomImage>) { setImages(images.map((i) => (i.id === id ? { ...i, ...patch } : i))); }

  function addText(side: "front" | "back") {
    setTexts([...texts, { id: newId(), side, text: lt("New text", "కొత్త టెక్స్ట్"), x: 50, y: side === "front" ? 55 : 50, size: 9, color: "#111111", weight: 600, font: "Noto Sans" }]);
  }
  function addImage(side: "front" | "back", file: File) {
    const reader = new FileReader();
    reader.onload = () => setImages([...images, { id: newId(), side, url: String(reader.result), x: 50, y: 50, size: 40 }]);
    reader.readAsDataURL(file);
  }

  const sideSelect = (value: "front" | "back", onPick: (v: "front" | "back") => void) => (
    <Select value={value} onValueChange={(v) => onPick(v as "front" | "back")}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="front">{lt("Front", "ముందు")}</SelectItem>
        <SelectItem value="back">{lt("Back", "వెనుక")}</SelectItem>
      </SelectContent>
    </Select>
  );

  const posSliders = (x: number, y: number, onPos: (x: number, y: number) => void) => (
    <>
      <div className="space-y-1">
        <Label className="text-[10px]" style={{ color: TEXT_SUB }}>↔ {lt("Left–Right", "ఎడమ–కుడి")} — {Math.round(x)}%</Label>
        <input type="range" min={0} max={100} step={1} value={x} onChange={(e) => onPos(Number(e.target.value), y)} className="w-full" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]" style={{ color: TEXT_SUB }}>↕ {lt("Up–Down", "పై–కింద")} — {Math.round(y)}%</Label>
        <input type="range" min={0} max={100} step={1} value={y} onChange={(e) => onPos(x, Number(e.target.value))} className="w-full" />
      </div>
    </>
  );

  return (
    <Section title={lt("Add New Text / Photo (and Delete)", "కొత్త టెక్స్ట్ / ఫోటో యాడ్ చేయండి")}>
      <div className="flex gap-2">
        <button type="button" onClick={() => addText("front")}
          className="flex-1 flex items-center justify-center gap-1 h-9 rounded-md text-[11px] font-semibold border"
          style={{ background: "var(--mbr-theme-primary, #138808)", borderColor: PANEL_BORDER, color: "var(--mbr-theme-primary-fg, #ffffff)" }}>
          <Plus className="h-3.5 w-3.5" /> {lt("Add Text", "టెక్స్ట్ యాడ్")}
        </button>
        <label className="flex-1 flex items-center justify-center gap-1 h-9 rounded-md text-[11px] font-semibold border cursor-pointer"
          style={{ background: "var(--mbr-theme-primary, #138808)", borderColor: PANEL_BORDER, color: "var(--mbr-theme-primary-fg, #ffffff)" }}>
          <Plus className="h-3.5 w-3.5" /> {lt("Add Photo", "ఫోటో యాడ్")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage("front", f); e.target.value = ""; }} />
        </label>
      </div>
      <p className="text-[10px]" style={{ color: TEXT_SUB }}>
        {lt(
          "New items appear at the card center — move them with the Left–Right / Up–Down sliders. To remove an old fixed line, use its Show/Hidden button above.",
          "కొత్తవి కార్డు మధ్యలో వస్తాయి — ఎడమ–కుడి / పై–కింద స్లయిడర్లతో జరపండి. పాత లైన్ తొలగించాలంటే పైన ఉన్న దాని Show/Hidden బటన్ వాడండి."
        )}
      </p>

      {texts.map((t) => (
        <div key={t.id} className="rounded-md p-2 border space-y-2" style={{ borderColor: PANEL_BORDER, background: MINI_BG }}>
          <div className="flex items-center justify-between gap-2">
            <Input value={t.text} onChange={(e) => patchText(t.id, { text: e.target.value })} className="h-8 text-xs flex-1" />
            <button type="button" onClick={() => setTexts(texts.filter((x) => x.id !== t.id))}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border"
              style={{ borderColor: PANEL_BORDER, color: "#f87171", background: MINI_BG }}>
              <Trash2 className="h-3 w-3" /> {lt("Delete", "తొలగించు")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Side", "వైపు")}</Label>
              {sideSelect(t.side, (v) => patchText(t.id, { side: v }))}
            </div>
            <NumberField label={lt("Size (px)", "సైజ్ (px)")} value={t.size} min={5} max={28} onChange={(v) => patchText(t.id, { size: v })} />
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Font", "ఫాంట్")}</Label>
              <Select value={t.font || "Noto Sans"} onValueChange={(v) => patchText(t.id, { font: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ColorField label={lt("Color", "రంగు")} value={t.color} onChange={(v) => patchText(t.id, { color: v })} />
          </div>
          {posSliders(t.x, t.y, (x, y) => patchText(t.id, { x, y }))}
        </div>
      ))}

      {images.map((i) => (
        <div key={i.id} className="rounded-md p-2 border space-y-2" style={{ borderColor: PANEL_BORDER, background: MINI_BG }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={i.url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: `1px solid ${PANEL_BORDER}` }} />
              <span className="text-[11px] font-semibold" style={{ color: TEXT_HEAD }}>{lt("Photo", "ఫోటో")}</span>
            </div>
            <button type="button" onClick={() => setImages(images.filter((x) => x.id !== i.id))}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border"
              style={{ borderColor: PANEL_BORDER, color: "#f87171", background: MINI_BG }}>
              <Trash2 className="h-3 w-3" /> {lt("Delete", "తొలగించు")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Side", "వైపు")}</Label>
              {sideSelect(i.side, (v) => patchImage(i.id, { side: v }))}
            </div>
            <NumberField label={lt("Size (px)", "సైజ్ (px)")} value={i.size} min={12} max={140} onChange={(v) => patchImage(i.id, { size: v })} />
          </div>
          {posSliders(i.x, i.y, (x, y) => patchImage(i.id, { x, y }))}
        </div>
      ))}
    </Section>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 border space-y-3" data-theme-surface="big-box" style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}>
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUB }}>{title}</div>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]" style={{ color: TEXT_SUB }}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]" style={{ color: TEXT_SUB }}>{label}</Label>
      <Input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-9" />
    </div>
  );
}

function BgImageField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]" style={{ color: TEXT_SUB }}>{label}</Label>
      <div className="flex items-center gap-2">
        <div style={{ width: 36, height: 36, borderRadius: 4, background: value ? `url(${value}) center/cover` : MINI_BG, border: `1px solid ${PANEL_BORDER}` }} />
        <label className="inline-flex items-center justify-center px-2 h-8 rounded-md text-[10px] cursor-pointer border flex-1"
          style={{ background: INPUT_BG, borderColor: PANEL_BORDER, color: INPUT_TEXT }}>
          {value ? "Change" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result));
            reader.readAsDataURL(f);
          }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="text-[10px] px-2 h-8 rounded border"
            style={{ borderColor: PANEL_BORDER, color: TEXT_SUB, background: MINI_BG }}>Clear</button>
        )}
      </div>
    </div>
  );
}

function ElementRow({ k, design, setElement }: { k: ElementKey; design: IdCardDesign; setElement: (k: ElementKey, p: any) => void }) {
  const { lang } = useI18n();
  const lt = makeLt(lang);
  const meta = ELEMENT_LABELS[k];
  const el = design.elements[k];
  const isImage = k === "logo" || k === "photo" || k === "qrCode" || k === "presidentSignature" || k === "mbrQrCode" || k === "mbrLogo";
  const label = localizeText(meta, lang);

  return (
    <div className="rounded-md p-2 border space-y-2" data-theme-surface="mini-box" style={{ borderColor: PANEL_BORDER, background: MINI_BG }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold truncate" style={{ color: TEXT_HEAD }}>{label}</div>
        </div>
        <button
          type="button"
          onClick={() => setElement(k, { visible: !el.visible })}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded"
          style={{ background: el.visible ? "var(--mbr-theme-primary, #138808)" : MINI_BG, border: `1px solid ${PANEL_BORDER}`, color: el.visible ? "var(--mbr-theme-primary-fg, #ffffff)" : TEXT_SUB }}
        >
          {el.visible ? <><Eye className="h-3 w-3" /> {lt("Show", "చూపించు")}</> : <><EyeOff className="h-3 w-3" /> {lt("Hidden", "దాచబడింది")}</>}
        </button>
      </div>

      {el.visible && (
        isImage ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={lt("Size (px)", "సైజ్ (px)")} value={el.imgSize ?? 60} min={20} max={140} onChange={(v) => setElement(k, { imgSize: v })} />
            {(k === "qrCode" || k === "mbrLogo") && (
              <div className="space-y-1">
                <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Corner", "మూల")}</Label>
                <Select value={el.corner || "br"} onValueChange={(v) => setElement(k, { corner: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tl">↖ {lt("Top Left", "పై ఎడమ")}</SelectItem>
                    <SelectItem value="tr">↗ {lt("Top Right", "పై కుడి")}</SelectItem>
                    <SelectItem value="bl">↙ {lt("Bottom Left", "కింద ఎడమ")}</SelectItem>
                    <SelectItem value="br">↘ {lt("Bottom Right", "కింద కుడి")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Font", "ఫాంట్")}</Label>
              <Select value={el.font || "Inter"} onValueChange={(v) => setElement(k, { font: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <NumberField label={lt("Size (px)", "సైజ్ (px)")} value={el.size ?? 12} min={6} max={28} onChange={(v) => setElement(k, { size: v })} />
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>{lt("Weight", "బరువు")}</Label>
              <Select value={String(el.weight ?? 500)} onValueChange={(v) => setElement(k, { weight: Number(v) })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ColorField label={lt("Color", "రంగు")} value={el.color || "#111111"} onChange={(v) => setElement(k, { color: v })} />
          </div>
        )
      )}
    </div>
  );
}
