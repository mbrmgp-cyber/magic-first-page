import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Upload, Download, Image as ImageIcon, User, QrCode, Type as TypeIcon,
  Briefcase, Trash2, Plus, RectangleHorizontal, RectangleVertical, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { localizeText, useI18n } from "@/lib/i18n";

type BuiltinKey = "photo" | "name" | "designation" | "qr";
type ElementKey = BuiltinKey | string; // custom fields use cf-<id>

type ElState = {
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  fontSize?: number;
};

type CustomField = {
  id: string;       // cf-xxxx
  label: string;    // panel label
  value: string;    // displayed text
};

type CardSize = "landscape" | "portrait" | "keychain";

const SIZES: Record<CardSize, { w: number; h: number; pdf: [number, number]; orient: "landscape" | "portrait"; label: string; icon: React.ReactNode }> = {
  landscape: { w: 540, h: 340, pdf: [85.6, 54], orient: "landscape", label: "Landscape", icon: <RectangleHorizontal className="h-3.5 w-3.5" /> },
  portrait:  { w: 340, h: 540, pdf: [54, 85.6], orient: "portrait",  label: "Portrait",  icon: <RectangleVertical className="h-3.5 w-3.5" /> },
  keychain:  { w: 380, h: 240, pdf: [60, 38],   orient: "landscape", label: "Keychain",  icon: <KeyRound className="h-3.5 w-3.5" /> },
};

const PANEL = "var(--design-big-box, var(--mbr-theme-big-card, #1b1b22))";
const PANEL_HEAD_BG = "var(--design-mini-box, var(--mbr-theme-mini-card, #242430))";
const FIELD_BG = "var(--design-input-bg, var(--mbr-theme-input-bg, #0f0f14))";
const BORDER = "var(--design-border, var(--mbr-theme-border, #3a3a46))";
const HEAD = "var(--design-heading, var(--mbr-theme-heading, #f4f4f6))";
const SUB = "var(--design-muted, var(--mbr-theme-muted, #b8b8c2))";
const ACCENT = "var(--mbr-theme-primary, var(--design-icon, #f97316))";

function defaultBuiltins(w: number, h: number): Record<BuiltinKey, ElState> {
  return {
    photo:       { enabled: true, x: Math.round(w * 0.05), y: Math.round(h * 0.22), w: Math.round(w * 0.22), h: Math.round(h * 0.40) },
    name:        { enabled: true, x: Math.round(w * 0.30), y: Math.round(h * 0.28), w: Math.round(w * 0.65), h: 36, color: "#111111", fontSize: 22 },
    designation: { enabled: true, x: Math.round(w * 0.30), y: Math.round(h * 0.43), w: Math.round(w * 0.65), h: 26, color: "#374151", fontSize: 16 },
    qr:          { enabled: true, x: Math.round(w * 0.78), y: Math.round(h * 0.62), w: Math.round(w * 0.17), h: Math.round(w * 0.17) },
  };
}

