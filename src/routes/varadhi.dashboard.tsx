import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyVaradhiProfile, listListings,
  upsertListing, toggleListingStock, deleteListing,
  type VaradhiListing,
} from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Plus, Trash2, Camera, Pencil, Save } from "lucide-react";

export const Route = createFileRoute("/varadhi/dashboard")({
  component: UpdateBoard,
});

const POST_TYPES = [
  { id: "business", te: "వ్యాపారం" },
  { id: "service", te: "సేవలు" },
  { id: "free", te: "ఉచిత సేవలు" },
];

const BUSINESS_CATS = [
  { id: "realestate", te: "ప్లాట్లు & భూములు", color: "#7c3aed" },
  { id: "fresh", te: "తాజా వస్తువులు", color: "#16a34a" },
  { id: "new", te: "కొత్త వస్తువులు", color: "#2563eb" },
  { id: "used", te: "వాడిన వస్తువులు", color: "#f97316" },
];

const UNITS = ["కేజీలు", "వస్తువులు", "లీటర్లు"];
const LAND_UNITS = ["సెంట్లు", "గజాలు", "అంకణాలు"];
const PROPERTY_TYPES = ["ఇల్లు", "ప్లాట్", "ఇంటి స్థలం", "సాగు భూమి", "ఇతర"];

const SERVICE_CATS = [
  { id: "doctor", te: "డాక్టర్", color: "#dc2626" },
  { id: "lawyer", te: "లాయర్", color: "#7c3aed" },
  { id: "technician", te: "టెక్నీషియన్", color: "#2563eb" },
  { id: "farmwork", te: "వ్యవసాయ పని కూలి", color: "#16a34a" },
  { id: "labour", te: "కార్మిక కూలి", color: "#f97316" },
  { id: "other", te: "ఇతర సేవలు", color: "#0f766e" },
];

// ఏ వృత్తి సెలెక్ట్ చేస్తే ఆ వృత్తికి సంబంధించిన పనులు ఉదాహరణగా చూపిస్తాయి
const SERVICE_EXAMPLES: Record<string, string> = {
  doctor: "ఉదా: జనరల్ డాక్టర్, RMP, దంత వైద్యుడు, ఆయుర్వేద వైద్యుడు, నర్సు, ఫిజియోథెరపీ…",
  lawyer: "ఉదా: సివిల్ లాయర్, క్రిమినల్ లాయర్, భూమి రిజిస్ట్రేషన్, డాక్యుమెంట్ రైటర్, నోటరీ…",
  technician: "ఉదా: ఎలక్ట్రీషియన్, ప్లంబర్, మెకానిక్, AC/ఫ్రిజ్ రిపేర్, మొబైల్ రిపేర్, వెల్డింగ్, కంప్యూటర్…",
  farmwork: "ఉదా: నాట్లు, కలుపు తీయడం, పంట కోత, ట్రాక్టర్ దుక్కి, స్ప్రేయింగ్, బోరు/మోటార్ పని…",
  labour: "ఉదా: మేస్త్రీ, తాపీ పని, సెంట్రింగ్, పెయింటింగ్, కూలి పని, లోడింగ్/అన్‌లోడింగ్, వడ్రంగి…",
  other: "ఉదా: టైలర్, క్షౌరశాల, వంట మనిషి, డ్రైవర్, ట్యూషన్, ఈవెంట్/డెకరేషన్, ఫోటోగ్రఫీ…",
};

const SERVICE_MODES = ["క్లినిక్ / ఆఫీసు", "హోమ్ సర్వీస్", "ఫోన్ / ఆన్‌లైన్"];
const SERVICE_AREAS = ["మండలంలో", "MLA పరిధిలో", "జిల్లాలో", "ఎక్కడైనా"];


type Form = {
  id?: string;
  title: string;
  price: string;
  photo: string;
  location_photo: string;
  unit: string;
  property_type: string;
  pickup_location: string;
  house_no: string;
  street: string;
  village: string;
  mandal: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  contact_phone: string;
  stock_status: "running" | "closed";
  item_condition: string;
  description: string;
  service_cat: string;
  experience: string;
  service_mode: string;
  service_timing: string;
  service_area: string;
};

