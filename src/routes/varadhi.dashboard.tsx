import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, isFreeListing, stockLabel } from "@/lib/varadhi-format";
import { useI18n } from "@/lib/i18n";
import { sharedTranslation } from "@/lib/language-support";
import { isRentalProperty, propertyTerms } from "@/lib/varadhi-property";

import { useServerFn } from "@tanstack/react-start";
import {
  getMyVaradhiProfile, listListings,
  upsertListing, toggleListingStock, deleteListing,
  listProviders, upsertProvider, toggleProviderAvailability,
  type VaradhiListing, type VaradhiProvider,
} from "@/lib/varadhi.functions";
import { useQuery } from "@tanstack/react-query";
import { getMyAreaAdminStats } from "@/lib/varadhi-partner.functions";
import { toast } from "sonner";
import { Plus, Trash2, Camera, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaradhiOccupationPanel } from "@/components/varadhi/OccupationPanel";
import { MyPostRemovals } from "@/components/varadhi/MyPostRemovals";
import { VaradhiRegistrationForm } from "@/components/varadhi/RegistrationForm";
import { showUpdateRegistration } from "@/lib/varadhi-profile";
import { MACHINERY_RATE_UNITS, machineryRateLabels, readMachineryRate, writeMachineryRate, type MachineryRateUnit } from "@/lib/varadhi-machinery-rate";

