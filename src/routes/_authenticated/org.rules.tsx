import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen, History, X, Check, Upload, Loader2, Camera, Image as ImageIcon, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  listRules, addRule, updateRule, deleteRule,
  listMilestones, addMilestone, updateMilestone, deleteMilestone,
} from "@/lib/content.functions";
import { toast } from "sonner";
import { printDocument, escapeHtml } from "@/lib/print-pdf";

type Rule = { id: string; text: string; category: string | null; position: number };
type Milestone = { id: string; event_date: string; title: string; description: string | null; photo_url: string | null };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back / వెనుకకు
        </button>
        <Card className="p-5 bg-card backdrop-blur-xl shadow-xl border-border">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">సొసైటీ నియమాలు & చరిత్ర</h1>
          <p className="text-xs text-muted-foreground mt-1">Admin / కమిటీ సభ్యులు మాత్రమే మార్పులు చేయగలరు</p>
        </Card>
        {children}
      </div>
    </div>
  );
}

function RulesTab() {
  const fnList = useServerFn(listRules);
  const fnAdd = useServerFn(addRule);
  const fnUpd = useServerFn(updateRule);
  const fnDel = useServerFn(deleteRule);
  const [rules, setRules] = useState<Rule[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newCat, setNewCat] = useState("");
  const [editId, setEditId] = useState<string | null>(null);


  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList();
      setRules(r.rules as Rule[]);
      setCanEdit(r.canEdit);
      setOrgName((r as any).orgName ?? "");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!newText.trim()) return;
    try {
      if (editId) {
        await fnUpd({ data: { id: editId, text: newText, category: newCat || undefined } });
        toast.success("నవీకరించబడింది");
      } else {
        await fnAdd({ data: { text: newText, category: newCat || undefined } });
        toast.success("నియమం జోడించబడింది");
      }
      setEditId(null); setNewText(""); setNewCat("");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };
  const startEdit = (r: Rule) => {
    setEditId(r.id); setNewText(r.text); setNewCat(r.category ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditId(null); setNewText(""); setNewCat(""); };
  const handleDel = async (id: string) => {
    if (!confirm("ఈ నియమాన్ని తొలగించాలా?")) return;
    try { await fnDel({ data: { id } }); await load(); toast.success("తొలగించబడింది"); }
    catch (e: any) { toast.error(e.message); }
  };

  // Group by category
  const grouped = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    const k = r.category || "సాధారణ నియమాలు";
    (acc[k] ||= []).push(r);
    return acc;
  }, {});

  const handleDownloadPdf = () => {
    if (rules.length === 0) { toast.error("డౌన్‌లోడ్ చేయడానికి నియమాలు లేవు"); return; }
    const sections = Object.entries(grouped).map(([cat, items]) => `
      <h2>${escapeHtml(cat)}</h2>
      <ol>
        ${items.map(r => `<li>${escapeHtml(r.text)}</li>`).join("")}
      </ol>
    `).join("");
    printDocument({
      title: "సొసైటీ నియమాలు • Society Rules",
      orgName: orgName || "సొసైటీ",
      bodyHtml: sections,
    });
  };

  return (
    <div className="space-y-4">
      {rules.length > 0 && (
        <Button variant="outline" onClick={handleDownloadPdf} className="w-full">
          <FileDown className="w-4 h-4 mr-1" /> PDF డౌన్‌లోడ్ • Download PDF
        </Button>
      )}
      {canEdit && (
        <Card className="p-4 bg-white/95 backdrop-blur border-white space-y-2">
          {editId && (
            <div className="text-xs font-semibold text-orange-700">✏️ నియమాన్ని సవరిస్తున్నారు • Editing rule</div>
          )}
          <Input placeholder="కేటగిరి (ఐచ్ఛికం) — ఉదా: సభ్యత్వం, విరాళాలు" value={newCat} onChange={e => setNewCat(e.target.value)} />
          <Textarea placeholder="కొత్త నియమం రాయండి..." rows={2} value={newText} onChange={e => setNewText(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!newText.trim()} className="flex-1">
              {editId ? <><Check className="w-4 h-4 mr-1" />Update • నవీకరించండి</> : <><Plus className="w-4 h-4 mr-1" />నియమం జోడించండి</>}
            </Button>
            {editId && (
              <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">లోడ్ అవుతోంది...</Card>
      ) : rules.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">
          ఇంకా నియమాలు జోడించలేదు.
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat} className="overflow-hidden bg-white/95 border-white">
            <h3 className="font-bold text-sm px-4 py-2 text-white" style={{
              background: "linear-gradient(90deg,#8B1A1A,#B22222)",
            }}>{cat}</h3>
            <ol className="space-y-2 list-decimal list-inside p-4">
              {items.map(r => (
                <li key={r.id} className="text-sm leading-relaxed">
                  <span>{r.text}</span>
                  {canEdit && (
                    <span className="ml-2 inline-flex gap-1">
                      <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-foreground" aria-label="Edit"><Pencil className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => handleDel(r.id)} className="text-destructive hover:opacity-70" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        ))
      )}
    </div>
  );
}


function HistoryTab() {
  const fnList = useServerFn(listMilestones);
  const fnAdd = useServerFn(addMilestone);
  const fnUpd = useServerFn(updateMilestone);
  const fnDel = useServerFn(deleteMilestone);
  const [items, setItems] = useState<Milestone[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState(""); // storage path (private bucket) or full http URL
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [orgName, setOrgName] = useState<string>("");
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const signUrl = async (pathOrUrl: string): Promise<string> => {
    if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const { data } = await supabase.storage.from("milestone-photos").createSignedUrl(pathOrUrl, 60 * 60 * 24 * 7);
    return data?.signedUrl ?? "";
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fnList();
      const list = r.milestones as Milestone[];
      setItems(list);
      setCanEdit(r.canEdit);
      setOrgName((r as any).orgName ?? "");
      const entries = await Promise.all(
        list
          .filter(m => m.photo_url && !/^https?:\/\//i.test(m.photo_url))
          .map(async m => [m.photo_url!, await signUrl(m.photo_url!)] as const)
      );
      setSignedUrls(Object.fromEntries(entries));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? "anon";
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("milestone-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      setPhoto(path);
      setPhotoPreview(await signUrl(path));
      toast.success("ఇమేజ్ అప్‌లోడ్ అయింది");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputGalleryRef.current) fileInputGalleryRef.current.value = "";
      if (fileInputCameraRef.current) fileInputCameraRef.current.value = "";
    }
  };


  const reset = () => { setShowForm(false); setEditId(null); setDate(""); setTitle(""); setDesc(""); setPhoto(""); setPhotoPreview(""); };
  const handleSave = async () => {
    if (!date || !title.trim()) { toast.error("తేదీ మరియు శీర్షిక అవసరం"); return; }
    try {
      if (editId) await fnUpd({ data: { id: editId, event_date: date, title, description: desc || undefined, photo_url: photo || undefined } });
      else await fnAdd({ data: { event_date: date, title, description: desc || undefined, photo_url: photo || undefined } });
      reset(); await load(); toast.success("సేవ్ అయింది");
    } catch (e: any) { toast.error(e.message); }
  };
  const startEdit = async (m: Milestone) => {
    setEditId(m.id); setDate(m.event_date); setTitle(m.title);
    setDesc(m.description ?? "");
    setPhoto(m.photo_url ?? "");
    setPhotoPreview(m.photo_url ? await signUrl(m.photo_url) : "");
    setShowForm(true);
  };
  const handleDel = async (id: string) => {
    if (!confirm("ఈ మైలురాయిని తొలగించాలా?")) return;
    try { await fnDel({ data: { id } }); await load(); toast.success("తొలగించబడింది"); }
    catch (e: any) { toast.error(e.message); }
  };

  // Group by year
  const byYear = items.reduce<Record<string, Milestone[]>>((acc, m) => {
    const y = m.event_date.slice(0, 4);
    (acc[y] ||= []).push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  const handleDownloadPdf = () => {
    if (items.length === 0) { toast.error("డౌన్‌లోడ్ చేయడానికి మైలురాళ్లు లేవు"); return; }
    const sorted = [...items].sort((a, b) => a.event_date.localeCompare(b.event_date));
    const body = sorted.map(m => `
      <div class="milestone">
        <div class="date">${escapeHtml(new Date(m.event_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }))}</div>
        <div class="m-title">${escapeHtml(m.title)}</div>
        ${m.description ? `<div class="desc">${escapeHtml(m.description)}</div>` : ""}
      </div>
    `).join("");
    printDocument({
      title: "సొసైటీ చరిత్ర • Society History",
      orgName: orgName || "సొసైటీ",
      bodyHtml: `<h2>చరిత్ర మైలురాళ్లు • History Milestones</h2>${body}`,
    });
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <Button variant="outline" onClick={handleDownloadPdf} className="w-full">
          <FileDown className="w-4 h-4 mr-1" /> PDF డౌన్‌లోడ్ • Download PDF
        </Button>
      )}
      {canEdit && !showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full"><Plus className="w-4 h-4 mr-1" />మైలురాయి జోడించండి</Button>
      )}
      {canEdit && showForm && (
        <Card className="p-4 bg-white/95 border-white space-y-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input placeholder="శీర్షిక (ఉదా: సొసైటీ స్థాపన)" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="వివరణ (ఐచ్ఛికం)" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="space-y-2">
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleFileSelect(e); setShowPicker(false); }}
            />
            <input
              ref={fileInputCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { handleFileSelect(e); setShowPicker(false); }}
            />
            {showPicker ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputGalleryRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />Gallery
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputCameraRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4 mr-1" />Camera
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPicker(false)}
                  className="col-span-2"
                >
                  <X className="w-4 h-4 mr-1" />Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPicker(true)}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                {photo ? "ఇమేజ్ మార్చండి • Change Image" : "ఇమేజ్ అప్‌లోడ్ చేయండి • Upload Image"}
              </Button>
            )}
            {photoPreview && (
              <div className="relative">
                <img src={photoPreview} alt="preview" className="rounded-md max-h-48 object-cover w-full" />
                <button
                  type="button"
                  onClick={() => { setPhoto(""); setPhotoPreview(""); }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1"><Check className="w-4 h-4 mr-1" />సేవ్ చేయండి</Button>
            <Button variant="outline" onClick={reset}><X className="w-4 h-4" /></Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">లోడ్ అవుతోంది...</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground bg-white/92 border-white">
          ఇంకా చరిత్ర మైలురాళ్లు లేవు.
        </Card>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-0.5 rounded" style={{ background: "linear-gradient(180deg,#FF9933,#138808)" }} />
          {years.map(y => (
            <div key={y} className="mb-6">
              <div className="sticky top-0 mb-3 -ml-6">
                <span className="inline-flex items-center justify-center w-12 h-6 rounded-full text-xs font-bold text-white shadow"
                  style={{ background: "linear-gradient(135deg,#FF9933,#138808)" }}>{y}</span>
              </div>
              <div className="space-y-3">
                {byYear[y].map(m => (
                  <Card key={m.id} className="p-3 bg-white/95 border-white relative">
                    <div className="absolute -left-[1.4rem] top-4 w-3 h-3 rounded-full bg-white border-2 shadow" style={{ borderColor: "#FF9933" }} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-muted-foreground">{new Date(m.event_date).toLocaleDateString("te-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                        <div className="font-semibold text-sm mt-0.5">{m.title}</div>
                        {m.description && <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap">{m.description}</p>}
                        {m.photo_url && <img src={/^https?:\/\//i.test(m.photo_url) ? m.photo_url : (signedUrls[m.photo_url] ?? "")} alt={m.title} className="mt-2 rounded-md max-h-40 object-cover w-full" />}
                      </div>
                      {canEdit && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => startEdit(m)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDel(m.id)} className="text-destructive hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Page() {
  return (
    <Shell>
      <Tabs defaultValue="rules">
        <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur">
          <TabsTrigger value="rules"><BookOpen className="w-4 h-4 mr-1" />నియమాలు</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />చరిత్ర</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4"><RulesTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab /></TabsContent>
      </Tabs>
    </Shell>
  );
}

export const Route = createFileRoute("/_authenticated/org/rules")({
  head: () => ({ meta: [{ title: "నియమాలు & చరిత్ర" }] }),
  component: Page,
});