const empty: Form = {
  title: "", price: "", photo: "", location_photo: "", unit: "కేజీలు", property_type: "",
  pickup_location: "",
  house_no: "", street: "", village: "", mandal: "", taluk: "",
  district: "", state: "ఆంధ్రప్రదేశ్", pincode: "", contact_phone: "",
  stock_status: "running", item_condition: "new", description: "",
  service_cat: "", experience: "", service_mode: "", service_timing: "", service_area: "ఊరిలో",
};


function UpdateBoard() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [postType, setPostType] = useState("business");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      const r = await getProfile();
      if (!r.profile) { navigate({ to: "/varadhi/onboard" }); return; }
      setName(r.profile.full_name ?? "");
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <p className="p-6 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8 space-y-4">
      <h1 className="text-xl font-bold text-[#1e3a8a]">అప్‌డేట్ బోర్డు</h1>

      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b5bdb] p-4 text-white shadow">
        <p className="text-base font-semibold">🙏 నమస్కారం, {name} గారు</p>
        <p className="text-[11px] opacity-90 mt-0.5">వారధికి స్వాగతం — మీ వస్తువులు, సేవలు ఇక్కడ అప్‌డేట్ చేయండి.</p>
      </div>

      {/* Post type */}
      <div className="grid grid-cols-3 gap-2">
        {POST_TYPES.map((p) => (
          <button key={p.id} onClick={() => setPostType(p.id)}
            className={`rounded-xl py-2 text-xs font-semibold border ${
              postType === p.id ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-[#1e3a8a] border-black/10"
            }`}>
            {p.te}
          </button>
        ))}
      </div>

      <PostSection postType={postType} />

      <Link to="/varadhi/subscription"
        className="block text-center rounded-xl bg-[#1e3a8a] py-3 text-white font-semibold shadow">
        సబ్‌స్క్రిప్షన్ & రిన్యూవల్
      </Link>
    </div>
  );
}

