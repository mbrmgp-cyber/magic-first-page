import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyVaradhiProfile, listListings, listProviders,
  upsertListing, toggleListingStock, deleteListing,
  upsertProvider, toggleProviderAvailability,
  type VaradhiListing, type VaradhiProvider,
} from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Plus, Trash2, Power, Store, Truck } from "lucide-react";

export const Route = createFileRoute("/varadhi/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyVaradhiProfile);
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const r = await getProfile();
      if (!r.profile) { navigate({ to: "/varadhi/onboard" }); return; }
      setRole(r.profile.primary_role);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <p className="p-6 text-center text-sm">లోడ్…</p>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-[#1e3a8a]">నా డాష్‌బోర్డ్</h1>
      <p className="text-xs text-[#1e3a8a]/60">Role: <span className="font-semibold">{role}</span></p>

      {(role === "seller" || role === "buyer") && <SellerSection />}
      {(role === "provider" || role === "buyer") && <ProviderSection />}

      <Link to="/varadhi/subscription"
        className="block text-center rounded-xl bg-[#1e3a8a] py-3 text-white font-semibold shadow">
        సబ్‌స్క్రిప్షన్ & రిన్యూవల్
      </Link>
    </div>
  );
}

function SellerSection() {
  const fetchMy = useServerFn(listListings);
  const upsert = useServerFn(upsertListing);
  const toggle = useServerFn(toggleListingStock);
  const del = useServerFn(deleteListing);
  const [items, setItems] = useState<VaradhiListing[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ category: "fresh", title: "", price: "", unit: "", description: "", city: "" });

  const load = async () => {
    const r = await fetchMy({ data: { mine: true } });
    setItems(r.listings);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title అవసరం");
    try {
      await upsert({ data: { ...form, price: form.price ? Number(form.price) : null } });
      toast.success("Saved");
      setOpen(false); setForm({ category: "fresh", title: "", price: "", unit: "", description: "", city: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-1"><Store className="h-4 w-4" /> నా అమ్మకాలు</h2>
        <button onClick={() => setOpen(!open)} className="rounded-xl bg-[#16a34a] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> కొత్తది
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#f7f7fb]">
          <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="fresh">తాజా వస్తువులు</option>
            <option value="new">కొత్త వస్తువులు</option>
            <option value="used">వాడిన వస్తువులు</option>
            <option value="realestate">ఇంటి స్థలాలు</option>
          </select>
          <input className={inp} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className={inp} placeholder="Unit (kg/pc)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <input className={inp} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <textarea className={inp} placeholder="వివరణ" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button onClick={save} className="w-full rounded-xl bg-[#1e3a8a] py-2 text-white font-semibold">Save</button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఏ లిస్టింగ్ లేదు</p>}
        {items.map((l) => (
          <div key={l.id} className="rounded-xl border border-black/5 p-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{l.title}</p>
              <p className="text-[11px] text-[#1e3a8a]/60">
                {l.category} · Rs. {l.price ?? "—"} · 👁 {l.click_count}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle({ data: { id: l.id, status: l.stock_status === "running" ? "closed" : "running" } }).then(load)}
                className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  l.stock_status === "running" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}>
                {l.stock_status === "running" ? "RUNNING" : "CLOSED"}
              </button>
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

function ProviderSection() {
  const fetchMy = useServerFn(listProviders);
  const upsert = useServerFn(upsertProvider);
  const toggle = useServerFn(toggleProviderAvailability);
  const [items, setItems] = useState<VaradhiProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    provider_type: "transport", sub_type: "2-wheeler", title: "",
    description: "", vehicle_details: "", city: "", service_areas: "",
  });

  const load = async () => {
    const r = await fetchMy({ data: { mine: true } });
    setItems(r.providers);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title అవసరం");
    try {
      await upsert({ data: form });
      toast.success("Saved");
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const subTypes = form.provider_type === "transport"
    ? ["1-2 wheeler", "1-3 wheeler (auto)", "3-4 wheeler (pickup)", "4-6+ wheeler (lorry)"]
    : ["Electrician", "Plumber", "Mechanic", "TV/AC Repair", "Tractor Driver", "Harvester Operator", "Farm Labourer"];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1e3a8a] flex items-center gap-1"><Truck className="h-4 w-4" /> నా సర్వీసులు</h2>
        <button onClick={() => setOpen(!open)} className="rounded-xl bg-[#f97316] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> కొత్తది
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#f7f7fb]">
          <select className={inp} value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value, sub_type: "" })}>
            <option value="transport">ట్రాన్స్‌పోర్ట్</option>
            <option value="service">సర్వీస్ / టెక్నీషియన్</option>
          </select>
          <select className={inp} value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })}>
            <option value="">-- ఎంచుకోండి --</option>
            {subTypes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={inp} placeholder="Title (e.g. రాము ఆటో)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inp} placeholder="Vehicle / Skills details" value={form.vehicle_details} onChange={(e) => setForm({ ...form, vehicle_details: e.target.value })} />
          <input className={inp} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className={inp} placeholder="Service areas" value={form.service_areas} onChange={(e) => setForm({ ...form, service_areas: e.target.value })} />
          <textarea className={inp} placeholder="వివరణ" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button onClick={save} className="w-full rounded-xl bg-[#1e3a8a] py-2 text-white font-semibold">Save</button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-xs text-center text-[#1e3a8a]/50 py-4">ఏ సర్వీస్ లేదు</p>}
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-black/5 p-2.5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.title}</p>
              <p className="text-[11px] text-[#1e3a8a]/60">{p.sub_type} · 👁 {p.click_count}</p>
            </div>
            <button
              onClick={() => toggle({ data: { id: p.id, status: p.availability_status === "online" ? "offline" : "online" } }).then(load)}
              className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${
                p.availability_status === "online" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              }`}>
              <Power className="h-3 w-3" />
              {p.availability_status === "online" ? "ONLINE" : "OFFLINE"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

const inp = "w-full rounded-lg border border-[#1e3a8a]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]";
