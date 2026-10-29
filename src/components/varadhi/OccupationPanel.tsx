import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listListings, toggleListingStock, updateListingInventory,
  listProviders, toggleProviderAvailability,
  type VaradhiListing, type VaradhiProvider,
} from "@/lib/varadhi.functions";
import { toast } from "sonner";
import { Boxes, Radio, Truck, RefreshCw } from "lucide-react";

type Mode = "inventory" | "availability" | "transport";

// వృత్తిని బట్టి ఏ ప్యానెల్ ముందు చూపించాలి
function modesFor(occupation: string): Mode[] {
  const o = (occupation ?? "").trim();
  if (o.startsWith("వ్యవసాయం") || o.startsWith("వ్యాపారం")) return ["inventory", "availability", "transport"];
  if (o.startsWith("డ్రైవర్")) return ["transport", "availability", "inventory"];
  if (["టెక్నీషియన్", "డాక్టర్", "లాయర్", "ఇంజినీర్"].some((x) => o.startsWith(x)))
    return ["availability", "inventory", "transport"];
  return ["availability", "inventory", "transport"];
}

export function VaradhiOccupationPanel({ occupation }: { occupation: string }) {
  const fetchListings = useServerFn(listListings);
  const fetchProviders = useServerFn(listProviders);
  const toggleStock = useServerFn(toggleListingStock);
  const updateInv = useServerFn(updateListingInventory);
  const toggleAvail = useServerFn(toggleProviderAvailability);

  const [listings, setListings] = useState<VaradhiListing[]>([]);
  const [providers, setProviders] = useState<VaradhiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([
        fetchListings({ data: { mine: true } }),
        fetchProviders({ data: { mine: true } }),
      ]);
      setListings(l.listings ?? []);
      setProviders(p.providers ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const goods = listings.filter((l: any) => (l.post_type ?? "business") === "business");
  const services = listings.filter((l: any) => (l.post_type ?? "business") !== "business");

  const setStatus = async (l: any, status: "running" | "closed") => {
    setListings((arr) => arr.map((x: any) => (x.id === l.id ? { ...x, stock_status: status } : x)));
    try { await toggleStock({ data: { id: l.id, status } }); toast.success("హోమ్ పేజీలో అప్‌డేట్ అయింది"); }
    catch (e: any) { toast.error(e.message); load(); }
  };

  const saveQty = async (l: any, stock_qty: string, price: string) => {
    try {
      await updateInv({ data: { id: l.id, stock_qty: stock_qty.trim() || null, price: price.trim() ? Number(price) : null } });
      toast.success("హోమ్ పేజీలో అప్‌డేట్ అయింది");
    } catch (e: any) { toast.error(e.message); }
  };

  const setProvider = async (p: any, status: "online" | "offline") => {
    setProviders((arr) => arr.map((x: any) => (x.id === p.id ? { ...x, availability_status: status } : x)));
    try { await toggleAvail({ data: { id: p.id, status } }); toast.success("హోమ్ పేజీలో అప్‌డేట్ అయింది"); }
    catch (e: any) { toast.error(e.message); load(); }
  };

  if (loading) return <div className="rounded-2xl bg-white p-4 text-center text-xs shadow-sm">లోడ్…</div>;
  if (!goods.length && !services.length && !providers.length) return null;

  const blocks: Record<Mode, React.ReactNode> = {
    inventory: goods.length ? (
      <Card key="inv" icon={<Boxes className="h-4 w-4" />} title="నా స్టాక్ నిర్వహణ"
        note="స్టాక్ / రేటు మార్చిన వెంటనే హోమ్ పేజీలో కస్టమర్‌కు కనిపిస్తుంది.">
        {goods.map((l: any) => <InventoryRow key={l.id} l={l} onStatus={setStatus} onSave={saveQty} />)}
      </Card>
    ) : null,
    availability: services.length ? (
      <Card key="avl" icon={<Radio className="h-4 w-4" />} title="నా సేవల అందుబాటు"
        note="అందుబాటులో లేనప్పుడు ఆఫ్ చేస్తే హోమ్ పేజీ శోధనలో కనిపించరు.">
        {services.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#f7f7fb] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#1e3a8a]">{l.title}</p>
              <p className="text-[10px] text-[#1e3a8a]/60">{l.service_area ?? l.category}</p>
            </div>
            <Switch on={l.stock_status !== "closed"}
              onLabel="అందుబాటులో" offLabel="అందుబాటులో లేను"
              onChange={(v) => setStatus(l, v ? "running" : "closed")} />
          </div>
        ))}
      </Card>
    ) : null,
    transport: providers.length ? (
      <Card key="trp" icon={<Truck className="h-4 w-4" />} title="నా వాహనాల అందుబాటు"
        note="ఆన్‌లైన్‌లో ఉంటేనే కస్టమర్‌కు హోమ్ పేజీలో కనిపిస్తారు.">
        {providers.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#f7f7fb] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#1e3a8a]">{p.vehicle_details || p.sub_type}</p>
              <p className="text-[10px] text-[#1e3a8a]/60">{p.service_areas ?? ""}</p>
            </div>
            <Switch on={p.availability_status === "online"}
              onLabel="ఆన్‌లైన్" offLabel="ఆఫ్‌లైన్"
              onChange={(v) => setProvider(p, v ? "online" : "offline")} />
          </div>
        ))}
      </Card>
    ) : null,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button onClick={load} className="flex items-center gap-1 rounded-full bg-[#1e3a8a]/10 px-3 py-1 text-[10px] font-semibold text-[#1e3a8a]">
          <RefreshCw className="h-3 w-3" /> రిఫ్రెష్
        </button>
      </div>
      {modesFor(occupation).map((m) => blocks[m])}
    </div>
  );
}

