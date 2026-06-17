import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateOrgCode, submitMemberRequest } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, ScanLine, RefreshCw } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";

export const Route = createFileRoute("/member/register")({
  head: () => ({ meta: [{ title: "Member Registration — MBR App" }] }),
  component: MemberRegister,
});

function MemberRegister() {
  const navigate = useNavigate();
  const validate = useServerFn(validateOrgCode);
  const submit = useServerFn(submitMemberRequest);

  const [stage, setStage] = useState<"code" | "scan" | "form" | "done">("code");
  const [code, setCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

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
      setStage("form");
    } finally {
      setLoading(false);
    }
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
      await submit({ data: { code, name: form.name, email: form.email, phone: form.phone || undefined } });
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-tricolor">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{orgName}</h1>
            <p className="text-sm text-muted-foreground">మీ details ఇవ్వండి</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Password *</Label><Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
