import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerOrganization } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, RefreshCw, Plus, X } from "lucide-react";


export const Route = createFileRoute("/org/register")({
  head: () => ({ meta: [{ title: "Register Organization — MBR App" }] }),
  component: OrgRegister,
});

function OrgRegister() {
  const navigate = useNavigate();
  const register = useServerFn(registerOrganization);
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ org: { name: string; org_code: string }; qrDataUrl: string } | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", slogan: "", logo_url: "", gov_reg_number: "",
  });
  const [founders, setFounders] = useState<{ name: string; address: string }[]>([{ name: "", address: "" }]);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        const { error: suErr } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (suErr) throw suErr;
      }
      // ensure session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (siErr) throw siErr;
      }
      const res = await register({ data: {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        slogan: form.slogan || undefined,
        logo_url: form.logo_url || undefined,
        gov_reg_number: form.gov_reg_number || undefined,
        founders: founders.filter((f) => f.name.trim()).map((f) => ({ name: f.name.trim(), address: f.address.trim() || undefined })),
      }});

      setResult(res);
      setStep("done");
      toast.success("Organization registered!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-6 space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold">{result.org.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">QR Code generate అయ్యింది</p>
          </div>
          <div className="flex justify-center">
            <img src={result.qrDataUrl} alt="Org QR" className="w-64 h-64 border rounded-lg" />
          </div>
          <div className="font-mono text-lg tracking-wider bg-muted py-2 rounded">{result.org.org_code}</div>
          <p className="text-sm text-muted-foreground">
            ఈ QR Code మీ సభ్యులకు పంచండి. వారు register అయినప్పుడు ఈ code ఇవ్వాలి.
          </p>
          <div className="flex flex-col gap-2">
            <a href={result.qrDataUrl} download={`${result.org.org_code}.png`}>
              <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" />QR Download</Button>
            </a>
            <Button onClick={() => navigate({ to: "/org/dashboard" })} className="w-full">
              Dashboard కి వెళ్ళండి
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Organization Register</h1>
          <p className="text-sm text-muted-foreground">వివరాలు పూరించండి</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Org Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Slogan</Label>
            <Textarea value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input type="url" placeholder="https://..." value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Government Registration Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.gov_reg_number} onChange={(e) => setForm({ ...form, gov_reg_number: e.target.value })} placeholder="Reg No / Society / Trust No" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>వ్యవస్థాపకులు (Founders) <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setFounders([...founders, { name: "", address: "" }])}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
            {founders.map((f, i) => (
              <div key={i} className="space-y-2 p-3 border rounded-md relative">
                {founders.length > 1 && (
                  <button type="button" onClick={() => setFounders(founders.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Input placeholder="Name" value={f.name}
                  onChange={(e) => setFounders(founders.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input placeholder="Address (optional)" value={f.address}
                  onChange={(e) => setFounders(founders.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Register & Generate QR"}
          </Button>
        </form>
      </Card>
    </div>

  );
}