export function CustomIdBuilder({ defaultName = "Member Name", defaultDesignation = "Member" }: {
  defaultName?: string;
  defaultDesignation?: string;
}) {
  const { lang } = useI18n();
  const lt = (en: string, te: string) => localizeText({ en, te }, lang);
  const [size, setSize] = useState<CardSize>("landscape");
  const { w: CANVAS_W, h: CANVAS_H } = SIZES[size];

  const [bg, setBg] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [designation, setDesignation] = useState(defaultDesignation);
  const [qrValue, setQrValue] = useState("https://example.org/member/0001");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const [els, setEls] = useState<Record<ElementKey, ElState>>(() => defaultBuiltins(540, 340));
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // re-layout when size changes: clamp existing positions, scale builtins if not yet moved is hard — just clamp.
  useEffect(() => {
    setEls((prev) => {
      const next: Record<ElementKey, ElState> = { ...prev };
      for (const k of Object.keys(next)) {
        const e = next[k];
        const w = Math.min(e.w, CANVAS_W);
        const h = Math.min(e.h, CANVAS_H);
        next[k] = {
          ...e,
          w, h,
          x: Math.max(0, Math.min(CANVAS_W - w, e.x)),
          y: Math.max(0, Math.min(CANVAS_H - h, e.y)),
        };
      }
      return next;
    });
  }, [CANVAS_W, CANVAS_H]);

  useEffect(() => {
    QRCode.toDataURL(qrValue || " ", { margin: 0, width: 256 }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [qrValue]);

  function uploadFile(file: File, setter: (url: string) => void) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setter(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  }

  function patch(key: ElementKey, p: Partial<ElState>) {
    setEls((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));
  }

  function startDrag(key: ElementKey, e: React.PointerEvent) {
    e.preventDefault();
    setSelected(key);
    const start = { x: e.clientX, y: e.clientY };
    const init = { ...els[key] };
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) * scaleX;
      const dy = (ev.clientY - start.y) * scaleY;
      const nx = Math.max(0, Math.min(CANVAS_W - init.w, init.x + dx));
      const ny = Math.max(0, Math.min(CANVAS_H - init.h, init.y + dy));
      patch(key, { x: nx, y: ny });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function addCustomField() {
    const id = `cf-${Date.now().toString(36)}`;
    const idx = customFields.length + 1;
    setCustomFields((prev) => [...prev, { id, label: `Custom Field ${idx}`, value: `Detail ${idx}` }]);
    setEls((prev) => ({
      ...prev,
      [id]: {
        enabled: true,
        x: Math.round(CANVAS_W * 0.30),
        y: Math.round(CANVAS_H * 0.60) + idx * 8,
        w: Math.round(CANVAS_W * 0.65),
        h: 24,
        color: "#111111",
        fontSize: 14,
      },
    }));
  }

  function removeCustomField(id: string) {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    setEls((prev) => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  }

  function updateCustomField(id: string, p: Partial<CustomField>) {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...p } : f)));
  }

  async function exportPDF() {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, jsPdf] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const prevSelected = selected;
      setSelected(null);
      await new Promise((r) => setTimeout(r, 50));
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
      });
      setSelected(prevSelected);
      const img = canvas.toDataURL("image/png");
      const { pdf: pdfSize, orient } = SIZES[size];
      const pdf = new jsPdf.jsPDF({ orientation: orient, unit: "mm", format: pdfSize });
      pdf.addImage(img, "PNG", 0, 0, pdfSize[0], pdfSize[1]);
      pdf.save(`id-card-${Date.now()}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    } finally {
      setExporting(false);
    }
  }

  const cfMap = useMemo(() => Object.fromEntries(customFields.map((f) => [f.id, f])), [customFields]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
      {/* Canvas */}
      <div className="space-y-3">
        {/* Card size selector */}
        <div className="rounded-lg border p-2 flex items-center gap-2" data-theme-surface="big-box" style={{ background: PANEL, borderColor: BORDER }}>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1 shrink-0" style={{ color: SUB }}>Size</span>
          <div className="flex flex-1 gap-1.5 flex-wrap">
            {(Object.keys(SIZES) as CardSize[]).map((k) => {
              const active = size === k;
              return (
                <button
                  key={k}
                  onClick={() => setSize(k)}
                  className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 h-8 rounded text-[11px] font-semibold transition-colors"
                  style={{
                    background: active ? ACCENT : FIELD_BG,
                    color: active ? "var(--mbr-theme-primary-fg, #fff)" : HEAD,
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                  }}
                >
                  {SIZES[k].icon} {SIZES[k].label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-xl border-2 p-4"
          data-theme-surface="big-box"
          style={{
            background: PANEL,
            borderColor: BORDER,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div
            ref={canvasRef}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
            className="relative mx-auto select-none touch-none mbr-preserve-design"
            data-theme-preserve="card"
            style={{
              width: "100%",
              maxWidth: CANVAS_W,
              aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
              background: bg ? `url(${bg}) center/cover no-repeat` : "#ffffff",
              border: "2px solid #000",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            {!bg && (
              <div className="absolute inset-0 grid place-items-center text-center pointer-events-none" style={{ color: "#888" }}>
                <div>
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  <p className="text-xs">Upload your custom background to start</p>
                </div>
              </div>
            )}

            {els.photo?.enabled && (
              <DraggableBox state={els.photo} cw={CANVAS_W} ch={CANVAS_H} selected={selected === "photo"} onPointerDown={(e) => startDrag("photo", e)}>
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ background: "#e5e7eb", color: "#6b7280" }}>
                    <User className="h-6 w-6" />
                  </div>
                )}
              </DraggableBox>
            )}

            {els.name?.enabled && (
              <DraggableBox state={els.name} cw={CANVAS_W} ch={CANVAS_H} selected={selected === "name"} onPointerDown={(e) => startDrag("name", e)}>
                <div className="w-full h-full grid place-items-center px-2" style={{
                  fontWeight: 800, color: els.name.color || "#111", fontSize: els.name.fontSize || 22,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{name}</div>
              </DraggableBox>
            )}

            {els.designation?.enabled && (
              <DraggableBox state={els.designation} cw={CANVAS_W} ch={CANVAS_H} selected={selected === "designation"} onPointerDown={(e) => startDrag("designation", e)}>
                <div className="w-full h-full grid place-items-center px-2" style={{
                  fontWeight: 500, color: els.designation.color || "#374151", fontSize: els.designation.fontSize || 16,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{designation}</div>
              </DraggableBox>
            )}

            {els.qr?.enabled && (
              <DraggableBox state={els.qr} cw={CANVAS_W} ch={CANVAS_H} selected={selected === "qr"} onPointerDown={(e) => startDrag("qr", e)}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="w-full h-full pointer-events-none" style={{ background: "#fff" }} />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ background: "#fff", color: "#111" }}>
                    <QrCode className="h-6 w-6" />
                  </div>
                )}
              </DraggableBox>
            )}

            {customFields.map((f) => {
              const e = els[f.id];
              if (!e?.enabled) return null;
              return (
                <DraggableBox key={f.id} state={e} cw={CANVAS_W} ch={CANVAS_H} selected={selected === f.id} onPointerDown={(ev) => startDrag(f.id, ev)}>
                  <div className="w-full h-full grid place-items-center px-2" style={{
                    fontWeight: 600, color: e.color || "#111", fontSize: e.fontSize || 14,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{f.value}</div>
                </DraggableBox>
              );
            })}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: SUB }}>
            {lt("Tap an element to select • drag to move or use position sliders below", "ఎలిమెంట్ ఎంచుకోవడానికి ట్యాప్ చేయండి • కదిలించడానికి డ్రాగ్ చేయండి")}
          </p>
        </div>

        <Button onClick={exportPDF} disabled={exporting} className="w-full h-10 font-semibold" style={{ background: ACCENT, color: "#fff" }}>
          <Download className="h-4 w-4 mr-2" /> {exporting ? lt("Preparing PDF...", "PDF సిద్ధమవుతోంది...") : lt("Download High-Quality PDF", "హై-క్వాలిటీ PDF డౌన్‌లోడ్")}
        </Button>
      </div>

      {/* Side panel */}
      <div className="space-y-3">
        <Panel title={`1 · ${lt("Background", "బ్యాక్‌గ్రౌండ్")}`}>
          <UploadButton
            label={bg ? lt("Replace Background", "బ్యాక్‌గ్రౌండ్ మార్చండి") : lt("Upload Custom Background", "కస్టమ్ బ్యాక్‌గ్రౌండ్ అప్‌లోడ్")}
            sub={`JPG / PNG · ${lt("Custom Background", "కస్టమ్ బ్యాక్‌గ్రౌండ్")}`}
            onFile={(f) => uploadFile(f, setBg)}
          />
          {bg && (
            <Button variant="ghost" size="sm" onClick={() => setBg(null)} className="w-full h-8 text-xs" style={{ color: "#ef4444" }}>
              <Trash2 className="h-3 w-3 mr-1" /> {lt("Remove", "తొలగించు")}
            </Button>
          )}
        </Panel>

        <Panel title={`2 · ${lt("Elements", "ఎలిమెంట్స్")}`}>
          <ToggleRow icon={<User className="h-3.5 w-3.5" />} label={lt("Photo", "ఫోటో")} on={els.photo?.enabled} onChange={(v) => patch("photo", { enabled: v })} />
          <ToggleRow icon={<TypeIcon className="h-3.5 w-3.5" />} label={lt("Name", "పేరు")} on={els.name?.enabled} onChange={(v) => patch("name", { enabled: v })} />
          <ToggleRow icon={<Briefcase className="h-3.5 w-3.5" />} label={lt("Designation", "పదవి")} on={els.designation?.enabled} onChange={(v) => patch("designation", { enabled: v })} />
          <ToggleRow icon={<QrCode className="h-3.5 w-3.5" />} label={lt("QR Code", "క్యూఆర్ కోడ్")} on={els.qr?.enabled} onChange={(v) => patch("qr", { enabled: v })} />
        </Panel>

        {els.photo?.enabled && (
          <Panel title={`3 · ${lt("Photo", "ఫోటో")}`}>
            <UploadButton label={photo ? lt("Replace Photo", "ఫోటో మార్చండి") : lt("Upload Photo", "ఫోటో అప్‌లోడ్")} sub={lt("Member Photo", "మెంబర్ ఫోటో")} onFile={(f) => uploadFile(f, setPhoto)} />
            <PositionSliders state={els.photo} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("photo", p)} />
            <SizeSliders state={els.photo} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("photo", p)} />
          </Panel>
        )}

        {els.name?.enabled && (
          <Panel title={`4 · ${lt("Name Text", "పేరు టెక్స్ట్")}`}>
            <LabeledInput label={lt("Name", "పేరు")} value={name} onChange={setName} />
            <FontSizeSlider value={els.name.fontSize || 22} onChange={(v) => patch("name", { fontSize: v })} />
            <ColorPickerRow label={lt("Text Color", "టెక్స్ట్ కలర్")} value={els.name.color || "#111111"} onChange={(c) => patch("name", { color: c })} />
            <PositionSliders state={els.name} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("name", p)} />
            <SizeSliders state={els.name} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("name", p)} />
          </Panel>
        )}

        {els.designation?.enabled && (
          <Panel title={`5 · ${lt("Designation", "పదవి")}`}>
            <LabeledInput label={lt("Designation", "పదవి")} value={designation} onChange={setDesignation} />
            <FontSizeSlider value={els.designation.fontSize || 16} onChange={(v) => patch("designation", { fontSize: v })} />
            <ColorPickerRow label={lt("Text Color", "టెక్స్ట్ కలర్")} value={els.designation.color || "#374151"} onChange={(c) => patch("designation", { color: c })} />
            <PositionSliders state={els.designation} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("designation", p)} />
            <SizeSliders state={els.designation} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("designation", p)} />
          </Panel>
        )}

        {els.qr?.enabled && (
          <Panel title={`6 · ${lt("QR Code", "క్యూఆర్ కోడ్")}`}>
            <LabeledInput label={lt("QR Value (URL / ID)", "క్యూఆర్ విలువ (URL / ID)")} value={qrValue} onChange={setQrValue} />
            <PositionSliders state={els.qr} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("qr", p)} />
            <SizeSliders state={els.qr} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch("qr", p)} square />
          </Panel>
        )}

        {/* Custom fields */}
        {customFields.map((f, i) => {
          const e = els[f.id];
          if (!e) return null;
          return (
            <Panel key={f.id} title={`7.${i + 1} · ${f.label}`}>
              <div className="flex items-center justify-between">
                <ToggleRow icon={<TypeIcon className="h-3.5 w-3.5" />} label={lt("Visible", "కనిపించాలి")} on={e.enabled} onChange={(v) => patch(f.id, { enabled: v })} />
                <Button variant="ghost" size="sm" onClick={() => removeCustomField(f.id)} className="h-7 px-2" style={{ color: "#ef4444" }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <LabeledInput label={lt("Label", "లేబుల్")} value={f.label} onChange={(v) => updateCustomField(f.id, { label: v })} />
              <LabeledInput label={lt("Text", "టెక్స్ట్")} value={f.value} onChange={(v) => updateCustomField(f.id, { value: v })} />
              <FontSizeSlider value={e.fontSize || 14} onChange={(v) => patch(f.id, { fontSize: v })} />
              <ColorPickerRow label={lt("Text Color", "టెక్స్ట్ కలర్")} value={e.color || "#111111"} onChange={(c) => patch(f.id, { color: c })} />
              <PositionSliders state={e} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch(f.id, p)} />
              <SizeSliders state={e} cw={CANVAS_W} ch={CANVAS_H} onChange={(p) => patch(f.id, p)} />
            </Panel>
          );
        })}

        <Button onClick={addCustomField} variant="outline" className="w-full h-9 text-xs" style={{ borderColor: ACCENT, color: ACCENT, background: "transparent" }}>
          <Plus className="h-4 w-4 mr-1" /> {lt("Add Custom Field", "కస్టమ్ ఫీల్డ్ జోడించండి")}
        </Button>
      </div>
    </div>
  );
}

function DraggableBox({
  state, cw, ch, selected, onPointerDown, children,
}: {
  state: ElState; cw: number; ch: number; selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute cursor-move"
      style={{
        left: `${(state.x / cw) * 100}%`,
        top: `${(state.y / ch) * 100}%`,
        width: `${(state.w / cw) * 100}%`,
        height: `${(state.h / ch) * 100}%`,
        outline: selected ? `2px dashed ${ACCENT}` : "1px dashed rgba(0,0,0,0.18)",
        outlineOffset: 1,
        background: "transparent",
      }}
    >
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      data-theme-surface="big-box"
      style={{
        background: PANEL,
        borderColor: BORDER,
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        data-theme-surface="mini-box"
        style={{ background: PANEL_HEAD_BG, borderColor: BORDER }}
      >
        <span className="h-3 w-1 rounded-sm" style={{ background: ACCENT }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: HEAD }}>
          {title}
        </p>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}

function ToggleRow({ icon, label, on, onChange }: { icon: React.ReactNode; label: string; on?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 text-xs" style={{ color: HEAD }}>{icon} {label}</div>
      <Switch checked={!!on} onCheckedChange={onChange} />
    </div>
  );
}

function UploadButton({ label, sub, onFile }: { label: string; sub?: string; onFile: (f: File) => void }) {
  const id = `up-${label.replace(/\s+/g, "-")}`;
  return (
    <>
      <input id={id} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
      <Button asChild variant="outline" size="sm" className="w-full h-9 cursor-pointer" style={{ borderColor: BORDER, background: FIELD_BG, color: HEAD }}>
        <label htmlFor={id}>
          <Upload className="h-3.5 w-3.5 mr-2" />
          <span className="text-xs">{label}</span>
        </label>
      </Button>
      {sub && <p className="text-[10px]" style={{ color: SUB }}>{sub}</p>}
    </>
  );
}

function PositionSliders({ state, cw, ch, onChange }: { state: ElState; cw: number; ch: number; onChange: (p: Partial<ElState>) => void }) {
  const maxX = Math.max(0, cw - state.w);
  const maxY = Math.max(0, ch - state.h);
  return (
    <div className="space-y-2 pt-1 border-t" style={{ borderColor: BORDER }}>
      <SliderRow label={`X: ${Math.round(state.x)}px`} value={Math.min(state.x, maxX)} min={0} max={maxX || 1} onChange={(x) => onChange({ x })} />
      <SliderRow label={`Y: ${Math.round(state.y)}px`} value={Math.min(state.y, maxY)} min={0} max={maxY || 1} onChange={(y) => onChange({ y })} />
    </div>
  );
}

function SizeSliders({ state, cw, ch, onChange, square = false }: {
  state: ElState; cw: number; ch: number; onChange: (p: Partial<ElState>) => void; square?: boolean;
}) {
  return (
    <div className="space-y-2">
      <SliderRow label={`Width: ${Math.round(state.w)}px`} value={state.w} min={20} max={cw} onChange={(w) => onChange(square ? { w, h: w } : { w })} />
      {!square && (
        <SliderRow label={`Height: ${Math.round(state.h)}px`} value={state.h} min={16} max={ch} onChange={(h) => onChange({ h })} />
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px]" style={{ color: SUB }}>{label}</p>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]" style={{ color: SUB }}>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" style={{ background: FIELD_BG, borderColor: BORDER, color: HEAD }} />
    </div>
  );
}

function FontSizeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px]" style={{ color: SUB }}>Font Size: {Math.round(value)}px</p>
      <Slider value={[value]} min={8} max={64} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

const SWATCHES = ["#ffffff", "#000000", "#111111", "#374151", "#f97316", "#facc15", "#ef4444", "#22c55e", "#3b82f6"];

function ColorPickerRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px]" style={{ color: SUB }}>{label}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
            style={{ background: c, borderColor: value.toLowerCase() === c.toLowerCase() ? ACCENT : "rgba(255,255,255,0.2)", boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${ACCENT}` : "none" }}
            aria-label={c}
          />
        ))}
        <label className="h-6 w-6 rounded-full border cursor-pointer overflow-hidden relative" style={{ borderColor: "rgba(255,255,255,0.2)", background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </div>
    </div>
  );
}
