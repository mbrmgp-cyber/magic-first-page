import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyOrg, updateOrgTheme } from "@/lib/org.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Check, Palette, Type, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/org/theme")({
  head: () => ({ meta: [{ title: "Design & Theme — MBR App" }] }),
  component: OrgThemePage,
});

const PRESETS: { label: string; value: string }[] = [
  { label: "Brand Orange", value: "#ff8c28" },
  { label: "Royal Blue", value: "#1e40af" },
  { label: "Deep Green", value: "#15803d" },
  { label: "Maroon", value: "#9b1c31" },
  { label: "Classic Black", value: "#111111" },
  { label: "Saffron", value: "#FF9933" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Teal", value: "#0f766e" },
];

const FONTS = ["Inter", "Poppins", "Playfair Display", "Merriweather", "Roboto Slab", "Noto Sans"];

function OrgThemePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getMyOrg);
  const saveTheme = useServerFn(updateOrgTheme);
  const orgQ = useQuery({ queryKey: ["my-org"], queryFn: () => fetchOrg() });
  const org: any = orgQ.data?.org;

  const [color, setColor] = useState("#ff8c28");
  const [font, setFont] = useState("Inter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (org) {
      setColor(org.theme_color || "#ff8c28");
      setFont(org.theme_font || "Inter");
    }
  }, [org?.id]);

  async function save() {
    setBusy(true);
    try {
      await saveTheme({ data: { theme_color: color, theme_font: font } });
      await qc.invalidateQueries({ queryKey: ["my-org"] });
      await qc.invalidateQueries({ queryKey: ["my-membership"] });
      toast.success("Theme saved / థీమ్ సేవ్ అయింది");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-12" style={{ fontFamily: `${font}, system-ui, sans-serif` }}>
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/org/dashboard" })} className="text-zinc-300">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold">Design &amp; Theme / రంగులు మరియు డిజైన్</h1>
          <div className="w-12" />
        </div>

        {/* Preview */}
        <Card className="bg-zinc-950 border-zinc-800 p-5 space-y-4" style={{ boxShadow: `0 0 32px ${color}33` }}>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Live Preview / ప్రివ్యూ</p>
          <div className="rounded-xl overflow-hidden border border-zinc-800">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: color }}>
              <div className="h-9 w-9 rounded-full bg-white/95" />
              <div className="text-white font-bold">{org?.name || "Your Society"}</div>
            </div>
            <div className="bg-white text-black px-4 py-4 space-y-2">
              <p className="text-sm" style={{ color }}>Member ID: {org?.letter_code || "X"}/0001</p>
              <p className="text-base font-semibold">Sample Member</p>
              <Button style={{ backgroundColor: color, color: "#fff" }} className="hover:opacity-90">
                Primary Action
              </Button>
            </div>
          </div>
        </Card>

        {/* Color presets */}
        <Card className="bg-zinc-950 border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4" style={{ color }} /> Brand Color / బ్రాండ్ రంగు
          </div>
          <div className="grid grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setColor(p.value)}
                className="rounded-lg border p-2 flex flex-col items-center gap-1.5 transition"
                style={{
                  borderColor: color === p.value ? p.value : "#27272a",
                  background: color === p.value ? `${p.value}1a` : "transparent",
                }}
              >
                <span className="h-8 w-8 rounded-full border border-zinc-800" style={{ background: p.value }}>
                  {color === p.value && <Check className="h-4 w-4 text-white m-auto mt-2" />}
                </span>
                <span className="text-[10px] text-zinc-300 leading-tight text-center">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs text-zinc-400">Custom:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border border-zinc-700"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white font-mono w-32"
              maxLength={7}
            />
          </div>
        </Card>

        {/* Font selection */}
        <Card className="bg-zinc-950 border-zinc-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Type className="h-4 w-4" style={{ color }} /> Font Style / అక్షర శైలి
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className="rounded-lg border p-3 text-left transition"
                style={{
                  borderColor: font === f ? color : "#27272a",
                  background: font === f ? `${color}1a` : "transparent",
                  fontFamily: `${f}, system-ui, sans-serif`,
                }}
              >
                <div className="text-sm font-semibold text-white">{f}</div>
                <div className="text-[11px] text-zinc-400">The quick brown fox</div>
              </button>
            ))}
          </div>
        </Card>

        <Button
          onClick={save}
          disabled={busy}
          className="w-full font-semibold text-white"
          style={{ background: color, boxShadow: `0 0 24px ${color}66` }}
        >
          <Save className="h-4 w-4 mr-2" />
          {busy ? "Saving…" : "Save Theme / సేవ్ చేయండి"}
        </Button>
      </div>
    </div>
  );
}
