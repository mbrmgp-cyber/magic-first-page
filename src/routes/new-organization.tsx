import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { RefreshCw, CheckCircle2, Building2 } from "lucide-react";

export const Route = createFileRoute("/new-organization")({
  head: () => ({
    meta: [
      { title: "Register New Organization — MBR APP" },
      { name: "description", content: "Register your society or organization on the MBR APP platform." },
    ],
  }),
  component: NewOrgRegister,
});

function NewOrgRegister() {
  const navigate = useNavigate();
  const register = useServerFn(registerOrganization);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ name: string; org_code: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    gov_reg_number: "",
    address: "",
    email: "",
    phone: "",
    slogan: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Society name and email are required");
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        const generatedPassword = `MBR-${crypto.randomUUID()}`;
        const { error: suErr } = await supabase.auth.signUp({
          email: form.email,
          password: generatedPassword,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (suErr) {
          const alreadyRegistered = /already.*registered/i.test(suErr.message);
          if (!alreadyRegistered) throw suErr;
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
          if (otpErr) throw otpErr;
          throw new Error("This email is already registered. We sent a secure login link — click it then return here to submit again.");
        }
      }
      const res = await register({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          slogan: form.slogan.trim() || undefined,
          address: form.address.trim() || undefined,
          gov_reg_number: form.gov_reg_number.trim() || undefined,
          is_gov_registered: !!form.gov_reg_number.trim(),
          founders: [],
        },
      });
      setDone({ name: res.org.name, org_code: res.org.org_code });
      toast.success("Registered! Pending Super Admin approval.");
    } catch (e: any) {
      toast.error(String(e?.message ?? "Failed"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
        <Card className="w-full max-w-md p-6 space-y-5 text-center bg-zinc-950 border-zinc-800 text-white shadow-[0_0_60px_rgba(255,140,40,0.2)]">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold">{done.name}</h1>
            <p className="text-sm text-zinc-400 mt-1">Registration submitted successfully</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
            <p className="text-xs text-zinc-500 mb-1">Your Organization Code</p>
            <p className="font-mono text-lg tracking-wider text-[#ff8c28]">{done.org_code}</p>
          </div>
          <p className="text-xs text-zinc-400">
            Your organization is now visible to the MBR Super Admin and is pending approval.
            You will receive a login link by email once approved.
          </p>
          <Button onClick={() => navigate({ to: "/auth" })} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      <Card className="w-full max-w-md p-6 space-y-5 bg-zinc-950 border-zinc-800 text-white shadow-[0_0_60px_rgba(255,140,40,0.2)] [&_label]:text-zinc-100 [&_input]:bg-zinc-900 [&_input]:border-zinc-700 [&_input]:text-white [&_textarea]:bg-zinc-900 [&_textarea]:border-zinc-700 [&_textarea]:text-white">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff8c28]/15 border border-[#ff8c28]/40">
            <Building2 className="h-6 w-6 text-[#ff8c28]" />
          </div>
          <h1 className="text-2xl font-bold">New Organization Registration</h1>
          <p className="text-sm text-zinc-400">Register your society on the MBR APP platform</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Society / Organization Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-1.5">
            <Label>Registration Number</Label>
            <Input
              value={form.gov_reg_number}
              onChange={(e) => setForm({ ...form, gov_reg_number: e.target.value })}
              placeholder="Govt. registration / society / trust no."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              placeholder="Village / Town, District, State"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Slogan / Motto</Label>
            <Textarea value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} rows={2} />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]"
          >
            {loading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              "➔ Submit Registration"
            )}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Already registered?{" "}
            <Link to="/auth" className="text-[#ff8c28] hover:underline">Login here</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
