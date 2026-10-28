import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyVaradhiProfile, upsertVaradhiProfile } from "@/lib/varadhi.functions";
import { validateReferralCode } from "@/lib/varadhi-partner.functions";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isProfileLocked, registrationComplete } from "@/lib/varadhi-profile";

const OCCUPATIONS = [
  "వ్యాపారం",
  "వ్యవసాయం",
  "టెక్నీషియన్",
  "డ్రైవర్",
  "డాక్టర్",
  "ఇంజినీర్",
  "లాయర్",
  "గవర్నమెంట్ జాబ్",
  "ప్రైవేట్ జాబ్",
  "ఇతర",
];

export function VaradhiRegistrationForm({
  showRewardsLink = true,
  onSaved,
}: {
  showRewardsLink?: boolean;
  onSaved?: () => void;
}) {
  const getProfile = useServerFn(getMyVaradhiProfile);
  const upsert = useServerFn(upsertVaradhiProfile);
  const checkReferral = useServerFn(validateReferralCode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    photo_url: "",
    aadhaar_url: "",
    house_number: "",
    city: "",
    mandal: "",
    district: "",
    state: "Andhra Pradesh",
    occupation: "",
    referral_code: "",
  });
  const [occupationOther, setOccupationOther] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        if (res.profile) {
          const p: any = res.profile;
          setForm((f) => ({
            ...f,
            full_name: p.full_name ?? "",
            phone: p.phone ?? "",
            photo_url: p.photo_url ?? "",
            aadhaar_url: p.aadhaar_url ?? "",
            house_number: p.house_number ?? p.address ?? "",
            city: p.city ?? "",
            mandal: p.mandal ?? "",
            district: p.district ?? "",
            state: p.state ?? "Andhra Pradesh",
            occupation: p.occupation?.startsWith("ఇతర") ? "ఇతర" : (p.occupation ?? ""),
            referral_code: p.referral_code_used ?? "",
          }));
          if (p.occupation?.startsWith("ఇతర:")) setOccupationOther(p.occupation.slice(5).trim());
          setStatus(p.verification_status);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadTo = async (file: File, field: "photo_url" | "aadhaar_url") => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("varadhi-proofs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, [field]: path }));
    toast.success("అప్‌లోడ్ అయింది");
  };

  const complete = registrationComplete(form, occupationOther);
  const locked = isProfileLocked(status);

  const submit = async () => {
    if (locked) return;
    if (!complete) return toast.error("అన్ని వివరాలు పూర్తి చేయండి");
    setSaving(true);
    try {
      let referred_partner_id: string | null = null;
      const refCode = form.referral_code.trim().toUpperCase();
      if (refCode) {
        const r: any = await checkReferral({ data: { code: refCode } });
        if (!r.valid) { toast.error("రెఫరల్ కోడ్ చెల్లదు"); setSaving(false); return; }
        referred_partner_id = r.partner.id;
      }
      await upsert({
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          photo_url: form.photo_url,
          aadhaar_url: form.aadhaar_url,
          house_number: form.house_number.trim(),
          address: form.house_number.trim(),
          address_type: "home",
          city: form.city.trim(),
          mandal: form.mandal.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          occupation: form.occupation === "ఇతర" ? `ఇతర: ${occupationOther.trim()}` : form.occupation,
          primary_role: "buyer",
          referral_code_used: refCode || null,
          referred_partner_id,
        } as any,
      });
      toast.success("రిజిస్ట్రేషన్ పంపబడింది. అడ్మిన్ ఆమోదం కోసం వేచి ఉండండి.");
      setStatus("pending");
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-sm">లోడ్ అవుతోంది…</div>;

  return (
    <div>
      {showRewardsLink && (
        <a
          href="/varadhi/rewards"
          className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#dc2626] px-4 py-3 text-white shadow-md active:scale-[0.99]"
        >
          <span className="text-sm font-bold">🎁 బహుమతులు & పాయింట్లు</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">చూడండి</span>
        </a>
      )}

      {status && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
          status === "approved" ? "bg-green-100 text-green-700" :
          status === "rejected" ? "bg-red-100 text-red-700" :
          "bg-yellow-100 text-yellow-800"
        }`}>
          {status === "approved" && <Check className="h-3 w-3" />}
          Status: {status}
        </div>
      )}

      {locked ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-foreground">
          {[["పేరు", form.full_name], ["ఫోన్ నెంబర్", form.phone], ["అడ్రస్", form.house_number], ["గ్రామం పేరు", form.city], ["మండలం", form.mandal], ["జిల్లా", form.district], ["రాష్ట్రం", form.state], ["వృత్తి", form.occupation === "ఇతర" ? occupationOther : form.occupation]].map(([label, value]) => (
            <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd data-notranslit className="break-words">{value || "—"}</dd></div>
          ))}
        </dl>
      ) : <>
      <div className="mt-4 space-y-3">
        <Field label="పేరు *">
          <input className={inp} value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>

        <ProofField label="ఫోటో (ఐచ్ఛికం)" file={form.photo_url}
          onFile={(f) => uploadTo(f, "photo_url")} />

        <Field label="అడ్రస్ — ఇంటి నెంబర్ + వీధి నెంబర్ *">
          <input className={inp} placeholder="ఉదా: 1-24/A, గాంధీ వీధి"
            value={form.house_number}
            onChange={(e) => setForm({ ...form, house_number: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="గ్రామం పేరు *">
            <input className={inp} value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="మండలం *">
            <input className={inp} value={form.mandal}
              onChange={(e) => setForm({ ...form, mandal: e.target.value })} />
          </Field>
          <Field label="జిల్లా *">
            <input className={inp} value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </Field>
          <Field label="రాష్ట్రం *">
            <input className={inp} value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
        </div>

        <ProofField label="ఆధార్ కార్డు *" file={form.aadhaar_url}
          onFile={(f) => uploadTo(f, "aadhaar_url")} />

        <Field label="ఫోన్ నెంబర్ *">
          <input className={inp} inputMode="numeric" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>

        <Field label="వృత్తి *">
          <select className={inp} value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}>
            <option value="">-- ఎంచుకోండి --</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {form.occupation === "ఇతర" && (
            <input className={inp + " mt-2"} placeholder="మీ వృత్తి రాయండి"
              value={occupationOther}
              onChange={(e) => setOccupationOther(e.target.value)} />
          )}
        </Field>

        <Field label="రెఫరల్ కోడ్ (ఉంటే)">
          <input className={inp} placeholder="ఉదా: MCHIT1234"
            value={form.referral_code}
            onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })} />
          <p className="mt-1 text-[10px] text-[#1e3a8a]/60">
            మండల / జిల్లా / రాష్ట్ర ఇన్‌ఛార్జ్ ఇచ్చిన కోడ్ ఉంటే ఇక్కడ ఇవ్వండి.
          </p>
        </Field>
      </div>

      <Button onClick={submit} disabled={!complete || saving} className="w-full mt-5">
        {saving ? "పంపుతోంది…" : status ? "వివరాలు సేవ్ చేయండి" : "రిజిస్టర్"}
      </Button>

      <p className="text-[10px] text-[#1e3a8a]/60 mt-2">
        మీ ఆధార్ & వివరాలను Admin పరిశీలించి ఆమోదిస్తారు.
      </p>
      </>}
    </div>
  );
}

const inp = "w-full rounded-xl border border-[#1e3a8a]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1e3a8a]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-[#1e3a8a]/80">{label}</label><div className="mt-1">{children}</div></div>;
}

function ProofField({ label, file, onFile }: { label: string; file?: string; onFile: (f: File) => void }) {
  return (
    <Field label={label}>
      <label className="flex items-center justify-between rounded-xl border border-dashed border-[#1e3a8a]/30 bg-white px-3 py-3 text-xs cursor-pointer">
        <span className="truncate">{file ? "✓ Uploaded" : "Choose file"}</span>
        <Upload className="h-4 w-4" />
        <input type="file" accept="image/*,application/pdf" hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
    </Field>
  );
}
