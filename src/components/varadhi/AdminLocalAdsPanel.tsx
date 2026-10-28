import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signAdImages, type AdPage } from "./PageAdBanner";

const PAGES: { k: AdPage; label: string }[] = [
  { k: "home", label: "హోమ్ (Home)" },
  { k: "search", label: "వెతకండి (Search)" },
  { k: "dashboard", label: "అప్‌డేట్ బోర్డు (Update Board)" },
  { k: "profile", label: "ప్రొఫైల్ (Profile)" },
];

export function AdminLocalAdsPanel() {
  const [page, setPage] = useState<AdPage>("home");
  const [ads, setAds] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("varadhi_page_ads").select("*").eq("page", page).order("sort_order");
    setAds(await signAdImages(data ?? []));
  }
  useEffect(() => { load(); }, [page]);

  async function add() {
    if (!file) return toast.error("యాడ్ చిత్రం ఎంచుకోండి");
    setBusy(true);
    try {
      const path = `${page}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("varadhi-ads").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("varadhi_page_ads").insert({
        page, image_url: path, link_url: link.trim() || null, phone: phone.trim() || null, title: title.trim() || null, sort_order: ads.length,
      });
      if (error) throw error;
      setFile(null); setLink(""); setPhone(""); setTitle("");
      toast.success("యాడ్ జోడించబడింది");
      load();
    } catch (e: any) { toast.error(e.message ?? "విఫలమైంది"); } finally { setBusy(false); }
  }

  async function update(id: string, changes: any) {
    const { error } = await supabase.from("varadhi_page_ads").update(changes).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("సేవ్ అయింది"); load(); }
  }
  async function remove(a: any) {
    if (!confirm("ఈ యాడ్ తొలగించాలా?")) return;
    await supabase.storage.from("varadhi-ads").remove([a.image_url]);
    const { error } = await supabase.from("varadhi_page_ads").delete().eq("id", a.id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Manage Local Ads</h2>
        <div className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <Button key={p.k} size="sm" variant={page === p.k ? "default" : "outline"} onClick={() => setPage(p.k)}>{p.label}</Button>
          ))}
        </div>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Input placeholder="వ్యాపారం పేరు (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="లింక్ https://... (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
        <Input placeholder="ఫోన్ నంబర్ (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button onClick={add} disabled={busy}>{busy ? "అప్‌లోడ్…" : "యాడ్ జోడించండి"}</Button>
      </Card>
      {ads.length === 0 && <p className="text-sm text-center opacity-70">ఈ పేజీకి యాడ్లు లేవు</p>}
      {ads.map((a) => <AdRow key={a.id} ad={a} onSave={update} onRemove={remove} />)}
    </div>
  );
}

function AdRow({ ad, onSave, onRemove }: { ad: any; onSave: (id: string, c: any) => void; onRemove: (a: any) => void }) {
  const [link, setLink] = useState(ad.link_url ?? "");
  const [phone, setPhone] = useState(ad.phone ?? "");
  const [title, setTitle] = useState(ad.title ?? "");
  return (
    <Card className="p-3 space-y-2">
      {ad.src && <img src={ad.src} alt={ad.title ?? "ad"} className="w-full max-h-40 object-cover rounded-lg" />}
      <Input placeholder="పేరు" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="లింక్" value={link} onChange={(e) => setLink(e.target.value)} />
      <Input placeholder="ఫోన్" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSave(ad.id, { link_url: link.trim() || null, phone: phone.trim() || null, title: title.trim() || null })}>సేవ్</Button>
        <Button size="sm" variant="outline" onClick={() => onSave(ad.id, { active: !ad.active })}>{ad.active ? "ఆపండి" : "చూపించండి"}</Button>
        <Button size="sm" variant="destructive" onClick={() => onRemove(ad)}>తొలగించండి</Button>
      </div>
    </Card>
  );
}