export const Route = createFileRoute("/varadhi/dashboard")({
  head: () => ({ meta: [
    { title: "Upload — Vaaradhi" },
    { name: "description", content: "Manage your Vaaradhi posts and availability, and view post removal explanations." },
    { property: "og:title", content: "Upload — Vaaradhi" },
    { property: "og:description", content: "Your Vaaradhi posts, availability and moderation history." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: UpdateBoard,
});

const POST_TYPES = [
  { id: "business", te: "వ్యాపారం" },
  { id: "service", te: "సేవలు" },
  { id: "free", te: "ఉచిత సేవలు" },
  { id: "transport", te: "యంత్రాలు" },
];

const TRANSPORT_GROUPS: { te: string; types: { id: string; te: string; color: string }[] }[] = [
  {
    te: "రవాణా వాహనాలు",
    types: [
      { id: "bike", te: "బైక్ డెలివరీ (2-వీలర్)", color: "#dc2626" },
      { id: "auto", te: "ఆటో (3-వీలర్)", color: "#0ea5e9" },
      { id: "car", te: "ట్యాక్సీ / కారు (4-వీలర్)", color: "#7c3aed" },
      { id: "lorry", te: "లారీ / DCM (6-వీలర్)", color: "#f97316" },
    ],
  },
  {
    te: "పని యంత్రాలు",
    types: [
      { id: "tractor", te: "ట్రాక్టర్", color: "#16a34a" },
      { id: "jcb", te: "JCB / ప్రొక్లెయిన్", color: "#0f766e" },
      { id: "agri", te: "వ్యవసాయ యంత్రాలు", color: "#65a30d" },
      { id: "tools", te: "కార్మిక యంత్రాలు", color: "#b45309" },
    ],
  },
];
const TRANSPORT_TYPES = TRANSPORT_GROUPS.flatMap((g) => g.types);

const TRANSPORT_AREAS = ["మండలంలో", "జిల్లాలో", "రాష్ట్రంలో", "ఎక్కడైనా"];

const BUSINESS_CATS = [
  { id: "realestate", te: "ప్లాట్లు & భూములు", color: "#7c3aed" },
  { id: "fresh", te: "తాజా వస్తువులు", color: "#16a34a" },
  { id: "new", te: "కొత్త వస్తువులు", color: "#2563eb" },
  { id: "used", te: "వాడిన వస్తువులు", color: "#f97316" },
];

const UNITS = ["కేజీ", "వస్తువు", "లీటర్"];
const LAND_UNITS = ["సెంటు", "గజం", "అంకణం"];
const PROPERTY_TYPES = ["ఇల్లు", "ప్లాట్", "ఇంటి స్థలం", "సాగు భూమి", "ఇల్లు అద్దెకు (Rent)", "స్థలం/భూమి అద్దెకు (Site/Land Rent)", "లీజ్", "ఇతర"];

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

// ఉచిత / సామాజిక సేవల కేటగిరీలు
const FREE_CATS = [
  { id: "blood", te: "రక్తదాత", color: "#dc2626" },
  { id: "medical", te: "ఉచిత వైద్య సహాయం", color: "#0ea5e9" },
  { id: "education", te: "ఉచిత విద్య", color: "#7c3aed" },
  { id: "food", te: "అన్నదానం", color: "#16a34a" },
  { id: "emergency", te: "అత్యవసర వాలంటీర్", color: "#f97316" },
  { id: "other", te: "ఇతర ఉచిత సేవలు", color: "#0f766e" },
];

const FREE_EXAMPLES: Record<string, string> = {
  blood: "ఉదా: B+ రక్తదానం, ప్లేట్‌లెట్స్, రక్తదాన శిబిరం…",
  medical: "ఉదా: ఉచిత వైద్య పరీక్షలు, మందుల సహాయం, అంబులెన్స్, ఆసుపత్రికి తోడు…",
  education: "ఉదా: ఉచిత ట్యూషన్, పుస్తకాలు, పోటీ పరీక్షల శిక్షణ, కంప్యూటర్ క్లాసులు…",
  food: "ఉదా: అన్నదానం, ఆహార పంపిణీ, మంచినీటి సదుపాయం…",
  emergency: "ఉదా: ప్రమాద సమయంలో సహాయం, వరద/అగ్ని ప్రమాద సేవలు, రెస్క్యూ…",
  other: "ఉదా: వృద్ధులకు సహాయం, దుస్తుల పంపిణీ, శ్రమదానం, పర్యావరణ సేవలు…",
};

const FREE_TIMINGS = ["24/7", "వారాంతాల్లో మాత్రమే", "ఉదయం మాత్రమే", "సాయంత్రం మాత్రమే", "అత్యవసర సమయంలో"];


const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// వృత్తిని బట్టి "వారి స్థలం" పేరు మారుతుంది
const OWN_PLACE_LABEL: Record<string, string> = {
  doctor: "క్లినిక్‌లో మాత్రమే",
  lawyer: "ఆఫీసులో మాత్రమే",
  technician: "వర్క్‌షాప్‌లో మాత్రమే",
  farmwork: "మా స్థలంలో మాత్రమే",
  labour: "మా స్థలంలో మాత్రమే",
  other: "మా స్థలంలో మాత్రమే",
  blood: "బ్లడ్ బ్యాంక్ / సేవా కేంద్రంలో",
  medical: "మా వద్ద మాత్రమే",
  education: "మా వద్ద మాత్రమే",
  food: "మా కేంద్రంలో",
  emergency: "మా కేంద్రంలో",
};
const CUSTOMER_PLACE_LABEL: Record<string, string> = {
  doctor: "పేషెంట్ వున్న చోటికి రాగలము",
  lawyer: "కస్టమర్ చెప్పిన చోటికి వస్తాం",
  technician: "కస్టమర్ చెప్పిన చోటికి వస్తాం",
  farmwork: "కస్టమర్ చెప్పిన చోటికి వస్తాం",
  labour: "కస్టమర్ చెప్పిన చోటికి వస్తాం",
  other: "కస్టమర్ చెప్పిన చోటికి వస్తాం",
  blood: "అవసరమైన చోటికి వస్తాం",
  medical: "అవసరమైన చోటికి వస్తాం",
  education: "అవసరమైన చోటికి వస్తాం",
  food: "అవసరమైన చోటికి వస్తాం",
  emergency: "అవసరమైన చోటికి వస్తాం",
};
const ONLINE_CONSULT_CATS = ["doctor", "lawyer"];
const serviceModes = (cat: string) => [
  OWN_PLACE_LABEL[cat] ?? "మా స్థలంలో మాత్రమే",
  CUSTOMER_PLACE_LABEL[cat] ?? "అవసరమైన చోటికి వస్తాం",
  ...(ONLINE_CONSULT_CATS.includes(cat) ? ["ఆన్‌లైన్ కన్సల్టేషన్"] : []),
];
const SERVICE_UNIT_DEFAULT: Record<string, string> = {
  doctor: "కన్సల్టేషన్ ఫీజు (ఒకసారికి)",
  lawyer: "ఒక కేసుకు / కన్సల్టేషన్‌కు",
};
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
  stock_qty: string;
  item_condition: string;
  description: string;
  service_cat: string;
  experience: string;
  service_mode: string;
  service_timing: string;
  service_area: string;
  blood_group: string;
};

const empty: Form = {
  title: "", price: "", photo: "", location_photo: "", unit: "కేజీ", property_type: "",
  pickup_location: "",
  house_no: "", street: "", village: "", mandal: "", taluk: "",
  district: "", state: "ఆంధ్రప్రదేశ్", pincode: "", contact_phone: "",
  stock_status: "running", stock_qty: "", item_condition: "new", description: "",
  service_cat: "", experience: "", service_mode: "", service_timing: "", service_area: "మండలంలో",
  blood_group: "",
};


function UpdateBoard() {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [postType, setPostType] = useState("business");
  const [status, setStatus] = useState<string | null>(null);
  const [occupation, setOccupation] = useState("");

  const loadProfile = async () => {
    const r = await getProfile();
    const p: any = r.profile;
    setName(p?.full_name ?? "");
    setHasProfile(!showUpdateRegistration(p));
    setStatus(p?.verification_status ?? null);
    setOccupation(p?.occupation ?? "");
    setReady(true);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/varadhi/auth" }); return; }
      await loadProfile();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <p className="p-6 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-8 space-y-4">
      {/* Greeting */}
      <div className="rounded-lg border border-market-brand/20 bg-market-header p-4 text-market-ink shadow-sm">
        <p className="text-base font-semibold">🙏 {t("welcome")}{name ? `, ${name}` : ""}{name && lang === "te" ? " గారు" : ""}</p>
        <p className="text-[11px] opacity-90 mt-0.5">
          {hasProfile
            ? "మీ వస్తువులు, సేవలు ఇక్కడ అప్‌లోడ్ చేయండి."
            : lang === "hi" ? "पहले प्रोफ़ाइल में पंजीकरण पूरा करें." : lang === "en" ? "Complete your registration in Profile first." : "ముందుగా ప్రొఫైల్‌లో రిజిస్ట్రేషన్ పూర్తి చేయండి."}
        </p>
      </div>

      {!hasProfile && (
        <section aria-label="Vaaradhi registration" className="border-b border-border pb-5">
          <VaradhiRegistrationForm showRewardsLink={false} onSaved={loadProfile} />
        </section>
      )}

      {hasProfile && (
        <>
          {/* Post type */}
          <div className="grid grid-cols-4 gap-1.5">
            {POST_TYPES.map((p) => (
              <Button key={p.id} onClick={() => setPostType(p.id)} variant={postType === p.id ? "default" : "outline"}
                className="h-auto min-h-10 whitespace-normal px-1 py-2 text-[11px] font-semibold leading-tight">
                {p.te}
              </Button>
            ))}
          </div>

          {postType === "transport" ? <TransportSection /> : <PostSection postType={postType} />}
          <AreaAdminCounts />
          {status === "approved" && <VaradhiOccupationPanel occupation={occupation} />}
          <MyPostRemovals />
        </>
      )}
    </div>
  );
}

function AreaAdminCounts() {
  const fetchStats = useServerFn(getMyAreaAdminStats);
  const q = useQuery({ queryKey: ["varadhi-area-admin-stats"], queryFn: () => fetchStats() });
  const d: any = q.data;
  if (!d?.seat) return null;
  const s = d.seat;
  const c = d.counts;
  const levelTe: Record<string, string> = {
    state_admin: "రాష్ట్ర అడ్మిన్",
    district_admin: "జిల్లా అడ్మిన్",
    mandal_admin: "మండల అడ్మిన్",
  };
  const cell = (label: string, value: number) => (
    <div className="rounded-xl bg-white/15 px-2 py-2 text-center">
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] opacity-90">{label}</p>
    </div>
  );
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#16a34a] p-4 text-white shadow">
      <p className="text-sm font-bold">{levelTe[s.level] ?? s.level}</p>
      <p className="text-[11px] opacity-90">📍 {[s.mandal, s.district, s.state].filter(Boolean).join(", ")}</p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {cell("వినియోగదారులు", c.users)}
        {cell("పోస్టులు", c.listings)}
        {cell("ట్రాన్స్‌పోర్ట్", c.providers)}
        {cell("సబ్‌స్క్రిప్షన్లు", c.subscriptions)}
      </div>
    </div>
  );
}

function PostSection({ postType }: { postType: string }) {
  const { lang } = useI18n();
  const ui = (source: string) => sharedTranslation(lang, source) ?? source;
  const fetchMy = useServerFn(listListings);
  const upsert = useServerFn(upsertListing);
  const toggle = useServerFn(toggleListingStock);
  const del = useServerFn(deleteListing);
  const [items, setItems] = useState<VaradhiListing[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const isLand = postType === "business" && form.item_condition === "realestate";
  const isRental = isLand && isRentalProperty(form.item_condition, form.property_type);
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
    const { error } = await supabase.storage.from("varadhi-listings").upload(path, file, { upsert: true });
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
      unit: propertyTerms(l.category ?? "", l.sub_category ?? "", l.unit ?? "కేజీ", l.stock_qty ?? "").unit,
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
      stock_qty: propertyTerms(l.category ?? "", l.sub_category ?? "", l.unit ?? "కేజీ", l.stock_qty ?? "").stock_qty,
      item_condition: l.category ?? l.item_condition ?? "new",
      description: l.description ?? "",
      service_cat: l.post_type !== "business" ? (l.category ?? "") : "",
      experience: l.experience ?? "",
      service_mode: l.service_mode ?? "",
      service_timing: l.service_timing ?? "",
      service_area: l.service_area ?? "మండలంలో",
      blood_group: l.blood_group ?? "",
    });
    setOpen(true);
  };


  const save = async () => {
    const isSvc = postType !== "business";
    if (!form.title.trim()) return toast.error(isSvc ? "చేయగల పని అవసరం" : "వస్తువు పేరు అవసరం");
    if (postType === "business" && (!form.price.trim() || Number(form.price) <= 0)) return toast.error("వస్తువు రేటు తప్పనిసరిగా నమోదు చేయండి");
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
          price: postType === "free" ? null : (form.price ? Number(form.price) : null),
          unit: isRental ? "నెలకు" : form.unit,
          sub_category: (isSvc ? form.service_cat : form.property_type) || null,
          images: [form.photo, form.location_photo].filter(Boolean),

          experience: isSvc ? (form.experience.trim() || null) : null,
          service_mode: isSvc ? (form.service_mode || null) : null,
          service_timing: isSvc ? (form.service_timing.trim() || null) : null,
          service_area: isSvc ? (form.service_area || null) : null,
          blood_group: postType === "free" && form.service_cat === "blood" ? (form.blood_group.trim() || null) : null,

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
          stock_qty: isRental ? null : (form.stock_qty.trim() || null),
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
                  unit: c.id === "realestate" ? "సెంటు" : "కేజీ",
                });
                setOpen(true);
              }}

              style={{ background: c.color }}
              className="rounded-xl py-2.5 text-[11px] font-semibold text-white shadow-sm flex items-center justify-center gap-1 active:scale-[.98]">
              <Plus className="h-3.5 w-3.5" /> {ui(c.te)}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(postType === "free" ? FREE_CATS : SERVICE_CATS).map((c) => (
            <button key={c.id}
              onClick={() => {
                setForm({ ...empty, service_cat: c.id,
                  unit: postType === "free" && c.id === "blood" ? BLOOD_DONOR : (SERVICE_UNIT_DEFAULT[c.id] ?? "1 పనికి") });
                setOpen(true);
              }}
              style={{ background: c.color }}
              className="rounded-xl py-2.5 text-[11px] font-semibold text-white shadow-sm flex items-center justify-center gap-1 active:scale-[.98]">
              <Plus className="h-3.5 w-3.5" /> {ui(c.te)}
            </button>
          ))}
        </div>
      )}


      {open && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#f7f7fb]">
          {postType === "business" && (
            <p className="text-[11px] font-semibold text-white inline-block rounded-full px-3 py-1"
              style={{ background: BUSINESS_CATS.find((c) => c.id === form.item_condition)?.color ?? "#1e3a8a" }}>
              {ui(BUSINESS_CATS.find((c) => c.id === form.item_condition)?.te ?? "కొత్త వస్తువులు")}
            </p>
          )}

          {postType !== "business" ? (
            <>
              {(() => {
                const cats = postType === "free" ? FREE_CATS : SERVICE_CATS;
                const ex = postType === "free" ? FREE_EXAMPLES : SERVICE_EXAMPLES;
                const cat = cats.find((c) => c.id === form.service_cat);
                return (
                  <>
                    {isBlood ? (
                      <p className="inline-block rounded-full px-5 py-1.5 text-base font-extrabold tracking-wide text-white shadow-sm"
                        style={{ background: cat?.color ?? "#dc2626" }}>
                        {ui("రక్తం")}
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-white inline-block rounded-full px-3 py-1"
                        style={{ background: cat?.color ?? "#1e3a8a" }}>
                        {cat?.te ?? "సేవ"}
                      </p>
                    )}

                    <L n="1">{isBlood ? "రక్తదాన వివరాలు" : postType === "free" ? "చేయగల ఉచిత సేవ" : "చేయగల పని / నైపుణ్యం"}</L>
                    <input className={inp}
                      placeholder={ex[form.service_cat] ?? "ఉదా: జనరల్ డాక్టర్, ఎలక్ట్రీషియన్…"}
                      value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    {form.service_cat && ex[form.service_cat] && (
                      <p className="-mt-1 text-[10px] leading-snug text-[#1e3a8a]/70">
                        {ex[form.service_cat]}
                      </p>
                    )}
                  </>
                );
              })()}



              {isBlood ? (
                <>
                  <div className="flex items-start gap-2 pt-1">
                    <span className="pt-2 text-[11px] font-semibold text-[#1e3a8a]/70">2.</span>
                    <div className="grid flex-1 grid-cols-2 gap-2" role="radiogroup" aria-label={ui("రక్తదాన వివరాలు")}>
                      {BLOOD_NEEDS.map((need) => {
                        const selected = bloodNeedOf(form.unit) === need;
                        return (
                          <Button key={need} type="button" role="radio" aria-checked={selected}
                            onClick={() => setForm({ ...form, unit: need })}
                            className={`h-auto min-h-10 whitespace-normal rounded-md px-2 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition ${
                              need === BLOOD_DONOR ? "bg-blood-donor hover:bg-blood-donor/90" : "bg-blood-wanted hover:bg-blood-wanted/90"
                            } ${selected ? "ring-2 ring-offset-2 ring-foreground/70" : "opacity-80"}`}>
                            {selected && <Check className="h-4 w-4" />} {ui(need)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <input className={inp} placeholder={ui(bloodDetailPlaceholder(bloodNeedOf(form.unit)))}
                    value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </>
              ) : (
                <>
                  <L n="2">అనుభవం & ఆధారాలు</L>
                  <input className={inp} placeholder="అనుభవం (ఉదా: 5 సంవత్సరాలు)"
                    value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
                  <Camera className="h-4 w-4" />
                  {form.photo ? "ఫోటో ✓" : "మీ ఫోటో"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "photo")} />
                </label>
                {isBlood ? (
                  <select
                    aria-label={ui("బ్లడ్ గ్రూప్")}
                    className="w-full rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a] outline-none focus:border-[#1e3a8a]"
                    value={form.blood_group}
                    onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  >
                    <option value="">{ui("బ్లడ్ గ్రూప్")}</option>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
                    <Camera className="h-4 w-4" />
                    {form.location_photo ? "ఆధారాలు ✓" : "ఆధారాల ఫోటో"}
                    <input type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "location_photo")} />
                  </label>
                )}
              </div>

              {postType === "free" ? (
                <>
                  <L n="3">సేవ సమయం / అందుబాటు</L>
                  <input className={inp}
                    placeholder="ఉదా: 24/7, వారాంతాల్లో మాత్రమే, ఉదయం 9 – రాత్రి 8"
                    value={form.service_timing}
                    onChange={(e) => setForm({ ...form, service_timing: e.target.value })} />
                  {!isBlood && (
                    <div className="flex flex-wrap gap-1.5">
                      {FREE_TIMINGS.map((t) => (
                        <button key={t} type="button" onClick={() => setForm({ ...form, service_timing: t })}
                          className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold border ${
                            form.service_timing === t ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  <L n="4">సేవా విధానం</L>
                  <div className="grid grid-cols-2 gap-1.5">
                    {serviceModes(form.service_cat).map((m) => (
                      <button key={m} onClick={() => setForm({ ...form, service_mode: m })}
                        className={`rounded-lg px-2 py-2.5 text-[10px] font-semibold border leading-snug ${
                          form.service_mode === m ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <L n="3">సర్వీస్ ఛార్జి (Rs.)</L>
                  <input className={inp} type="number" placeholder="Rs." value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  <input className={inp}
                    placeholder="ఏ పద్ధతిలో ఛార్జి తీసుకుంటారు? (ఉదా: ఒక్కో పనికి, గంటకి, రోజుకి…)"
                    value={UNITS.includes(form.unit) || LAND_UNITS.includes(form.unit) ? "" : form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })} />

                  <L n="4">సేవా విధానం & సమయం</L>
                  <div className="grid grid-cols-2 gap-1.5">
                    {serviceModes(form.service_cat).map((m) => (
                      <button key={m} onClick={() => setForm({ ...form, service_mode: m })}
                        className={`rounded-lg px-2 py-2.5 text-[10px] font-semibold border leading-snug ${
                          form.service_mode === m ? "bg-[#16a34a] text-white border-[#16a34a]" : "bg-white text-[#1e3a8a] border-black/10"
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <input className={inp} placeholder="సర్వీస్ టైమింగ్ (ఉదా: ఉదయం 9 – రాత్రి 8)"
                    value={form.service_timing} onChange={(e) => setForm({ ...form, service_timing: e.target.value })} />
                </>
              )}


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
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="జిల్లా" value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })} />
                <input className={inp} placeholder="రాష్ట్రం" value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })} />
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
            <div className="contents" data-notranslit>



          {isLand && (
            <>
              <L n="1">ఆస్తి రకం</L>
              <div className="grid grid-cols-3 gap-1.5">
                {PROPERTY_TYPES.map((p) => (
                  <Button key={p} type="button" onClick={() => setForm({ ...form, property_type: p,
                    ...propertyTerms(form.item_condition, p, form.unit, form.stock_qty) })}
                    aria-pressed={form.property_type === p}
                    variant={form.property_type === p ? "default" : "outline"}
                    className="h-auto min-h-10 whitespace-normal rounded-lg px-2 py-2 text-[10px] font-semibold leading-snug">
                    {ui(p)}
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* 1. వస్తువు పేరు + ఫోటో */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <L n="1">{ui(isLand ? "ఆస్తి పేరు / వివరం" : "అమ్మ దలిచిన వస్తువు పేరు")}</L>
              <input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <L n="">వస్తువు ఫోటో</L>
              <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
                <Camera className="h-4 w-4" />
                {ui(form.photo ? "ఫోటో ✓" : "ఫోటో అప్‌లోడ్")}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "photo")} />
              </label>
            </div>
          </div>

          {/* 2. రేటు + యూనిట్ + స్టాక్ */}
          <div className={isRental ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
            <div>
              <L n="2">{ui(isRental ? (form.property_type === "లీజ్" ? "నెలవారీ లీజ్ మొత్తం (రూ.)" : "నెలవారీ అద్దె (రూ.)") : "రేటు (రూ.)")}</L>
              <input className={inp} type="number" min="0" step="any"
                aria-label={ui(isRental ? (form.property_type === "లీజ్" ? "నెలవారీ లీజ్ మొత్తం (రూ.)" : "నెలవారీ అద్దె (రూ.)") : "రేటు (రూ.)")}
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            {!isRental && <div>
              <L n="">యూనిట్ ఎంచుకోండి</L>
              <div className={`grid gap-1 ${unitList.length === 3 ? "grid-cols-3" : "grid-cols-3"}`}>
                {unitList.map((u) => (
                  <button key={u} onClick={() => setForm({ ...form, unit: u })}
                    className={`rounded-lg py-2.5 text-[10px] font-semibold border ${
                      form.unit === u ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-[#1e3a8a] border-black/10"
                    }`}>
                    {ui(u)}
                  </button>
                ))}
              </div>
            </div>}
          </div>
          {!isRental && <input className={inp} placeholder={ui("ఇతర యూనిట్ రాయండి (ఐచ్ఛికం)")}
            value={unitList.includes(form.unit) ? "" : form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })} />}

          <div className={isRental ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
            {!isRental && <div>
              <L n="">అందుబాటులో ఉన్న స్టాక్</L>
              <input className={inp} placeholder={`${ui("Example:")} 50 ${ui(form.unit || "")}`}
                value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            </div>}
            <div>
              <L n="">{ui(isRental ? "అందుబాటు / ఖాళీ వివరాలు" : "స్టాక్")}</L>
              <div className="grid grid-cols-2 gap-1">
                {(["running", "closed"] as const).map((s) => (
                  <Button key={s} type="button" onClick={() => setForm({ ...form, stock_status: s })}
                    aria-pressed={form.stock_status === s}
                    variant={form.stock_status === s ? "default" : "outline"}
                    className="h-auto min-h-10 whitespace-normal rounded-lg px-2 py-2.5 text-[11px] font-semibold">
                    {ui(isRental ? (s === "running" ? "అందుబాటులో ఉంది / ఖాళీగా ఉంది" : "అందుబాటులో లేదు / ఖాళీగా లేదు") : (s === "running" ? "In stock" : "Out of stock"))}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. పికప్ లొకేషన్ + కాంటాక్ట్ */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <L n="3">{ui(isRental ? "ఆస్తి లొకేషన్" : isLand ? "భూమి లొకేషన్" : "వస్తువు పికప్ లొకేషన్")}</L>
              <input className={inp} placeholder={ui("Google Maps link")}
                value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} />
            </div>
            <div>
              <L n="">కాంటాక్ట్ ఫోన్ నెంబరు</L>
              <input className={inp} inputMode="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e3a8a]/30 bg-white px-2 py-2.5 text-[11px] text-[#1e3a8a]">
              <Camera className="h-4 w-4" />
              {ui(form.location_photo ? "లొకేషన్ ఫోటో ✓" : "లొకేషన్ ఫోటో అప్‌లోడ్")}
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], "location_photo")} />
            </label>
            <button type="button" onClick={useCurrentLocation}
              className="rounded-lg border border-[#1e3a8a]/20 bg-white px-2 py-2.5 text-[11px] font-semibold text-[#1e3a8a]">
              📍 {ui("ప్రస్తుత లొకేషన్")}
            </button>
          </div>

          {/* 4. పికప్ చిరునామా */}
          <L n="4">{ui(isRental ? "ఆస్తి చిరునామా" : "వస్తువు పికప్ చిరునామా")}</L>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder={ui("ఇల్లు / షాప్ నెంబర్")} value={form.house_no} onChange={(e) => setForm({ ...form, house_no: e.target.value })} />
            <input className={inp} placeholder={ui("వీధి")} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder={ui("ఏరియా / గ్రామం")} value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
            <input className={inp} placeholder={ui("మండలం")} value={form.mandal} onChange={(e) => setForm({ ...form, mandal: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder={ui("జిల్లా")} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <input className={inp} placeholder={ui("రాష్ట్రం")} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder={ui("పిన్‌కోడ్")} inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <input className={inp} placeholder={ui("తాలూకా (ఐచ్ఛికం)")} value={form.taluk} onChange={(e) => setForm({ ...form, taluk: e.target.value })} />
          </div>

          {/* 5. వివరణ */}
          <L n="5">వివరణ</L>
          </div>
          )}

          <textarea data-notranslit className={inp} placeholder={ui("వివరణ (ఐచ్ఛికం)")} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />



          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-[#1e3a8a] py-2.5 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
            <Save className="h-4 w-4" /> {ui(saving ? "సేవ్ అవుతోంది…" : "సేవ్")}
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
                {formatPrice(l.price, l.unit, isFreeListing(l))} · 👁 {l.click_count}
                {l.created_at ? ` · ${new Date(l.created_at).toLocaleDateString("te-IN")}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle({ data: { id: l.id, status: l.stock_status === "running" ? "closed" : "running" } }).then(load)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  l.stock_status === "running" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}>
                {stockLabel(l.stock_status === "running", isFreeListing(l))}
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
  const { lang } = useI18n();
  const label = typeof children === "string" ? sharedTranslation(lang, children) ?? children : children;
  return <p className="text-[11px] font-semibold text-[#1e3a8a]/70 pt-1">{n ? `${n}. ` : ""}{label}</p>;
}

const inp = "w-full rounded-lg border border-[#1e3a8a]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]";

type TForm = {
  id?: string;
  sub_type: string;
  title: string;
  vehicle_details: string;
  service_areas: string;
  city: string;
  description: string;
  contact_phone: string;
  photo_url: string;
  price_per_km: string;
  rate_unit: MachineryRateUnit;
};

const emptyT: TForm = {
  sub_type: "auto", title: "", vehicle_details: "", service_areas: "మండలంలో", city: "", description: "",
  contact_phone: "", photo_url: "", price_per_km: "", rate_unit: "km",
};


function TransportSection() {
  const { lang } = useI18n();
  const rateCopy = machineryRateLabels(lang);
  const fetchMine = useServerFn(listProviders);
  const upsert = useServerFn(upsertProvider);
  const toggle = useServerFn(toggleProviderAvailability);
  const [items, setItems] = useState<VaradhiProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TForm>(emptyT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetchMine({ data: { mine: true, provider_type: "transport" } });
    setItems(r.providers);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const edit = (p: VaradhiProvider) => {
    setForm({
      id: p.id,
      sub_type: p.sub_type ?? "auto",
      title: p.title ?? "",
      vehicle_details: p.vehicle_details ?? "",
      service_areas: p.service_areas ?? "మండలంలో",
      city: p.city ?? "",
      description: readMachineryRate(p.description).notes,
      contact_phone: (p as any).contact_phone ?? "",
      photo_url: (p as any).photo_url ?? "",
      price_per_km: (p as any).price_per_km != null ? String((p as any).price_per_km) : "",
      rate_unit: readMachineryRate(p.description).unit,

    });
    setOpen(true);
  };

  const uploadVehiclePhoto = async (file: File) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const path = `${uid}/listing-transport-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("varadhi-listings").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, photo_url: path }));
    toast.success("ఫోటో అప్‌లోడ్ అయింది");
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("వాహనం / సర్వీస్ పేరు అవసరం");
    if (!form.vehicle_details.trim()) return toast.error("వాహనం వివరాలు అవసరం");
    if (!/^\d{10}$/.test(form.contact_phone.replace(/\D/g, "").slice(-10))) {
      return toast.error("సరైన 10 అంకెల ఫోన్ నంబర్ ఇవ్వండి");
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          ...(form.id ? { id: form.id } : {}),
          provider_type: "transport",
          sub_type: form.sub_type,
          title: form.title.trim(),
          vehicle_details: form.vehicle_details.trim(),
          service_areas: form.service_areas || null,
          city: form.city.trim() || null,
          description: writeMachineryRate(form.rate_unit, form.description),
          contact_phone: form.contact_phone.replace(/\D/g, "").slice(-10),
          photo_url: form.photo_url || null,
          price_per_km: form.price_per_km.trim() ? Number(form.price_per_km) : null,

        } as any,
      });
      toast.success("సేవ్ అయింది");
      setOpen(false); setForm(emptyT); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <section className="space-y-3 text-foreground">
      <div className="grid grid-cols-2 gap-2">
        {TRANSPORT_GROUPS.map((g, index) => (
          <Button key={g.te} type="button" onClick={() => {
            const subtype = g.types[0]?.id;
            if (!subtype) return;
            setForm((current) => open ? { ...current, sub_type: subtype } : { ...emptyT, sub_type: subtype });
            setOpen(true);
          }} aria-pressed={open && g.types.some((t) => t.id === form.sub_type)}
            className={`h-auto min-h-12 whitespace-normal rounded-lg px-2 py-3 text-xs font-bold leading-snug text-machine-lettering shadow-sm ${index === 0 ? "bg-machine-transport hover:bg-machine-transport/90" : "bg-machine-work hover:bg-machine-work/90"}`}>
            <Plus className="size-4 shrink-0" /> {g.te}
          </Button>
        ))}
      </div>

      {open && (
        <div className="space-y-3 border-b border-border pb-4">
          {TRANSPORT_GROUPS.filter((g) => g.types.some((t) => t.id === form.sub_type)).map((g) => (
            <div key={g.te} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{g.te === "రవాణా వాహనాలు" ? "వాహనం రకం" : "యంత్రం రకం"}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {g.types.map((t) => (
                  <Button key={t.id} type="button" onClick={() => setForm({ ...form, sub_type: t.id })}
                    aria-pressed={form.sub_type === t.id} variant={form.sub_type === t.id ? "default" : "outline"}
                    className="h-auto min-h-10 whitespace-normal rounded-lg px-1 py-2 text-[11px] font-semibold leading-snug">
                    {g.te === "రవాణా వాహనాలు" ? ({ bike: "2-వీలర్", auto: "3-వీలర్", car: "4-వీలర్", lorry: "6-వీలర్" }[t.id] ?? t.te) : t.te}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <input className="machine-input" aria-label="వాహనం / యంత్రం పేరు" placeholder="వాహనం / యంత్రం పేరు"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="machine-input" aria-label="ఊరు / ప్రాంతం" placeholder="ఊరు / ప్రాంతం"
              value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>

          <input className="machine-input" aria-label="మోడల్ / సామర్థ్యం / వాహనం వివరాలు" placeholder="మోడల్ / సామర్థ్యం / వాహనం వివరాలు"
            value={form.vehicle_details} onChange={(e) => setForm({ ...form, vehicle_details: e.target.value })} />

          <div className="space-y-2" data-no-translate>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-stretch gap-2">
              <input className="machine-input min-w-0" aria-label={rateCopy.price} inputMode="decimal" placeholder={`${rateCopy.price} (Rs.)`}
                value={form.price_per_km}
                onChange={(e) => setForm({ ...form, price_per_km: e.target.value.replace(/[^\d.]/g, "") })} />
              <div className="grid grid-cols-3 gap-1" role="group" aria-label={rateCopy.price}>
                {MACHINERY_RATE_UNITS.map((unit) => (
                  <Button key={unit} type="button" aria-pressed={form.rate_unit === unit}
                    variant={form.rate_unit === unit ? "default" : "outline"}
                    className="h-auto min-h-11 min-w-0 whitespace-normal px-1 py-2 text-[10px] leading-snug"
                    onClick={() => setForm({ ...form, rate_unit: unit })}>
                    {rateCopy[unit]}
                  </Button>
                ))}
              </div>
            </div>
            <textarea className="machine-input" aria-label={rateCopy.extra} placeholder={rateCopy.extra}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input className="machine-input" aria-label="ఫోన్ / వాట్సాప్ నంబర్" inputMode="numeric" maxLength={10} placeholder="ఫోన్ / వాట్సాప్ నంబర్"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            <label className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card px-2 py-2 text-xs text-foreground">
              <Camera className="h-4 w-4" />
              {form.photo_url ? "వాహనం ఫోటో ✓" : "వాహనం ఫోటో"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadVehiclePhoto(e.target.files[0])} />
            </label>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">2. సర్వీస్ పరిధి</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TRANSPORT_AREAS.map((a) => (
              <Button key={a} type="button" onClick={() => setForm({ ...form, service_areas: a })}
                aria-pressed={form.service_areas === a} variant={form.service_areas === a ? "default" : "outline"}
                className="h-auto min-h-10 whitespace-normal rounded-lg px-1 py-2 text-[10px] font-semibold">
                {a}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setForm(emptyT); }}
              className="rounded-lg text-sm font-semibold">
              రద్దు
            </Button>
            <Button onClick={save} disabled={saving}
              className="col-span-2 rounded-lg font-semibold">
              <Save className="h-4 w-4" /> {saving ? "సేవ్ అవుతోంది…" : "సేవ్"}
            </Button>
          </div>
        </div>
      )}


      <div className="mt-4 space-y-2">
        <h3 className="text-xs font-bold text-[#1e3a8a]">నా ట్రాన్స్‌పోర్ట్ పోస్టులు</h3>
        {items.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఏ పోస్టు లేదు</p>}
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-black/5 p-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.title}</p>
              <p className="text-[11px] text-[#1e3a8a]/60 truncate">
                {TRANSPORT_TYPES.find((t) => t.id === p.sub_type)?.te ?? p.sub_type}
                {p.city ? ` · ${p.city}` : ""} · 👁 {p.click_count}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle({ data: { id: p.id, status: p.availability_status === "online" ? "offline" : "online" } }).then(load)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  p.availability_status === "online" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}>
                {p.availability_status === "online" ? "అందుబాటులో" : "ఖాళీ లేదు"}
              </button>
              <button onClick={() => edit(p)} className="p-1.5 text-[#1e3a8a]"><Pencil className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
