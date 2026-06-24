import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import type { IdCardDesign, ElementKey } from "@/lib/idCardTemplates";
import { ELEMENT_LABELS, FONT_OPTIONS } from "@/lib/idCardTemplates";

type Props = {
  design: IdCardDesign;
  onChange: (next: IdCardDesign) => void;
};

const PANEL_BORDER = "#27272a";
const PANEL_BG = "#111113";
const TEXT_SUB = "#a1a1aa";

export function TemplateCustomizer({ design, onChange }: Props) {
  function setGlobal<K extends keyof IdCardDesign["global"]>(key: K, value: IdCardDesign["global"][K]) {
    onChange({ ...design, global: { ...design.global, [key]: value } });
  }
  function setElement(key: ElementKey, patch: Partial<IdCardDesign["elements"][ElementKey]>) {
    onChange({ ...design, elements: { ...design.elements, [key]: { ...design.elements[key], ...patch } } });
  }

  const keys = Object.keys(design.elements) as ElementKey[];
  const frontKeys = keys.filter((k) => ELEMENT_LABELS[k].side === "front");
  const backKeys = keys.filter((k) => ELEMENT_LABELS[k].side === "back");

  return (
    <div className="space-y-4">
      {/* GLOBAL */}
      <Section title="Card Background / Border  •  బార్డర్ & బ్యాగ్రౌండ్">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Background" value={design.global.backgroundColor} onChange={(v) => setGlobal("backgroundColor", v)} />
          <ColorField label="Border Color" value={design.global.borderColor} onChange={(v) => setGlobal("borderColor", v)} />
          <ColorField label="Accent / Header" value={design.global.accentColor} onChange={(v) => setGlobal("accentColor", v)} />
          <NumberField label="Border Width (px)" value={design.global.borderWidth} min={0} max={8} onChange={(v) => setGlobal("borderWidth", v)} />
          <NumberField label="Corner Radius" value={design.global.cornerRadius} min={0} max={32} onChange={(v) => setGlobal("cornerRadius", v)} />
          <div className="space-y-1">
            <Label className="text-[11px]" style={{ color: TEXT_SUB }}>Border Style</Label>
            <Select value={design.global.borderStyle} onValueChange={(v) => setGlobal("borderStyle", v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* FRONT ELEMENTS */}
      <Section title="Front Side — Lines & Elements  •  ఫ్రంట్ లైన్స్">
        {frontKeys.map((k) => <ElementRow key={k} k={k} design={design} setElement={setElement} />)}
      </Section>

      {/* BACK ELEMENTS */}
      <Section title="Back Side — Lines & Elements  •  బ్యాక్ లైన్స్">
        {backKeys.map((k) => <ElementRow key={k} k={k} design={design} setElement={setElement} />)}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 border space-y-3" style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}>
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

function ElementRow({ k, design, setElement }: { k: ElementKey; design: IdCardDesign; setElement: (k: ElementKey, p: any) => void }) {
  const meta = ELEMENT_LABELS[k];
  const el = design.elements[k];
  const isImage = k === "logo" || k === "photo" || k === "qrCode" || k === "presidentSignature";

  return (
    <div className="rounded-md p-2 border space-y-2" style={{ borderColor: PANEL_BORDER, background: "#0a0a0a" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white truncate">{meta.en}</div>
          <div className="text-[10px] truncate" style={{ color: TEXT_SUB }}>{meta.te}</div>
        </div>
        <button
          type="button"
          onClick={() => setElement(k, { visible: !el.visible })}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded"
          style={{ background: el.visible ? "#138808" : "#3f3f46", color: "#fff" }}
        >
          {el.visible ? <><Eye className="h-3 w-3" /> Show</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
        </button>
      </div>

      {el.visible && (
        isImage ? (
          <div className="grid grid-cols-1 gap-2">
            <NumberField label="Size (px)" value={el.imgSize ?? 60} min={20} max={140} onChange={(v) => setElement(k, { imgSize: v })} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>Font</Label>
              <Select value={el.font || "Inter"} onValueChange={(v) => setElement(k, { font: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Size (px)" value={el.size ?? 12} min={6} max={28} onChange={(v) => setElement(k, { size: v })} />
            <div className="space-y-1">
              <Label className="text-[10px]" style={{ color: TEXT_SUB }}>Weight</Label>
              <Select value={String(el.weight ?? 500)} onValueChange={(v) => setElement(k, { weight: Number(v) })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[400, 500, 600, 700, 800, 900].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ColorField label="Color" value={el.color || "#111111"} onChange={(v) => setElement(k, { color: v })} />
          </div>
        )
      )}
    </div>
  );
}
