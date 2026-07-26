import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyVaradhiProfile, upsertVaradhiProfile } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Upload, MapPin, Check } from "lucide-react";

export const Route = createFileRoute("/varadhi/onboard")({
  component: OnboardPage,
});

function OnboardPage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const upsert = useServerFn(upsertVaradhiProfile);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    primary_role: "seller" as "seller" | "buyer" | "provider",
    business_name: "",
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
    aadhaar_url: "",
    license_url: "",
    store_photo_url: "",
  });
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setAuthed(false); setLoading(false); return;
      }
      setAuthed(true);
      try {
        const res = await getProfile();
        if (res.profile) {
          const p: any = res.profile;
          setForm({ ...form, ...p });
          setStatus(p.verification_status);
        }
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadTo = async (bucket: string, file: File, field: "aadhaar_url" | "license_url" | "store_photo_url") => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, [field]: path }));
    toast.success("అప్‌లోడ్ అయింది");
  };

  const pickLocation = () => {
    if (!navigator.geolocation) { toast.error("Location not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success("లొకేషన్ సెట్ అయింది");
      },
      () => toast.error("Location permission denied"),
    );
  };

  const submit = async () => {
    if (!form.full_name.trim()) return toast.error("పేరు అవసరం");
    if (form.primary_role !== "buyer" && !form.aadhaar_url) return toast.error("Aadhaar అప్‌లోడ్ చేయండి");
    if (form.lat == null || form.lng == null) return toast.error("లొకేషన్ పిన్ చేయండి");
    try {
      await upsert({ data: form as any });
      toast.success("Profile saved. Verification pending.");
      setStatus("pending");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  if (loading) return <div className="p-6 text-center text-sm">లోడ్ అవుతోంది…</div>;
  if (!authed) return (
    <div className="mx-auto max-w-md px-4 pt-8 text-center">
      <p className="text-sm">ముందు లాగిన్ అవ్వండి</p>
      <button onClick={() => navigate({ to: "/varadhi/auth" })}
        className="mt-4 rounded-xl bg-[#1e3a8a] px-6 py-2.5 text-white font-semibold">
        లాగిన్
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="text-xl font-bold text-[#1e3a8a]">రిజిస్టర్ అవ్వండి</h1>
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

      <div className="mt-4 space-y-3">
        <Field label="పేరు *">
          <input className={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="మొబైల్ నెంబర్">
          <input className={inp} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>

        <Field label="మీ పాత్ర ఎంచుకోండి *">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "seller", te: "అమ్మకందారు", c: "#16a34a" },
              { v: "buyer", te: "కొనుగోలుదారు", c: "#2563eb" },
              { v: "provider", te: "ట్రాన్స్ / సర్వీస్", c: "#f97316" },
            ].map((r) => (
              <button key={r.v} onClick={() => setForm({ ...form, primary_role: r.v as any })}
                className={`rounded-xl py-2.5 text-[11px] font-semibold text-white`}
                style={{ background: form.primary_role === r.v ? r.c : "#94a3b8" }}>
                {r.te}
              </button>
            ))}
          </div>
        </Field>

        <Field label="వ్యాపార పేరు / వ్యక్తిగత పేరు">
          <input className={inp} value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        </Field>
        <Field label="వ్యాపార చిరునామా">
          <input className={inp} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="ఊరు / City">
          <input className={inp} value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>

        <Field label="లొకేషన్ పిన్ చేయండి *">
          <button onClick={pickLocation}
            className="w-full rounded-xl bg-[#16a34a] py-2.5 text-white font-semibold flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            {form.lat != null ? `✓ ${form.lat.toFixed(4)}, ${form.lng!.toFixed(4)}` : "నా లొకేషన్ ఉపయోగించండి"}
          </button>
        </Field>

        <ProofField label="Aadhaar Card *" file={form.aadhaar_url}
          onFile={(f) => uploadTo("varadhi-proofs", f, "aadhaar_url")} />
        {form.primary_role === "provider" && (
          <ProofField label="Driving License / Vehicle RC" file={form.license_url}
            onFile={(f) => uploadTo("varadhi-proofs", f, "license_url")} />
        )}
        {form.primary_role === "seller" && (
          <ProofField label="వ్యాపార లైసెన్స్ / స్టోర్ ఫోటో (optional)" file={form.store_photo_url}
            onFile={(f) => uploadTo("varadhi-proofs", f, "store_photo_url")} />
        )}

        <button onClick={submit}
          className="w-full mt-4 rounded-xl bg-[#1e3a8a] py-3 text-white font-bold shadow-md">
          పూర్తి చేయండి
        </button>

        <p className="text-[10px] text-[#1e3a8a]/60 mt-2">
          మీ Aadhaar & లొకేషన్ verification కోసం Admin పరిశీలిస్తారు.
        </p>
      </div>
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
        <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
    </Field>
  );
}
