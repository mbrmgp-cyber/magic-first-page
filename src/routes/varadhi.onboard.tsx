import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyVaradhiProfile, upsertVaradhiProfile } from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Upload, MapPin, Check, X } from "lucide-react";

export const Route = createFileRoute("/varadhi/onboard")({
  component: OnboardPage,
});

type Role = "seller" | "buyer" | "provider";
type SubType = "transport" | "technician" | "service";

const SPECIALTIES: Record<SubType, string[]> = {
  transport: [
    "2 Wheeler (బైక్)",
    "3 Wheeler (ఆటో)",
    "4 Wheeler (కారు / పికప్)",
    "6 Wheeler (లారీ)",
    "8+ Wheeler (పెద్ద లారీ)",
    "Tractor / ట్రాక్టర్",
    "Harvester / హార్వెస్టర్",
    "Other / ఇతర",
  ],
  technician: [
    "Electrician / ఎలక్ట్రీషియన్",
    "Plumber / ప్లంబర్",
    "Mechanic / మెకానిక్",
    "AC / Fridge Repair",
    "TV / Mobile Repair",
    "Carpenter / వడ్రంగి",
    "Welder / వెల్డర్",
    "Painter / పెయింటర్",
    "Mason / మేస్త్రీ",
    "Other / ఇతర",
  ],
  service: [
    "ఇంటి పని (Home / Domestic)",
    "వ్యవసాయ పని (Farm / Agri labour)",
    "షాప్ లో పని (Shop worker)",
    "ఆఫీసు లో పని (Office staff)",
    "బిల్డింగ్ పని (Construction)",
    "క్లీనింగ్ / తోట పని",
    "బేబీ / వృద్ధుల సంరక్షణ",
    "Cooking / Catering",
    "Security Guard",
    "Other / ఇతర",
  ],
};