function PostSection({ postType }: { postType: string }) {
  const fetchMy = useServerFn(listListings);
  const upsert = useServerFn(upsertListing);
  const toggle = useServerFn(toggleListingStock);
  const del = useServerFn(deleteListing);
  const [items, setItems] = useState<VaradhiListing[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const isLand = postType === "business" && form.item_condition === "realestate";
  const unitList = isLand ? LAND_UNITS : UNITS;

  // ఒక సంవత్సరం లోపు / గరిష్టంగా 50 పోస్టులు
  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const visibleItems = items
    .filter((l: any) => new Date(l.created_at).getTime() >= yearAgo)
    .slice(0, 50);

  const load = async () => {
    const r = await fetchMy({ data: { mine: true } });
    setItems(r.listings.filter((l: any) => (l.post_type ?? "business") === postType));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [postType]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("లొకేషన్ సపోర్ట్ లేదు");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, pickup_location: `https://maps.google.com/?q=${latitude},${longitude}` }));
        toast.success("లొకేషన్ జోడించబడింది");
      },
      () => toast.error("లొకేషన్ పొందలేకపోయాం"),
    );
  };



  const uploadPhoto = async (file: File, field: "photo" | "location_photo" = "photo") => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/listing-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("varadhi-proofs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, [field]: path }));
    toast.success("ఫోటో అప్‌లోడ్ అయింది");
  };

  const edit = (l: any) => {
    setForm({
      id: l.id,
      title: l.title ?? "",
      price: l.price != null ? String(l.price) : "",
      photo: Array.isArray(l.images) ? (l.images[0] ?? "") : "",
      location_photo: Array.isArray(l.images) ? (l.images[1] ?? "") : "",
      unit: l.unit ?? "కిలో",
      property_type: l.sub_category ?? "",
      pickup_location: l.pickup_location ?? "",

      house_no: l.house_no ?? "",
      street: l.street ?? "",
      village: l.village ?? "",
      mandal: l.mandal ?? "",
      taluk: l.taluk ?? "",
      district: l.district ?? "",
      state: l.state ?? "ఆంధ్రప్రదేశ్",
      pincode: l.pincode ?? "",
      contact_phone: l.contact_phone ?? "",
      stock_status: l.stock_status ?? "running",
      item_condition: l.category ?? l.item_condition ?? "new",
      description: l.description ?? "",
      service_cat: l.post_type !== "business" ? (l.category ?? "") : "",
      experience: l.experience ?? "",
      service_mode: l.service_mode ?? "",
      service_timing: l.service_timing ?? "",
      service_area: l.service_area ?? "ఊరిలో",
    });
    setOpen(true);
  };


  const save = async () => {
    const isSvc = postType !== "business";
    if (!form.title.trim()) return toast.error(isSvc ? "చేయగల పని అవసరం" : "వస్తువు పేరు అవసరం");
    if (!form.contact_phone.trim()) return toast.error("కాంటాక్ట్ ఫోన్ నెంబరు అవసరం");
    if (isSvc && !form.service_cat) return toast.error("సేవ రకం ఎంచుకోండి");
    setSaving(true);
    try {
      await upsert({
        data: {
          ...(form.id ? { id: form.id } : {}),
          post_type: postType,
          category: postType === "business" ? form.item_condition : (form.service_cat || "other"),
          item_condition: postType === "business" ? (form.item_condition === "used" ? "used" : "new") : null,
          title: form.title.trim(),
          price: form.price ? Number(form.price) : null,
          unit: form.unit,
          sub_category: (isSvc ? form.service_cat : form.property_type) || null,
          images: [form.photo, form.location_photo].filter(Boolean),

          experience: isSvc ? (form.experience.trim() || null) : null,
          service_mode: isSvc ? (form.service_mode || null) : null,
          service_timing: isSvc ? (form.service_timing.trim() || null) : null,
          service_area: isSvc ? (form.service_area || null) : null,

          pickup_location: form.pickup_location.trim() || null,
          house_no: form.house_no.trim() || null,
          street: form.street.trim() || null,
          village: form.village.trim() || null,
          mandal: form.mandal.trim() || null,
          taluk: form.taluk.trim() || null,
          district: form.district.trim() || null,
          state: form.state.trim() || null,
          pincode: form.pincode.trim() || null,
          contact_phone: form.contact_phone.trim(),
          city: form.village.trim() || form.district.trim() || null,
          stock_status: form.stock_status,
          description: form.description.trim() || null,
        } as any,
      });
      toast.success("సేవ్ అయింది");
      setOpen(false); setForm(empty); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };


  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      {postType === "business" ? (
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_CATS.map((c) => (
            <button key={c.id}
              onClick={() => {
                setForm({
                  ...empty,
                  item_condition: c.id,
                  unit: c.id === "realestate" ? "సెంట్లు" : "కేజీలు",
                });
                setOpen(true);
              }}

              style={{ background: c.color }}
              className="rounded-xl py-2.5 text-[11px] font-semibold text-white shadow-sm flex items-center justify-center gap-1 active:scale-[.98]">
              <Plus className="h-3.5 w-3.5" /> {c.te}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_CATS.map((c) => (
            <button key={c.id}
              onClick={() => {
                setForm({ ...empty, service_cat: c.id, unit: "1 పనికి" });
                setOpen(true);
              }}
              style={{ background: c.color }}
              className="rounded-xl py-2.5 text-[11px] font-semibold text-white shadow-sm flex items-center justify-center gap-1 active:scale-[.98]">
              <Plus className="h-3.5 w-3.5" /> {c.te}
            </button>
          ))}
        </div>
      )}


      {open && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#f7f7fb]">
          {postType === "business" && (
            <p className="text-[11px] font-semibold text-white inline-block rounded-full px-3 py-1"
              style={{ background: BUSINESS_CATS.find((c) => c.id === form.item_condition)?.color ?? "#1e3a8a" }}>
              {BUSINESS_CATS.find((c) => c.id === form.item_condition)?.te ?? "కొత్త వస్తువులు"}
            </p>
          )}

          {postType !== "business" ? (
            <>
              <p className="text-[11px] font-semibold text-white inline-block rounded-full px-3 py-1"
                style={{ background: SERVICE_CATS.find((c) => c.id === form.service_cat)?.color ?? "#1e3a8a" }}>
                {SERVICE_CATS.find((c) => c.id === form.service_cat)?.te ?? "సేవ"}
              </p>

              <L n="1">చేయగల పని / నైపుణ్యం</L>
              <input className={inp} placeholder="ఉదా: జనరల్ డాక్టర్, ఎలక్ట్రీషియన్…"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              <L n="2">అనుభవం & ఆధారాలు</L>
              <input className={inp} placeholder="అనుభవం (ఉదా: 5 సంవత్సరాలు)"
                value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
                  <Camera className="h-4 w-4" />
                  {form.photo ? "ఫోటో ✓" : "మీ ఫోటో"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "photo")} />
                </label>
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
                  <Camera className="h-4 w-4" />
                  {form.location_photo ? "ఆధారాలు ✓" : "ఆధారాల ఫోటో"}
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "location_photo")} />
                </label>
              </div>

              <L n="3">{postType === "free" ? "సర్వీస్ ఛార్జి (ఉచితం)" : "సర్వీస్ ఛార్జి (Rs.)"}</L>
              <input className={inp} type="number" placeholder="Rs." value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <div className="grid grid-cols-3 gap-1.5">
                {CHARGE_BASIS.map((b) => (
                  <button key={b} onClick={() => setForm({ ...form, unit: b })}
                    className={`rounded-lg py-2 text-[10px] font-semibold border ${
                      form.unit === b ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {b}
                  </button>
                ))}
              </div>

              <L n="4">సేవా విధానం & సమయం</L>
              <div className="grid grid-cols-3 gap-1.5">
                {SERVICE_MODES.map((m) => (
                  <button key={m} onClick={() => setForm({ ...form, service_mode: m })}
                    className={`rounded-lg py-2 text-[10px] font-semibold border ${
                      form.service_mode === m ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
              <input className={inp} placeholder="సర్వీస్ టైమింగ్ (ఉదా: ఉదయం 9 – రాత్రి 8)"
                value={form.service_timing} onChange={(e) => setForm({ ...form, service_timing: e.target.value })} />

              <L n="5">లొకేషన్ & కాంటాక్ట్ నెంబర్</L>
              <input className={inp} placeholder="లొకేషన్ లేదా Google Maps లింక్"
                value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} />
              <button type="button" onClick={useCurrentLocation}
                className="w-full rounded-lg border border-[#1e3a8a]/20 bg-white px-2 py-2.5 text-[11px] font-semibold text-[#1e3a8a]">
                📍 ప్రస్తుత లొకేషన్
              </button>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="గ్రామం" value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })} />
                <input className={inp} placeholder="మండలం" value={form.mandal}
                  onChange={(e) => setForm({ ...form, mandal: e.target.value })} />
              </div>
              <input className={inp} inputMode="tel" placeholder="కాంటాక్ట్ ఫోన్ నెంబరు"
                value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />

              <L n="6">సేవ పరిధి</L>
              <div className="grid grid-cols-4 gap-1.5">
                {SERVICE_AREAS.map((a) => (
                  <button key={a} onClick={() => setForm({ ...form, service_area: a })}
                    className={`rounded-lg py-2 text-[10px] font-semibold border ${
                      form.service_area === a ? "bg-[#7c3aed] text-white border-[#7c3aed]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {a}
                  </button>
                ))}
              </div>

              <L n="7">అందుబాటు</L>
              <div className="grid grid-cols-2 gap-2">
                {(["running", "closed"] as const).map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, stock_status: s })}
                    className={`rounded-lg py-2 text-[11px] font-semibold border ${
                      form.stock_status === s ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {s === "running" ? "అందుబాటులో ఉన్నా" : "అందుబాటులో లేను"}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>



          {isLand && (
            <>
              <L n="1">ఆస్తి రకం</L>
              <div className="grid grid-cols-3 gap-1.5">
                {PROPERTY_TYPES.map((p) => (
                  <button key={p} onClick={() => setForm({ ...form, property_type: p })}
                    className={`rounded-lg py-2 text-[10px] font-semibold border ${
                      form.property_type === p ? "bg-[#7c3aed] text-white border-[#7c3aed]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}

          <L n="1">{isLand ? "ఆస్తి పేరు / వివరం" : "అమ్మ దలిచిన వస్తువు పేరు"}</L>
          <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <L n="2">రేటు (Rs.)</L>
          <input className={inp} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />

          <L n="3">ఫోటో</L>
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-3 py-3 text-xs text-[#1e3a8a]">
            <Camera className="h-4 w-4" />
            {form.photo ? "ఫోటో ఎంపిక అయింది ✓" : "ఫోటో అప్‌లోడ్ చేయండి"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "photo")} />
          </label>

          <L n="4">{unitList.join(" / ")}</L>
          <div className={`grid gap-1.5 ${unitList.length === 3 ? "grid-cols-3" : "grid-cols-3"}`}>
            {unitList.map((u) => (
              <button key={u} onClick={() => setForm({ ...form, unit: u })}
                className={`rounded-lg py-2 text-[10px] font-semibold border ${
                  form.unit === u ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-[#1e3a8a] border-black/10"
                }`}>
                {u}
              </button>
            ))}
          </div>
          <input className={inp} placeholder="ఎంత? / ఇతర యూనిట్ రాయండి"
            value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />

          <L n="5">{isLand ? "భూమి / ల్యాండ్ లొకేషన్" : "వస్తువు దొరుకు లొకేషన్"}</L>
          <input className={inp} placeholder="లొకేషన్ లేదా Google Maps లింక్"
            value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
              <Camera className="h-4 w-4" />
              {form.location_photo ? "లొకేషన్ ఫోటో ✓" : "లొకేషన్ ఫోటో అప్‌లోడ్"}
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "location_photo")} />
            </label>
            <button type="button" onClick={useCurrentLocation}
              className="rounded-lg border border-[#1e3a8a]/20 bg-white px-2 py-2.5 text-[11px] font-semibold text-[#1e3a8a]">
              📍 ప్రస్తుత లొకేషన్
            </button>
          </div>

          <L n="6">ఇల్లు / షాప్ నెంబర్</L>
          <input className={inp} value={form.house_no} onChange={(e) => setForm({ ...form, house_no: e.target.value })} />


          <L n="7">వీధి, గ్రామం & మండలం</L>
          <div className="grid grid-cols-3 gap-2">
            <input className={inp} placeholder="వీధి" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            <input className={inp} placeholder="గ్రామం" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
            <input className={inp} placeholder="మండలం" value={form.mandal} onChange={(e) => setForm({ ...form, mandal: e.target.value })} />
          </div>

          <L n="8">తాలూకా & జిల్లా</L>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="తాలూకా" value={form.taluk} onChange={(e) => setForm({ ...form, taluk: e.target.value })} />
            <input className={inp} placeholder="జిల్లా" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>

          <L n="9">రాష్ట్రం & పిన్‌కోడ్</L>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="రాష్ట్రం" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className={inp} placeholder="పిన్‌కోడ్" inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>

          <L n="10">కాంటాక్ట్ ఫోన్ నెంబరు</L>
          <input className={inp} inputMode="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />

          <L n="11">స్టాక్</L>
          <div className="grid grid-cols-2 gap-2">
            {(["running", "closed"] as const).map((s) => (
              <button key={s} onClick={() => setForm({ ...form, stock_status: s })}
                className={`rounded-lg py-2 text-[11px] font-semibold border ${
                  form.stock_status === s ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                }`}>
                {s === "running" ? "స్టాక్ ఉంది" : "స్టాక్ లేదు"}
              </button>
            ))}
          </div>
          </>
          )}

          <textarea className={inp} placeholder="వివరణ (ఐచ్ఛికం)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />



          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-[#1e3a8a] py-2.5 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "సేవ్ అవుతోంది…" : "సేవ్"}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1e3a8a]">పాత పోస్టులు</h3>
          <span className="text-[10px] text-[#1e3a8a]/50">{visibleItems.length} / 50 · 1 సంవత్సరం</span>
        </div>
        {visibleItems.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఏ పోస్టు లేదు</p>}
        {visibleItems.map((l: any) => (
          <div key={l.id} className="rounded-xl border border-black/5 p-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{l.title}</p>
              <p className="text-[11px] text-[#1e3a8a]/60">
                Rs. {l.price ?? "—"} / {l.unit ?? "—"} · 👁 {l.click_count}
                {l.created_at ? ` · ${new Date(l.created_at).toLocaleDateString("te-IN")}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle({ data: { id: l.id, status: l.stock_status === "running" ? "closed" : "running" } }).then(load)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  l.stock_status === "running" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}>
                {l.stock_status === "running" ? "స్టాక్ ఉంది" : "స్టాక్ లేదు"}
              </button>
              <button onClick={() => edit(l)} className="p-1.5 text-[#1e3a8a]"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del({ data: { id: l.id } }).then(load)} className="p-1.5 text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function L({ n, children }: { n: string; children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#1e3a8a]/70 pt-1">{n}. {children}</p>;
}

const inp = "w-full rounded-lg border border-[#1e3a8a]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]";
