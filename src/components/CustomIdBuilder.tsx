import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, Image as ImageIcon, User, QrCode, Type as TypeIcon, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

type ElementKey = "photo" | "name" | "designation" | "qr";

type ElState = {
  enabled: boolean;
  x: number; // px relative to canvas
  y: number;
  w: number;
  h: number;
};

const CANVAS_W = 540; // editor canvas width
const CANVAS_H = 340; // CR80 landscape-ish ratio (1.586:1)

const DEFAULTS: Record<ElementKey, ElState> = {
  photo:       { enabled: true,  x: 24,  y: 80,  w: 110, h: 130 },
  name:        { enabled: true,  x: 160, y: 100, w: 340, h: 36 },
  designation: { enabled: true,  x: 160, y: 150, w: 340, h: 26 },
  qr:          { enabled: true,  x: 420, y: 210, w: 90,  h: 90 },
};

const PANEL = "#111113";
const BORDER = "#1f1f23";
const HEAD = "#ededf0";
const SUB = "#8a8a91";
const ACCENT = "#f97316";

export function CustomIdBuilder({ defaultName = "Member Name", defaultDesignation = "Member" }: {
  defaultName?: string;
  defaultDesignation?: string;
}) {
  const [bg, setBg] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [designation, setDesignation] = useState(defaultDesignation);
  const [qrValue, setQrValue] = useState("https://example.org/member/0001");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [els, setEls] = useState<Record<ElementKey, ElState>>(DEFAULTS);
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // generate QR
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

  // dragging
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

  async function exportPDF() {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, jsPdf] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      // deselect to hide outline
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
      // CR80 card: 85.6 x 54 mm landscape
      const pdf = new jsPdf.jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
      pdf.addImage(img, "PNG", 0, 0, 85.6, 54);
      pdf.save(`id-card-${Date.now()}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
      {/* Canvas */}
      <div className="space-y-3">
        <div className="rounded-lg border p-3" style={{ background: "#0a0a0a", borderColor: BORDER }}>
          <div
            ref={canvasRef}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
            className="relative mx-auto select-none touch-none"
            style={{
              width: "100%",
              maxWidth: CANVAS_W,
              aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
              background: bg ? `url(${bg}) center/cover no-repeat` : "#ffffff",
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
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

            {/* Photo block */}
            {els.photo.enabled && (
              <DraggableBox
                state={els.photo}
                selected={selected === "photo"}
                onPointerDown={(e) => startDrag("photo", e)}
              >
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ background: "#e5e7eb", color: "#6b7280" }}>
                    <User className="h-6 w-6" />
                  </div>
                )}
              </DraggableBox>
            )}

            {/* Name */}
            {els.name.enabled && (
              <DraggableBox
                state={els.name}
                selected={selected === "name"}
                onPointerDown={(e) => startDrag("name", e)}
              >
                <div className="w-full h-full grid place-items-center px-2" style={{
                  fontWeight: 800, color: "#111", fontSize: Math.max(12, els.name.h * 0.55),
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{name}</div>
              </DraggableBox>
            )}

            {/* Designation */}
            {els.designation.enabled && (
              <DraggableBox
                state={els.designation}
                selected={selected === "designation"}
                onPointerDown={(e) => startDrag("designation", e)}
              >
                <div className="w-full h-full grid place-items-center px-2" style={{
                  fontWeight: 500, color: "#374151", fontSize: Math.max(10, els.designation.h * 0.6),
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{designation}</div>
              </DraggableBox>
            )}

            {/* QR */}
            {els.qr.enabled && (
              <DraggableBox
                state={els.qr}
                selected={selected === "qr"}
                onPointerDown={(e) => startDrag("qr", e)}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="w-full h-full pointer-events-none" style={{ background: "#fff" }} />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ background: "#fff", color: "#111" }}>
                    <QrCode className="h-6 w-6" />
                  </div>
                )}
              </DraggableBox>
            )}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: SUB }}>
            Tap an element to select • drag to move • resize from the side panel
          </p>
        </div>

        <Button
          onClick={exportPDF}
          disabled={exporting}
          className="w-full h-10 font-semibold"
          style={{ background: ACCENT, color: "#fff" }}
        >
          <Download className="h-4 w-4 mr-2" /> {exporting ? "Preparing PDF..." : "Download High-Quality PDF"}
        </Button>
      </div>

      {/* Side panel */}
      <div className="space-y-3">
        <Panel title="1 · Background / బ్యాక్‌గ్రౌండ్">
          <UploadButton
            label={bg ? "Replace Background" : "Upload Custom Background"}
            sub="JPG / PNG · కస్టమ్ బ్యాక్‌గ్రౌండ్"
            onFile={(f) => uploadFile(f, setBg)}
          />
          {bg && (
            <Button variant="ghost" size="sm" onClick={() => setBg(null)} className="w-full h-8 text-xs" style={{ color: "#ef4444" }}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          )}
        </Panel>

        <Panel title="2 · Elements / ఎలిమెంట్స్">
          <ToggleRow icon={<User className="h-3.5 w-3.5" />} label="Photo / ఫోటో" on={els.photo.enabled} onChange={(v) => patch("photo", { enabled: v })} />
          <ToggleRow icon={<TypeIcon className="h-3.5 w-3.5" />} label="Name / పేరు" on={els.name.enabled} onChange={(v) => patch("name", { enabled: v })} />
          <ToggleRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Designation / పదవి" on={els.designation.enabled} onChange={(v) => patch("designation", { enabled: v })} />
          <ToggleRow icon={<QrCode className="h-3.5 w-3.5" />} label="QR Code / క్యూఆర్" on={els.qr.enabled} onChange={(v) => patch("qr", { enabled: v })} />
        </Panel>

        {els.photo.enabled && (
          <Panel title="3 · Photo">
            <UploadButton label={photo ? "Replace Photo" : "Upload Photo"} sub="మెంబర్ ఫోటో" onFile={(f) => uploadFile(f, setPhoto)} />
            <SizeSliders state={els.photo} onChange={(p) => patch("photo", p)} />
          </Panel>
        )}

        {els.name.enabled && (
          <Panel title="4 · Name Text">
            <LabeledInput label="Name" value={name} onChange={setName} />
            <SizeSliders state={els.name} onChange={(p) => patch("name", p)} />
          </Panel>
        )}

        {els.designation.enabled && (
          <Panel title="5 · Designation">
            <LabeledInput label="Designation" value={designation} onChange={setDesignation} />
            <SizeSliders state={els.designation} onChange={(p) => patch("designation", p)} />
          </Panel>
        )}

        {els.qr.enabled && (
          <Panel title="6 · QR Code">
            <LabeledInput label="QR Value (URL / ID)" value={qrValue} onChange={setQrValue} />
            <SizeSliders state={els.qr} onChange={(p) => patch("qr", p)} square />
          </Panel>
        )}
      </div>
    </div>
  );
}

function DraggableBox({
  state, selected, onPointerDown, children,
}: {
  state: ElState; selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute cursor-move"
      style={{
        left: `${(state.x / CANVAS_W) * 100}%`,
        top: `${(state.y / CANVAS_H) * 100}%`,
        width: `${(state.w / CANVAS_W) * 100}%`,
        height: `${(state.h / CANVAS_H) * 100}%`,
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
    <div className="rounded-lg border p-3 space-y-2" style={{ background: PANEL, borderColor: BORDER }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: HEAD }}>{title}</p>
      {children}
    </div>
  );
}

function ToggleRow({ icon, label, on, onChange }: { icon: React.ReactNode; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 text-xs" style={{ color: HEAD }}>{icon} {label}</div>
      <Switch checked={on} onCheckedChange={onChange} />
    </div>
  );
}

function UploadButton({ label, sub, onFile }: { label: string; sub?: string; onFile: (f: File) => void }) {
  const id = `up-${label.replace(/\s+/g, "-")}`;
  return (
    <>
      <input id={id} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
      <Button asChild variant="outline" size="sm" className="w-full h-9 cursor-pointer" style={{ borderColor: BORDER, background: "#0a0a0a", color: HEAD }}>
        <label htmlFor={id}>
          <Upload className="h-3.5 w-3.5 mr-2" />
          <span className="text-xs">{label}</span>
        </label>
      </Button>
      {sub && <p className="text-[10px]" style={{ color: SUB }}>{sub}</p>}
    </>
  );
}

function SizeSliders({ state, onChange, square = false }: {
  state: ElState; onChange: (p: Partial<ElState>) => void; square?: boolean;
}) {
  return (
    <div className="space-y-2">
      <SliderRow label={`Width: ${Math.round(state.w)}px`} value={state.w} min={20} max={CANVAS_W} onChange={(w) => onChange(square ? { w, h: w } : { w })} />
      {!square && (
        <SliderRow label={`Height: ${Math.round(state.h)}px`} value={state.h} min={16} max={CANVAS_H} onChange={(h) => onChange({ h })} />
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
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" style={{ background: "#0a0a0a", borderColor: BORDER, color: HEAD }} />
    </div>
  );
}