function OnboardPage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const upsert = useServerFn(upsertVaradhiProfile);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    photo_url: "",
    aadhaar_url: "",
    primary_role: "" as "" | Role,
    provider_sub_type: "" as "" | SubType,
    business_name: "",
    address_type: "home" as "home" | "shop",
    house_number: "",
    shop_name: "",
    address: "",
    city: "",
    mandal: "",
    district: "",
    state: "Andhra Pradesh",
    lat: null as number | null,
    lng: null as number | null,
    license_url: "",
    store_photo_url: "",
    vehicle_photo_url: "",
    experience_years: null as number | null,
    certificates_urls: [] as string[],
    provider_specialty: "",
  });

  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      try {
        const res = await getProfile();
        if (res.profile) {
          const p: any = res.profile;
          setForm((f) => ({ ...f, ...p, certificates_urls: p.certificates_urls ?? [] }));
          setStatus(p.verification_status);
        }
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadTo = async (bucket: string, file: File, field: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, [field]: path }));
    toast.success("అప్‌లోడ్ అయింది");
  };

  const uploadCert = async (file: File) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/cert-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("varadhi-proofs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, certificates_urls: [...f.certificates_urls, path] }));
    toast.success("సర్టిఫికెట్ యాడ్ అయింది");
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

  // ---- Step 1 (basic identity) validation
  const step1Ok =
    form.full_name.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    form.photo_url.length > 0 &&
    form.aadhaar_url.length > 0;

  const submit = async () => {
    if (!step1Ok) return toast.error("పేరు / ఫోన్ / ఫోటో / ఆధార్ కంప్లీట్ చేయండి");
    if (!form.primary_role) return toast.error("పాత్ర ఎంచుకోండి");
    if (form.lat == null || form.lng == null) return toast.error("లొకేషన్ పిన్ చేయండి");
    if (!form.address.trim() || !form.city.trim()) return toast.error("అడ్రస్ / ఊరు తప్పనిసరి");

    if (form.primary_role === "provider") {
      if (!form.provider_sub_type) return toast.error("Transport / Technician / Service ఎంచుకోండి");
      if (!form.provider_specialty) return toast.error("స్పెషాలిటీ / కేటగిరీ ఎంచుకోండి");
      if (form.provider_sub_type === "transport") {
        if (!form.vehicle_photo_url) return toast.error("బండి ఫోటో అప్‌లోడ్ చేయండి");
        if (!form.license_url) return toast.error("డ్రైవింగ్ లైసెన్స్ ఫోటో అప్‌లోడ్ చేయండి");
      }
      if (form.provider_sub_type === "technician") {
        if (form.experience_years == null) return toast.error("ఎక్స్‌పీరియన్స్ ఎంటర్ చేయండి");
        if (form.certificates_urls.length === 0) return toast.error("కనీసం ఒక సర్టిఫికెట్ అప్‌లోడ్ చేయండి");
      }
    }


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
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
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

      {/* ---------- STEP 1: Basic identity ---------- */}
      <SectionTitle n={1} label="మీ వివరాలు" />
      <div className="space-y-3">
        <Field label="పేరు *">
          <input className={inp} value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>

        <ProofField label="మీ ఫోటో *" file={form.photo_url}
          onFile={(f) => uploadTo("varadhi-proofs", f, "photo_url")} />

        <Field label="మొబైల్ నెంబర్ *">
          <input className={inp} inputMode="numeric" value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>

        <ProofField label="ఆధార్ కార్డు *" file={form.aadhaar_url}
          onFile={(f) => uploadTo("varadhi-proofs", f, "aadhaar_url")} />
      </div>

      {/* ---------- STEP 2: Role ---------- */}
      <SectionTitle n={2} label="మీ పాత్ర ఎంచుకోండి" locked={!step1Ok} />
      <div aria-disabled={!step1Ok} className={!step1Ok ? "opacity-40 pointer-events-none" : ""}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "seller", te: "అమ్మకందారు", c: "#16a34a" },
            { v: "buyer", te: "కొనుగోలుదారు", c: "#2563eb" },
            { v: "provider", te: "ట్రాన్స్ / సర్వీస్", c: "#f97316" },
          ].map((r) => (
            <button key={r.v} onClick={() => setForm({ ...form, primary_role: r.v as Role })}
              className="rounded-xl py-2.5 text-[11px] font-semibold text-white"
              style={{ background: form.primary_role === r.v ? r.c : "#94a3b8" }}>
              {r.te}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- STEP 3: Role-specific ---------- */}
      {form.primary_role && (
        <>
          <SectionTitle n={3} label="వివరాలు & లొకేషన్" />
          <div className="space-y-3">
            <Field label="అడ్రస్ *">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { v: "home", te: "ఇల్లు" },
                  { v: "shop", te: "షాప్" },
                ].map((a) => (
                  <button key={a.v}
                    onClick={() => setForm({ ...form, address_type: a.v as "home" | "shop" })}
                    className="rounded-xl py-2 text-xs font-semibold text-white"
                    style={{ background: form.address_type === a.v ? "#1e3a8a" : "#94a3b8" }}>
                    {a.te}
                  </button>
                ))}
              </div>
              {form.address_type === "shop" ? (
                <input className={inp} placeholder="షాప్ పేరు"
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
              ) : (
                <input className={inp} placeholder="ఇంటి నెంబర్"
                  value={form.house_number}
                  onChange={(e) => setForm({ ...form, house_number: e.target.value })} />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ఊరు / Village *">
                <input className={inp} value={form.city ?? ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="మండలము">
                <input className={inp} value={form.mandal ?? ""}
                  onChange={(e) => setForm({ ...form, mandal: e.target.value })} />
              </Field>
              <Field label="జిల్లా">
                <input className={inp} value={form.district ?? ""}
                  onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </Field>
              <Field label="రాష్ట్రం">
                <input className={inp} value={form.state ?? ""}
                  onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </Field>
            </div>

            <Field label="లొకేషన్ పిన్ చేయండి *">
              <button onClick={pickLocation}
                className="w-full rounded-xl bg-[#16a34a] py-2.5 text-white font-semibold flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                {form.lat != null ? `✓ ${form.lat.toFixed(4)}, ${form.lng!.toFixed(4)}` : "నా లొకేషన్ ఉపయోగించండి"}
              </button>
            </Field>

            {form.primary_role === "seller" && (
              <ProofField label="స్టోర్ / ప్రొడక్ట్ ఫోటో (optional)" file={form.store_photo_url}
                onFile={(f) => uploadTo("varadhi-proofs", f, "store_photo_url")} />
            )}

            {form.primary_role === "provider" && (
              <>
                <Field label="Type ఎంచుకోండి *">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "transport", te: "ట్రాన్స్‌పోర్ట్" },
                      { v: "technician", te: "టెక్నీషియన్" },
                      { v: "service", te: "సర్వీస్" },
                    ].map((s) => (
                      <button key={s.v}
                        onClick={() => setForm({ ...form, provider_sub_type: s.v as SubType, provider_specialty: "" })}
                        className="rounded-xl py-2 text-[11px] font-semibold text-white"
                        style={{ background: form.provider_sub_type === s.v ? "#f97316" : "#94a3b8" }}>
                        {s.te}
                      </button>
                    ))}
                  </div>
                </Field>

                {form.provider_sub_type && (
                  <Field label="కేటగిరీ / స్పెషాలిటీ ఎంచుకోండి *">
                    <select className={inp} value={form.provider_specialty}
                      onChange={(e) => setForm({ ...form, provider_specialty: e.target.value })}>
                      <option value="">-- ఎంచుకోండి --</option>
                      {SPECIALTIES[form.provider_sub_type].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                )}


                {form.provider_sub_type === "transport" && (
                  <>
                    <ProofField label="బండి ఫోటో *" file={form.vehicle_photo_url}
                      onFile={(f) => uploadTo("varadhi-proofs", f, "vehicle_photo_url")} />
                    <ProofField label="డ్రైవింగ్ లైసెన్స్ / RC *" file={form.license_url}
                      onFile={(f) => uploadTo("varadhi-proofs", f, "license_url")} />
                  </>
                )}

                {form.provider_sub_type === "technician" && (
                  <>
                    <Field label="ఎక్స్‌పీరియన్స్ (సంవత్సరాలు) *">
                      <input className={inp} type="number" min={0}
                        value={form.experience_years ?? ""}
                        onChange={(e) => setForm({ ...form, experience_years: e.target.value ? Number(e.target.value) : null })} />
                    </Field>
                    <Field label="సర్టిఫికెట్స్ * (ఒకటి కంటే ఎక్కువ)">
                      <label className="flex items-center justify-between rounded-xl border border-dashed border-[#1e3a8a]/30 bg-white px-3 py-3 text-xs cursor-pointer">
                        <span>+ సర్టిఫికెట్ యాడ్ చేయండి</span>
                        <Upload className="h-4 w-4" />
                        <input type="file" accept="image/*,application/pdf" hidden
                          onChange={(e) => e.target.files?.[0] && uploadCert(e.target.files[0])} />
                      </label>
                      {form.certificates_urls.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {form.certificates_urls.map((c, i) => (
                            <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                              <span className="truncate">✓ Certificate {i + 1}</span>
                              <button onClick={() => setForm((f) => ({
                                ...f, certificates_urls: f.certificates_urls.filter((_, j) => j !== i),
                              }))}>
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      <button onClick={submit}
        disabled={!step1Ok || !form.primary_role}
        className="w-full mt-6 rounded-xl bg-[#1e3a8a] py-3 text-white font-bold shadow-md disabled:opacity-50">
        పూర్తి చేయండి
      </button>

      <p className="text-[10px] text-[#1e3a8a]/60 mt-2">
        మీ Aadhaar & లొకేషన్ verification కోసం Admin పరిశీలిస్తారు.
      </p>
    </div>
  );
}

const inp = "w-full rounded-xl border border-[#1e3a8a]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1e3a8a]";

function SectionTitle({ n, label, locked }: { n: number; label: string; locked?: boolean }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${locked ? "bg-slate-400" : "bg-[#1e3a8a]"}`}>{n}</span>
      <h2 className="text-sm font-bold text-[#1e3a8a]">{label}</h2>
      {locked && <span className="text-[10px] text-slate-500">— ముందు step 1 పూర్తి చేయండి</span>}
    </div>
  );
}

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
