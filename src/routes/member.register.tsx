import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateOrgCode, submitMemberRequest } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, ScanLine, RefreshCw, Camera } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";

export const Route = createFileRoute("/member/register")({
  head: () => ({ meta: [{ title: "Member Registration — MBR App" }] }),
  component: MemberRegister,
});

type Introducer = { id: string; name: string };

function MemberRegister() {
  const navigate = useNavigate();
  const validate = useServerFn(validateOrgCode);
  const submit = useServerFn(submitMemberRequest);

  const [stage, setStage] = useState<"code" | "scan" | "form" | "done">("code");
  const [code, setCode] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [introducers, setIntroducers] = useState<Introducer[]>([]);
  const [form, setForm] = useState({
    name: "",
    father_name: "",
    address: "",
    email: "",
    password: "",
    phone: "",
    joined_date: new Date().toISOString().slice(0, 10),
    introducer_member_id: "",
    committee_fee_paid: "",
  });

  async function verifyCode(c: string) {
    setLoading(true);
    try {
      const res = await validate({ data: { code: c } });
      if (!res.valid) {
        toast.error("సరైన QR / Code కాదు");
        return;
      }
      setCode(c.trim().toUpperCase());
      setOrgName(res.org.name);
      setOrgId(res.org.id);
      // Fetch approved members of that org for introducer dropdown (anon allowed via narrow query?)
      // Use server fn-less direct query — needs RLS allowing public read; skip for now and leave free.
      setStage("form");
    } finally {
      setLoading(false);
    }
  }

  // Pull approved members after sign-in (introducer dropdown)
  useEffect(() => {
    if (stage !== "form" || !orgId) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const { data } = await supabase
        .from("members")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("status", "approved")
        .order("name");
      setIntroducers(data ?? []);
    })();
  }, [stage, orgId]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo 5MB కంటే తక్కువగా ఉండాలి"); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        const { error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      }
      // Upload photo if any
      let photo_url: string | undefined;
      if (photoFile) {
        const userResp = await supabase.auth.getUser();
        const uid = userResp.data.user?.id;
        if (uid) {
          const ext = photoFile.name.split(".").pop() || "jpg";
          const path = `${uid}/${Date.now()}.${ext}`;
          const up = await supabase.storage.from("member-photos").upload(path, photoFile, { upsert: true });
          if (up.error) throw up.error;
          photo_url = path;
        }
      }
      await submit({
        data: {
          code, name: form.name, email: form.email,
          phone: form.phone || undefined,
          photo_url,
          father_name: form.father_name || undefined,
          address: form.address || undefined,
          joined_date: form.joined_date || undefined,
          introducer_member_id: form.introducer_member_id || undefined,
          committee_fee_paid: form.committee_fee_paid ? Number(form.committee_fee_paid) : undefined,
        } as any,
      });
      setStage("done");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="w-full max-w-md p-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Request Submitted</h1>
          <p className="text-muted-foreground">
            మీ request <b>{orgName}</b> Admin కి పంపబడింది. Approve అయ్యాక మీరు login చేయవచ్చు.
          </p>
          <Button onClick={() => navigate({ to: "/member/pending" })} className="w-full">Status చూడండి</Button>
        </Card>
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-tricolor">
        <Card className="w-full max-w-md p-5 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{orgName}</h1>
            <p className="text-sm text-muted-foreground">మీ పూర్తి వివరాలు ఇవ్వండి</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/40 overflow-hidden bg-muted flex items-center justify-center">
                  {photoPreview
                    ? <img src={photoPreview} className="h-full w-full object-cover" />
                    : <Camera className="w-7 h-7 text-muted-foreground" />}
                </div>
                <input type="file" accept="image/*" capture="user" onChange={onPhotoChange}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <span className="text-xs text-muted-foreground">మీ ఫోటో</span>
            </div>

            <div className="space-y-2"><Label>పూర్తి పేరు *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>

            <div className="space-y-2"><Label>తండ్రి పేరు</Label>
              <Input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} /></div>

            <div className="space-y-2"><Label>అడ్రస్</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>చేరిన తేదీ</Label>
                <Input type="date" value={form.joined_date} onChange={(e) => setForm({ ...form, joined_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>కమిటీ Fee (₹)</Label>
                <Input type="number" min="0" step="0.01" value={form.committee_fee_paid}
                  onChange={(e) => setForm({ ...form, committee_fee_paid: e.target.value })} /></div>
            </div>

            <div className="space-y-2"><Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Password *</Label>
              <Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>

            {introducers.length > 0 && (
              <div className="space-y-2">
                <Label>పరిచయం చేసిన సభ్యుడు</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={form.introducer_member_id}
                  onChange={(e) => setForm({ ...form, introducer_member_id: e.target.value })}
                >
                  <option value="">— ఎంచుకోండి —</option>
                  {introducers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Submit Request"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (stage === "scan") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="w-full max-w-md p-6 space-y-4">
          <h1 className="text-xl font-bold">QR Scan చేయండి</h1>
          <QrScanner onScan={(t) => verifyCode(t)} onError={(e) => toast.error(e)} />
          <Button variant="outline" onClick={() => setStage("code")} className="w-full">Code Type చేస్తాను</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Organization QR / Code</h1>
          <p className="text-sm text-muted-foreground">మీ Org ఇచ్చిన QR ని scan చేయండి లేదా code type చేయండి</p>
        </div>
        <Button onClick={() => setStage("scan")} className="w-full" variant="default">
          <ScanLine className="h-4 w-4 mr-2" /> Camera తో QR Scan
        </Button>
        <div className="space-y-2">
          <Label>లేదా Code Type చేయండి</Label>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234EFGH" />
            <Button onClick={() => verifyCode(code)} disabled={!code || loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