function InventoryRow({ l, onStatus, onSave }: {
  l: any;
  onStatus: (l: any, s: "running" | "closed") => void;
  onSave: (l: any, qty: string, price: string) => void;
}) {
  const [qty, setQty] = useState(l.stock_qty ?? "");
  const [price, setPrice] = useState(l.price != null ? String(l.price) : "");
  const dirty = (l.stock_qty ?? "") !== qty || (l.price != null ? String(l.price) : "") !== price;
  return (
    <div className="rounded-xl bg-[#f7f7fb] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-[#1e3a8a]">{l.title}</p>
        <Switch on={l.stock_status !== "closed"} onLabel="స్టాక్ ఉంది" offLabel="స్టాక్ లేదు"
          onChange={(v) => onStatus(l, v ? "running" : "closed")} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
        <input className={inp} placeholder="స్టాక్ (ఉదా: 50)" value={qty} onChange={(e) => setQty(e.target.value)} />
        <input className={inp} inputMode="decimal" placeholder={`రేటు / ${l.unit ?? "యూనిట్"}`}
          value={price} onChange={(e) => setPrice(e.target.value)} />
        <button disabled={!dirty} onClick={() => onSave(l, qty, price)}
          className="rounded-lg bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white disabled:opacity-40">
          సేవ్
        </button>
      </div>
    </div>
  );
}

function Switch({ on, onLabel, offLabel, onChange }: {
  on: boolean; onLabel: string; offLabel: string; onChange: (v: boolean) => void;
}) {
  return (
    <button onClick={() => onChange(!on)}
      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${
        on ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}>
      {on ? `🟢 ${onLabel}` : `🔴 ${offLabel}`}
    </button>
  );
}

function Card({ icon, title, note, children }: {
  icon: React.ReactNode; title: string; note: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1e3a8a]">{icon} {title}</h3>
      <p className="mt-0.5 text-[10px] text-[#1e3a8a]/60">{note}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

const inp = "w-full rounded-lg border border-[#1e3a8a]/15 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#1e3a8a]";
