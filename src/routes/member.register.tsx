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
import { QrCode, ScanLine, RefreshCw, Camera, Plus, CheckCircle2, ShieldCheck } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/member/register")({
  head: () => ({ meta: [{ title: "Member Registration — MBR App" }] }),
  component: MemberRegister,
});

function BiLabel({ en, te, required }: { en: string; te: string; required?: boolean }) {
  return (
    <Label className="text-zinc-200 leading-tight block">
      <span className="font-semibold">{en}{required && " *"}</span>
      <span className="block text-[11px] text-zinc-400">{te}</span>
    </Label>
  );
}

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
  const [showBank, setShowBank] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    father_name: "",
    village: "",
    pin_code: "",
    email: "",
    phone: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
  });

  async function verifyCode(c: string) {
    setLoading(true);
    try {
      const res = await validate({ data: { code: c } });
      if (!res.valid) { toast.error("Invalid QR / Code"); return; }
      setCode(c.trim().toUpperCase());
      setOrgName(res.org.name);
      setOrgId(res.org.id);
      setStage("form");
    } finally { setLoading(false); }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const generatedPassword = `MBR-${crypto.randomUUID()}`;
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        const signup = await supabase.auth.signUp({
          email: form.email, password: generatedPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signup.error && !/already/i.test(signup.error.message)) throw signup.error;
        if (signup.error) {
          // Already registered → send magic link
          const ml = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { emailRedirectTo: window.location.origin + "/member/pending" },
          });
          if (ml.error) throw ml.error;
          toast.message("A login link has been sent to your email.");
          setStage("done");
          return;
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // signUp without auto-confirm — send magic link
        await supabase.auth.signInWithOtp({
          email: form.email,
          options: { emailRedirectTo: window.location.origin + "/member/pending" },
        });
        toast.message("Login link sent — open it to complete registration.");
        setStage("done");
        return;
      }

      let photo_url: string | undefined;
      if (photoFile) {
        const uid = (await supabase.auth.getUser()).data.user?.id;
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
          code,
          name: `${form.first_name} ${form.last_name}`.trim(),
          email: form.email,
          phone: form.phone || undefined,
          photo_url,
          father_name: form.father_name || undefined,
          address: [form.village, form.pin_code].filter(Boolean).join(", ") || undefined,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          village: form.village || undefined,
          pin_code: form.pin_code || undefined,
          bank_name: showBank ? form.bank_name || undefined : undefined,
          bank_account_number: showBank ? form.bank_account_number || undefined : undefined,
          bank_ifsc: showBank ? form.bank_ifsc || undefined : undefined,
        },
      });
      setStage("done");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setLoading(false); }
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7 space-y-5 text-center bg-zinc-950 border-zinc-800 shadow-[0_0_40px_rgba(255,140,40,0.15)]">
          <div className="mx-auto h-16 w-16 rounded-full bg-[#ff8c28]/15 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-[#ff8c28]" />
          </div>
          <h1 className="text-2xl font-bold">Submitted for Approval</h1>
          <p className="text-zinc-300 leading-relaxed">
            Your details are under verification. Once approved by the society,
            an access link will be sent to your email.
          </p>
          <p className="text-xs text-zinc-500">మీ వివరాలు సమీక్షలో ఉన్నాయి. సొసైటీ ఆమోదించిన తర్వాత యాక్సెస్ లింక్ ఈమెయిల్‌కు పంపబడుతుంది.</p>
          <Button onClick={() => navigate({ to: "/member/pending" })}
            className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.4)]">
            Check Status
          </Button>
        </Card>
      </div>
    );
  }

  if (stage === "scan") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-4 bg-zinc-950 border-zinc-800">
          <h1 className="text-xl font-bold">Scan Society QR / సొసైటీ క్యూఆర్</h1>
          <QrScanner onScan={(t) => verifyCode(t)} onError={(e) => toast.error(e)} />
          <Button variant="outline" onClick={() => setStage("code")}
            className="w-full bg-transparent border-zinc-700 text-white hover:bg-zinc-900">
            Type code instead
          </Button>
        </Card>
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-12">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Member Registration</h1>
            <LanguageToggle />
          </div>
          <p className="text-xs text-zinc-400 -mt-2">సభ్యుని రిజిస్ట్రేషన్ · {orgName}</p>

          <Card className="p-5 space-y-5 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.1)]">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-2 border-dashed border-[#ff8c28]/50 overflow-hidden bg-zinc-900 flex items-center justify-center">
                    {photoPreview
                      ? <img src={photoPreview} className="h-full w-full object-cover" />
                      : <Camera className="w-7 h-7 text-[#ff8c28]" />}
                  </div>
                  <input type="file" accept="image/*" capture="user" onChange={onPhoto}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <span className="text-xs text-zinc-400">Upload Member Photo / సభ్యుడి ఫోటో</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <BiLabel en="First Name" te="సభ్యుడి పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.first_name} required
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <BiLabel en="Last Name" te="ఇంటి పేరు" required />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.last_name} required
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Father's Name" te="తండ్రి పేరు" />
                <Input className="bg-zinc-900 border-zinc-700 text-white"
                  value={form.father_name}
                  onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <BiLabel en="Village" te="గ్రామం పేరు" />
                  <Input className="bg-zinc-900 border-zinc-700 text-white"
                    value={form.village}
                    onChange={(e) => setForm({ ...form, village: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <BiLabel en="Pin Code" te="పిన్ నెంబర్" />
                  <Input className="bg-zinc-900 border-zinc-700 text-white" inputMode="numeric"
                    value={form.pin_code}
                    onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Email Address" te="ఈమెయిల్" required />
                <Input type="email" className="bg-zinc-900 border-zinc-700 text-white"
                  value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <BiLabel en="Phone Number" te="ఫోన్ నెంబర్" />
                <Input className="bg-zinc-900 border-zinc-700 text-white" inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <button type="button" onClick={() => setShowBank((v) => !v)}
                  className="w-full flex items-center justify-between text-left">
                  <div>
                    <p className="text-sm font-semibold text-white">For Loan Disbursements</p>
                    <p className="text-[11px] text-zinc-400">లోన్ అవసరం అనుకుంటే (ఐచ్ఛికం)</p>
                  </div>
                  <Plus className={`h-5 w-5 text-[#ff8c28] transition-transform ${showBank ? "rotate-45" : ""}`} />
                </button>
                {showBank && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <BiLabel en="Bank Name" te="బ్యాంకు పేరు" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <BiLabel en="Account Number" te="ఖాతా నెంబర్" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_account_number}
                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <BiLabel en="IFSC Code" te="IFSC కోడ్" />
                      <Input className="bg-zinc-900 border-zinc-700 text-white"
                        value={form.bank_ifsc}
                        onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading}
                className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold shadow-[0_0_24px_rgba(255,140,40,0.45)]">
                {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</> : <><ShieldCheck className="h-4 w-4" /> Submit for Approval</>}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // stage === "code"
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-6 bg-zinc-950 border-zinc-800 shadow-[0_0_30px_rgba(255,140,40,0.15)]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Society QR / Code</h1>
          <LanguageToggle />
        </div>
        <p className="text-sm text-zinc-400 -mt-2">
          Scan or Enter Society QR Code<br />
          <span className="text-zinc-500 text-xs">సంస్థ క్యూఆర్ కోడ్ స్కాన్ చేయండి లేదా టైప్ చేయండి</span>
        </p>
        <Button onClick={() => setStage("scan")}
          className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.45)]">
          <ScanLine className="h-4 w-4 mr-2" /> Scan QR with Camera
        </Button>
        <div className="space-y-2">
          <Label className="text-zinc-200">Or type the code</Label>
          <div className="flex gap-2">
            <Input value={code}
              className="bg-zinc-900 border-zinc-700 text-white"
              onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234EFGH" />
            <Button onClick={() => verifyCode(code)} disabled={!code || loading}
              className="bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
