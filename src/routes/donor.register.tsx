import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, User, ArrowLeft, HandHeart, CheckCircle2 } from "lucide-react";
import { validateOrgCode } from "@/lib/org.functions";
import { submitDonorRequest } from "@/lib/donors.functions";

export const Route = createFileRoute("/donor/register")({
  head: () => ({ meta: [{ title: "Donor Registration — MBR App" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  component: function DonorRegisterRoute() {
    const search = Route.useSearch();
    return <DonorRegister initialCode={search.code} />;
  },
});

function DonorRegister({ initialCode }: { initialCode?: string }) {
  const validate = useServerFn(validateOrgCode);
  const submit = useServerFn(submitDonorRequest);

  const [stage, setStage] = useState<"code" | "form" | "done">(initialCode ? "form" : "code");
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!initialCode);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [f, setF] = useState({
    first_name: "", last_name: "", email: "", phone: "", notes: "",
  });

  async function checkCode(v: string) {
    setLoading(true);
    try {
      const r: any = await validate({ data: { code: v } });
      if (!r.valid) { toast.error("తప్పు కోడ్"); setStage("code"); return; }
      setOrgId(r.org.id);
      setOrgName(r.org.name);
      setOrgLogo(r.org.logo_url ?? null);
      setStage("form");
    } catch (e: any) { toast.error(e.message); setStage("code"); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (initialCode) checkCode(initialCode); /* eslint-disable-line */ }, []);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ఫైల్ 5MB మించరాదు"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function fileToDataUrl(f: File): Promise<string> {
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("read failed"));
      r.readAsDataURL(f);
    });
  }

  async function onSubmit() {
    if (!f.first_name.trim()) { toast.error("పేరు ఇవ్వండి"); return; }
    if (!f.email.trim()) { toast.error("Email ఇవ్వండి"); return; }
    setSaving(true);
    try {
      let photo_data_url: string | undefined;
      if (photoFile) photo_data_url = await fileToDataUrl(photoFile);
      await submit({ data: {
        code,
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        notes: f.notes.trim(),
        photo_data_url,
      }});
      setStage("done");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <div className="max-w-lg mx-auto p-4 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <Card className="p-5 bg-black/60 border-white/10 backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-[#ff8c28]/20 border border-[#ff8c28]/40 flex items-center justify-center">
              <HandHeart className="w-6 h-6 text-[#ff8c28]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">డోనర్ నమోదు</h1>
              <p className="text-xs text-white/60">Donor Registration</p>
            </div>
          </div>

          {stage === "code" && (
            <div className="space-y-3">
              <Label>Organization Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ఉదా: A"
                className="bg-white/5 border-white/20 text-white"
              />
              <Button
                disabled={!code.trim() || loading}
                onClick={() => checkCode(code)}
                className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90"
              >
                {loading ? "తనిఖీ…" : "కొనసాగించు"}
              </Button>
            </div>
          )}

          {stage === "form" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 border rounded-lg p-3 bg-white/5 border-white/10">
                {orgLogo && <img src={orgLogo} className="h-10 w-10 rounded" alt="" />}
                <div>
                  <p className="text-sm font-semibold">{orgName}</p>
                  <p className="text-xs text-white/60">Code: {code}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20">
                  {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" />
                    : <User className="w-8 h-8 text-white/60" />}
                </div>
                <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-white/20 cursor-pointer hover:bg-white/10">
                  <Camera className="w-4 h-4" /> ఫోటో
                  <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>మొదటి పేరు *</Label>
                  <Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white" /></div>
                <div><Label>ఇంటిపేరు</Label>
                  <Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })}
                    className="bg-white/5 border-white/20 text-white" /></div>
              </div>
              <div><Label>Email *</Label>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" /></div>
              <div><Label>Phone</Label>
                <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" /></div>
              <div><Label>నోట్స్</Label>
                <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
                  className="bg-white/5 border-white/20 text-white" /></div>

              <Button
                disabled={saving}
                onClick={onSubmit}
                className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90"
              >
                {saving ? "సబ్మిట్…" : "అభ్యర్థన సబ్మిట్"}
              </Button>
              <p className="text-xs text-white/60 text-center">
                అడ్మిన్ ఆమోదించిన తర్వాత మీ dashboard యాక్టివ్ అవుతుంది.
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-semibold">అభ్యర్థన నమోదైంది</h2>
              <p className="text-sm text-white/70">
                {orgName} అడ్మిన్ మీ అభ్యర్థనను సమీక్షిస్తారు. ఆమోదం తర్వాత అదే email తో లాగిన్ అవండి.
              </p>
              <Link to="/auth"><Button className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90">లాగిన్ కు వెళ్ళు</Button></Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
