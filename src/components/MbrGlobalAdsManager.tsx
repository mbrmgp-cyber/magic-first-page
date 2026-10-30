import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Copy, Download, ImageIcon, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adMediaKind, managedAds, PROMOTION_ID, PROMOTION_URL, resolveAdUrl, type GlobalAd } from "@/lib/mbr-ads";
import promotionWebm from "@/assets/videos/vaaradhi-promotion-silent.webm.asset.json";

type Organization = { id: string; name: string; org_code?: string };
async function previewUrl(url: string) {
  return resolveAdUrl(url, async (path) => {
    const { data, error } = await supabase.storage.from("mbr-global-ads").createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl ?? "";
  });
}

export function MbrGlobalAdsManager({ organizations }: { organizations: Organization[] }) {
  const [open, setOpen] = useState(false);
  return <section className="space-y-3">
    <Button variant="outline" className="w-full justify-between h-auto min-h-12" aria-expanded={open} aria-controls="mbr-advertisement-details" onClick={() => setOpen(!open)}>
      <span className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Advertisement / ప్రకటనలు</span><ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} />
    </Button>
    {open && <div id="mbr-advertisement-details"><AdDetails organizations={organizations} /></div>}
  </section>;
}

function AdDetails({ organizations }: { organizations: Organization[] }) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const q = useQuery({ queryKey: ["mbr-global-ads-admin"], queryFn: async () => {
    const { data, error } = await supabase.from("mbr_global_ads").select("id,url,label,active,sort_order,organization_ids").order("sort_order");
    if (error) throw error;
    return data as GlobalAd[];
  } });
  async function refresh() {
    await Promise.all([qc.invalidateQueries({ queryKey: ["mbr-global-ads-admin"] }), qc.invalidateQueries({ queryKey: ["mbr-global-ads-active"] })]);
  }
  async function upload(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("Choose an image or video");
    const path = `global/${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("mbr-global-ads").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }
  return <div className="space-y-4 text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-bold">MBR advertisements / ప్రకటనలు</h2>
      <Button size="sm" disabled={uploading || q.isLoading || q.isError} onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading…" : "Add advertisement"}</Button>
      <input ref={fileInput} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
        setUploading(true);
        try {
          const url = await upload(file);
          const { error } = await supabase.from("mbr_global_ads").insert({ url, label: file.name, active: true, sort_order: (q.data?.length ?? 0) + 1 });
          if (error) throw error;
          await refresh(); toast.success("Advertisement added");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
        finally { setUploading(false); }
      }} />
    </div>
    {q.isLoading ? <p>Loading advertisements…</p> : q.isError ? <p role="alert">ప్రకటనలు లోడ్ కాలేదు. <Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button></p> : managedAds(q.data ?? []).map((ad) => <AdEditor key={`${ad.id}:${ad.url}:${ad.active}:${JSON.stringify(ad.organization_ids)}:${ad.label}`} ad={ad} organizations={organizations} saved={!!q.data?.some((row) => row.id === ad.id)} upload={upload} refresh={refresh} />)}
  </div>;
}

function AdEditor({ ad, organizations, saved, upload, refresh }: { ad: GlobalAd; organizations: Organization[]; saved: boolean; upload: (file: File) => Promise<string>; refresh: () => Promise<void> }) {
  const [draft, setDraft] = useState(ad);
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const replaceInput = useRef<HTMLInputElement>(null);
  useEffect(() => { let alive = true; previewUrl(ad.url).then((url) => { if (alive) setSrc(url); }).catch(() => { if (alive) toast.error("Advertisement preview unavailable"); }); return () => { alive = false; }; }, [ad.url]);
  async function persist(next: GlobalAd) {
    const { error } = await supabase.from("mbr_global_ads").upsert(next, { onConflict: "id" });
    if (error) throw error;
    await refresh(); toast.success("Advertisement saved / సేవ్ అయింది");
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); try { await action(); } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed"); } finally { setBusy(false); }
  }
  return <article className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden">
    <div className="aspect-[1200/128] bg-market-header overflow-hidden">
      {src ? adMediaKind(ad.url) === "video" ? <video src={ad.url === PROMOTION_URL ? undefined : src} controls autoPlay loop muted playsInline preload="auto" className="w-full h-full object-contain" aria-label={ad.label ?? "Advertisement preview"}>
        {ad.url === PROMOTION_URL && <><source src={promotionWebm.url} type="video/webm" /><source src={src} type="video/mp4" /></>}
      </video> : <img src={src} alt={ad.label ?? "Advertisement preview"} className="w-full h-full object-contain" /> : <div className="h-full animate-pulse bg-muted" />}
    </div>
    <div className="p-3 space-y-3">
      <Label className="block">Advertisement name / ప్రకటన పేరు<Input value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="mt-1" /></Label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!src || busy} onClick={() => run(async () => { await navigator.clipboard.writeText(new URL(src, window.location.origin).href); toast.success("Advertisement link copied"); })}><Copy className="h-4 w-4 mr-1" />Copy link</Button>
        <Button size="sm" variant="outline" disabled={!src || busy} onClick={() => run(async () => {
          const response = await fetch(src); if (!response.ok) throw new Error("Download failed");
          const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = ad.url === PROMOTION_URL ? "vaaradhi-promotion-silent.mp4" : ad.url.split("/").pop() ?? "advertisement"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        })}><Download className="h-4 w-4 mr-1" />Download</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => replaceInput.current?.click()}><Upload className="h-4 w-4 mr-1" />Replace / మార్చండి</Button>
        <input ref={replaceInput} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) run(async () => { const url = await upload(file); await persist({ ...draft, url }); }); }} />
      </div>
      <Label className="flex items-center gap-2"><Checkbox checked={draft.active} onCheckedChange={(checked) => setDraft({ ...draft, active: checked === true })} />Active / ప్రదర్శించండి</Label>
      <Label className="flex items-center gap-2"><Checkbox checked={draft.organization_ids === null} onCheckedChange={(checked) => setDraft({ ...draft, organization_ids: checked === true ? null : [] })} />All organizations / అన్ని సంస్థలు</Label>
      {draft.organization_ids !== null && <div className="space-y-2">
        <Input aria-label="Search organizations" placeholder="Search organizations / సంస్థ పేరు" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-48 overflow-y-auto space-y-2">
          {organizations.slice().sort((a, b) => a.name.localeCompare(b.name)).filter((o) => `${o.name} ${o.org_code ?? ""}`.toLowerCase().includes(search.toLowerCase())).map((org) => <Label key={org.id} className="flex items-start gap-2 py-1">
            <Checkbox aria-label={org.name} checked={draft.organization_ids?.includes(org.id) ?? false} onCheckedChange={(checked) => setDraft({ ...draft, organization_ids: checked === true ? [...(draft.organization_ids ?? []), org.id] : (draft.organization_ids ?? []).filter((id) => id !== org.id) })} />
            <span className="min-w-0 break-words">{org.name}</span>
          </Label>)}
        </div>
        <p className="text-xs text-muted-foreground">Selected / ఎంపిక: {draft.organization_ids.length}</p>
      </div>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || (draft.active && draft.organization_ids?.length === 0)} onClick={() => run(() => persist(draft))}><Save className="h-4 w-4 mr-1" />Save / సేవ్</Button>
        {saved && ad.id !== PROMOTION_ID && <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (confirm("Delete this advertisement?")) run(async () => { const { error } = await supabase.from("mbr_global_ads").delete().eq("id", ad.id); if (error) throw error; await refresh(); }); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
      </div>
    </div>
  </article>;
}