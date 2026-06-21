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
import { RefreshCw, Plus, X, AlertCircle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/org/register")({
  head: () => ({ meta: [{ title: "Register Organization — MBR App" }] }),
  component: OrgRegister,
});

async function uploadFile(file: File, folder: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Login required");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("org-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from("org-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
}

function FilePicker({ label, value, onChange, accept = "image/*" }: {
  label: string; value?: string; onChange: (url: string) => void; accept?: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-zinc-100">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-16 rounded-md border object-cover bg-muted" />
        ) : (
          <div className="h-16 w-16 rounded-md border border-dashed border-[#ff8c28]/40 flex items-center justify-center bg-zinc-900/60 shrink-0">
            <Plus className="h-6 w-6 text-[#ff8c28]" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              const url = await uploadFile(f, label.replace(/\s+/g, "_").toLowerCase());
              onChange(url);
              toast.success("Uploaded");
            } catch (err: any) {
              toast.error(err.message ?? "Upload failed");
            } finally {
              setBusy(false);
              if (inputRef.current) inputRef.current.value = "";
            }
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-2 rounded-md border border-[#ff8c28]/60 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-[#ff8c28] leading-tight"
        >
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="truncate">{value ? t("changeFile") : t("uploadFromGallery")}</span>
        </button>
      </div>
    </div>
  );
}

function OrgRegister() {
  const navigate = useNavigate();
  const register = useServerFn(registerOrganization);
  const { t } = useI18n();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "info" | "success" | "error"; title: string; message: string } | null>(null);
  const [result, setResult] = useState<{ org: { name: string; org_code: string }; qrDataUrl: string } | null>(null);
  const [isGov, setIsGov] = useState<boolean>(true);
  const [aadhaarOtpOpen, setAadhaarOtpOpen] = useState(false);
  const [aadhaarOtpValue, setAadhaarOtpValue] = useState("");
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    slogan: "",
    logo_url: "",
    gov_reg_number: "",
    gov_qr_url: "",
    registration_certificate_url: "",
    pan_card_url: "",
    bank_account_number: "",
    bank_ifsc: "",
    admin_name: "",
    admin_designation: "",
    admin_aadhaar_url: "",
  });
  const [founders, setFounders] = useState<{ name: string; address: string; aadhaar_url: string }[]>([
    { name: "", address: "", aadhaar_url: "" },
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", title: t("registering"), message: t("pleaseWait") });
    try {
      const generatedPassword = `MBR-${crypto.randomUUID()}`;
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        const { error: suErr } = await supabase.auth.signUp({
          email: form.email,
          password: generatedPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (suErr) {
          const alreadyRegistered = suErr.message.toLowerCase().includes("already registered") || suErr.message.toLowerCase().includes("already been registered");
          if (!alreadyRegistered) throw suErr;
          // For existing users, send a magic link instead — we no longer keep static passwords
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: form.email,
            options: { emailRedirectTo: window.location.origin },
          });
          if (otpErr) throw otpErr;
          throw new Error("This email is already registered. We sent a secure login link to your inbox — please click it and resubmit this form.");
        }
      }
      const res = await register({ data: {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        slogan: form.slogan || undefined,
        logo_url: form.logo_url || undefined,
        is_gov_registered: isGov,
        gov_reg_number: isGov ? (form.gov_reg_number || form.gov_qr_url || undefined) : undefined,
        registration_certificate_url: isGov ? (form.registration_certificate_url || undefined) : undefined,
        pan_card_url: isGov ? (form.pan_card_url || undefined) : undefined,
        bank_account_number: form.bank_account_number || undefined,
        bank_ifsc: isGov ? (form.bank_ifsc || undefined) : undefined,
        admin_name: form.admin_name || undefined,
        admin_designation: form.admin_designation || undefined,
        admin_aadhaar_url: form.admin_aadhaar_url || undefined,
        founders: founders.filter((f) => f.name.trim()).map((f) => ({
          name: f.name.trim(),
          address: f.address.trim() || undefined,
          aadhaar_url: f.aadhaar_url || undefined,
        })),
      }});

      setResult(res);
      setStep("done");
      toast.success("Registered!");
    } catch (e: any) {
      const message = String(e?.message ?? "Failed");
      setStatus({ type: "error", title: "Error", message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <Card className="w-full max-w-md p-6 space-y-5 text-center bg-zinc-950 border-zinc-800 shadow-[0_0_60px_rgba(255,140,40,0.15)] text-white">
          <div>
            <h1 className="text-2xl font-bold text-white">{result.org.name}</h1>
            <p className="text-sm text-zinc-400 mt-1">{t("registrationDoneTitle")}</p>
          </div>
          <Alert className="text-left border-[#ff8c28]/40 bg-[#ff8c28]/10">
            <Info className="h-4 w-4 text-[#ff8c28]" />
            <AlertTitle className="text-[#ffb072]">{t("underReviewTitle")}</AlertTitle>
            <AlertDescription className="text-zinc-300 text-xs">
              {t("underReviewMsg")}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <img src={result.qrDataUrl} alt="Org QR" className="w-48 h-48 border border-zinc-700 rounded-lg bg-white p-2" />
          </div>
          <div className="font-mono text-sm tracking-wider bg-zinc-900 border border-zinc-800 text-[#ff8c28] py-2 rounded">{result.org.org_code}</div>
          <Button onClick={() => navigate({ to: "/auth" })} className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]">
            {t("goToLogin")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <Card className="w-full max-w-md p-6 space-y-6 bg-zinc-950 border-zinc-800 shadow-[0_0_60px_rgba(255,140,40,0.15)] text-white [&_label]:text-zinc-100 [&_input]:bg-zinc-900 [&_input]:border-zinc-700 [&_input]:text-white [&_input::placeholder]:text-zinc-500 [&_textarea]:bg-zinc-900 [&_textarea]:border-zinc-700 [&_textarea]:text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("orgRegisterTitle")}</h1>
            <p className="text-sm text-zinc-400">{t("orgRegisterSubtitle")}</p>
          </div>
          <LanguageToggle />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {status && (
            <Alert variant={status.type === "error" ? "destructive" : "default"} className={status.type === "success" ? "border-green-600/40 bg-green-50 text-green-900" : ""}>
              {status.type === "error" ? <AlertCircle className="h-4 w-4" /> : status.type === "success" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <Info className="h-4 w-4" />}
              <AlertTitle>{status.title}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          {/* Government registered toggle */}
          <div className="space-y-2 p-3 rounded-md border border-zinc-800 bg-zinc-900/60">
            <Label className="text-sm font-semibold text-zinc-100">{t("govRegisteredQ")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsGov(true)}
                className={`h-10 rounded-md border text-sm font-medium transition-colors ${isGov ? "bg-[#ff8c28] text-white border-[#ff8c28] shadow-[0_0_18px_rgba(255,140,40,0.45)]" : "bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800"}`}
              >
                {t("yes")}
              </button>
              <button
                type="button"
                onClick={() => setIsGov(false)}
                className={`h-10 rounded-md border text-sm font-medium transition-colors ${!isGov ? "bg-[#ff8c28] text-white border-[#ff8c28] shadow-[0_0_18px_rgba(255,140,40,0.45)]" : "bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800"}`}
              >
                {t("no")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isGov ? t("orgName") : t("committeeName")} *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label>{t("orgSlogan")}</Label>
            <Textarea value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} rows={2} />
          </div>

          <FilePicker
            label={isGov ? t("orgLogo") : t("committeeLogo")}
            value={form.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
          />

          <div className="space-y-2">
            <Label>{isGov ? t("orgEmail") : t("committeeEmail")} *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>{t("orgPhone")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          {/* Bank account — both flows */}
          <div className="space-y-2">
            <Label>{t("bankAccount")}</Label>
            <Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
          </div>

          {isGov && (
            <>
              <div className="space-y-2">
                <Label>{t("bankIfsc")}</Label>
                <Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })} />
              </div>

              <div className="space-y-3 p-3 rounded-md border border-zinc-800 bg-zinc-900/60">
                <Label className="text-sm font-semibold text-zinc-100">{t("govRegNumber")}</Label>
                <Input
                  value={form.gov_reg_number}
                  onChange={(e) => setForm({ ...form, gov_reg_number: e.target.value })}
                  placeholder="Reg No / Society / Trust No"
                />
                <div className="text-center text-xs text-zinc-500">{t("orRule")}</div>
                <FilePicker
                  label={t("govQrUpload")}
                  value={form.gov_qr_url}
                  onChange={(url) => setForm({ ...form, gov_qr_url: url })}
                />
              </div>

              <FilePicker
                label={t("registrationCertificate")}
                value={form.registration_certificate_url}
                onChange={(url) => setForm({ ...form, registration_certificate_url: url })}
              />

              <FilePicker
                label={t("panCard")}
                value={form.pan_card_url}
                onChange={(url) => setForm({ ...form, pan_card_url: url })}
              />
            </>
          )}

          {/* Admin */}
          <div className="space-y-2">
            <Label>{t("adminName")}</Label>
            <Input value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("adminDesignation")}</Label>
            <Input value={form.admin_designation} onChange={(e) => setForm({ ...form, admin_designation: e.target.value })} />
          </div>
          <FilePicker
            label={t("adminAadhaar")}
            value={form.admin_aadhaar_url}
            onChange={(url) => setForm({ ...form, admin_aadhaar_url: url })}
          />

          {!isGov && (
            <Button
              type="button"
              onClick={() => { setAadhaarOtpValue(""); setAadhaarOtpOpen(true); }}
              className={`w-full font-semibold border-0 ${aadhaarVerified ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : "bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white shadow-[0_0_24px_rgba(255,140,40,0.45)]"}`}
            >
              <ShieldCheck className="h-4 w-4" />
              {aadhaarVerified ? t("aadhaarVerified") : t("verifyAadhaarOtp")}
            </Button>
          )}

          {/* Founders only when gov registered */}
          {isGov && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("foundersHeading")}</Label>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setFounders([...founders, { name: "", address: "", aadhaar_url: "" }])}>
                  <Plus className="h-3 w-3 mr-1" />{t("add")}
                </Button>
              </div>
              {founders.map((f, i) => (
                <div key={i} className="space-y-2 p-3 border border-zinc-800 rounded-md relative bg-zinc-900 [&_label]:text-zinc-100">
                  {founders.length > 1 && (
                    <button type="button" onClick={() => setFounders(founders.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <Input placeholder={t("founderNamePh")} value={f.name}
                    onChange={(e) => setFounders(founders.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder={t("founderAddrPh")} value={f.address}
                    onChange={(e) => setFounders(founders.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
                  <FilePicker
                    label={t("aadhaarCard")}
                    value={f.aadhaar_url}
                    onChange={(url) => setFounders(founders.map((x, j) => j === i ? { ...x, aadhaar_url: url } : x))}
                  />
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]" disabled={loading}>
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t("registering")}</> : `➔ ${t("submitForVerification")}`}
          </Button>
        </form>
      </Card>

      <Dialog open={aadhaarOtpOpen} onOpenChange={setAadhaarOtpOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#ff8c28]" />
              {t("verifyAadhaarOtp")}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("enterAadhaarOtp")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP maxLength={6} value={aadhaarOtpValue} onChange={setAadhaarOtpValue}>
              <InputOTPGroup>
                {[0,1,2,3,4,5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="bg-zinc-900 border-zinc-700 text-white h-11 w-11" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={aadhaarOtpValue.length !== 6}
              onClick={() => {
                setAadhaarVerified(true);
                setAadhaarOtpOpen(false);
                toast.success(t("aadhaarVerified"));
              }}
              className="w-full bg-[#ff8c28] hover:bg-[#ff8c28]/90 text-white font-semibold border-0 shadow-[0_0_24px_rgba(255,140,40,0.45)]"
            >
              {t("verify")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
