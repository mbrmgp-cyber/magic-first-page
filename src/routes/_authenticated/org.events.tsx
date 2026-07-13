import { DateInput } from "@/components/DateInput";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar, Gavel, Activity, Printer, Trash2, Pencil, Users, CheckCircle2, XCircle } from "lucide-react";
import { printMeetingMinutes, printResolution, printActivity } from "@/lib/printMinutes";
import { useServerFn } from "@tanstack/react-start";
import { sendMeetingInvites } from "@/lib/org.functions";
import { Mail, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency-context";

export const Route = createFileRoute("/_authenticated/org/events")({
  head: () => ({ meta: [{ title: "Events, Meetings, Decisions" }] }),
  component: EventsPage,
});

type Tab = "meetings" | "resolutions" | "activities";

function EventsPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const [tab, setTab] = useState<Tab>("meetings");
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: own } = await supabase.from("organizations").select("id").eq("admin_user_id", user.id).maybeSingle();
      if (own?.id) { setOrgId(own.id); return; }
      const { data: m } = await supabase.from("members").select("org_id").eq("user_id", user.id).eq("status", "approved").maybeSingle();
      if (m?.org_id) setOrgId(m.org_id);
    })();
  }, []);

  const membersQ = useQuery({
    enabled: !!orgId,
    queryKey: ["org-members-mini", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, name, member_code").eq("org_id", orgId!).eq("status", "approved").order("name");
      return data ?? [];
    },
  });

  const meetingsQ = useQuery({
    enabled: !!orgId,
    queryKey: ["org-meetings", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_meetings").select("*").eq("org_id", orgId!).order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });

  const resolutionsQ = useQuery({
    enabled: !!orgId,
    queryKey: ["org-resolutions", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_resolutions").select("*").eq("org_id", orgId!).order("decision_date", { ascending: false });
      return data ?? [];
    },
  });

  const activitiesQ = useQuery({
    enabled: !!orgId,
    queryKey: ["org-activities", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_activities").select("*").eq("org_id", orgId!).order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["org-meetings"] });
    qc.invalidateQueries({ queryKey: ["org-resolutions"] });
    qc.invalidateQueries({ queryKey: ["org-activities"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-3 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Link to="/org/dashboard" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> డాష్‌బోర్డ్
          </Link>
        </div>

        <Card className="mbr-theme-big-box border p-4 mb-4">
          <h1 className="text-xl font-bold text-foreground">
            {lang === "te" ? "కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు" : "Events, Meetings & Decisions Hub"}
          </h1>
        </Card>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { k: "meetings", icon: Calendar, te: "సమావేశాలు", en: "Meetings" },
            { k: "resolutions", icon: Gavel, te: "నిర్ణయాలు", en: "Resolutions" },
            { k: "activities", icon: Activity, te: "కార్యక్రమాలు", en: "Activities" },
          ] as const).map((t) => {
            const Ic = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                aria-pressed={active}
                className={`mbr-theme-mini-box relative flex flex-col items-center gap-1 rounded-lg p-2 border text-xs transition ${active ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/50 border-b-4 border-b-primary-foreground/80" : "bg-card border-border text-foreground hover:border-primary"}`}
              >
                <Ic className="w-4 h-4" />
                <span className="font-semibold leading-tight">{lang === "te" ? t.te : t.en}</span>
              </button>
            );
          })}
        </div>

        {!orgId ? <p className="text-muted-foreground text-sm">లోడ్ అవుతోంది…</p> : (
          <>
            {tab === "meetings" && (
              <MeetingsTab orgId={orgId} meetings={meetingsQ.data ?? []} resolutions={resolutionsQ.data ?? []} members={membersQ.data ?? []} onChange={refetchAll} />
            )}
            {tab === "resolutions" && (
              <ResolutionsTab orgId={orgId} resolutions={resolutionsQ.data ?? []} meetings={meetingsQ.data ?? []} members={membersQ.data ?? []} onChange={refetchAll} />
            )}
            {tab === "activities" && (
              <ActivitiesTab orgId={orgId} activities={activitiesQ.data ?? []} onChange={refetchAll} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============ Meetings Tab ============ */
function MeetingsTab({ orgId, meetings, resolutions, members, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const now = Date.now();
  const upcoming = meetings.filter((m: any) => new Date(m.scheduled_at).getTime() >= now);
  const past = meetings.filter((m: any) => new Date(m.scheduled_at).getTime() < now);

  return (
    <div className="space-y-4">
      <Button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" /> కొత్త సమావేశం / New Meeting
      </Button>

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-foreground font-semibold text-sm mb-2">రాబోయే సమావేశాలు ({upcoming.length})</h3>
          <div className="space-y-2">{upcoming.map((m: any) => <MeetingCard key={m.id} m={m} resolutions={resolutions} members={members} orgId={orgId} onEdit={() => { setEditing(m); setOpen(true); }} onChange={onChange} />)}</div>
        </section>
      )}

      <section>
        <h3 className="text-muted-foreground font-semibold text-sm mb-2">గత సమావేశాలు ({past.length})</h3>
        {past.length === 0 ? <p className="text-muted-foreground text-xs">ఇంకా రికార్డ్ చేయలేదు.</p> :
          <div className="space-y-2">{past.map((m: any) => <MeetingCard key={m.id} m={m} resolutions={resolutions} members={members} orgId={orgId} onEdit={() => { setEditing(m); setOpen(true); }} onChange={onChange} />)}</div>}
      </section>

      <MeetingDialog open={open} onOpenChange={setOpen} orgId={orgId} members={members} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function MeetingCard({ m, resolutions, members, orgId, onEdit, onChange }: any) {
  const { lang } = useI18n();
  const linkedRes = resolutions.filter((r: any) => r.meeting_id === m.id);
  async function del() {
    if (!confirm("Delete this meeting?")) return;
    const { error } = await supabase.from("org_meetings").delete().eq("id", m.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  }
  return (
    <Card className="mbr-theme-mini-box bg-card border-border p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">
              {m.meeting_type === "online" ? "ఆన్‌లైన్" : "ఆఫ్‌లైన్"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-card text-muted-foreground border border-border">{m.status}</span>
          </div>
          <h4 className="text-foreground font-semibold mt-1 text-sm">{m.title}</h4>
          <p className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          {m.location && <p className="text-xs text-muted-foreground mt-0.5">📍 {m.location}</p>}
          <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>✓ హాజరు {m.attended_member_ids?.length || 0}</span>
            <span>✗ గైర్హాజరు {m.absent_member_ids?.length || 0}</span>
            {linkedRes.length > 0 && <span>⚖ నిర్ణయాలు {linkedRes.length}</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Button size="sm" variant="secondary" onClick={() => printMeetingMinutes({ orgId, meeting: m, resolutions: linkedRes, members, lang })} className="text-xs h-8">
          <Printer className="w-3 h-3 mr-1" /> ప్రింట్ / PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} className="text-xs h-8 text-foreground"><Pencil className="w-3 h-3 mr-1" /> సవరించు</Button>
        <Button size="sm" variant="ghost" onClick={del} className="text-xs h-8 text-foreground"><Trash2 className="w-3 h-3" /></Button>
      </div>
    </Card>
  );
}

function MeetingDialog({ open, onOpenChange, orgId, members, editing, onSaved }: any) {
  const [form, setForm] = useState<any>(blankMeeting());
  useEffect(() => { setForm(editing ? { ...editing, scheduled_at: toLocalInput(editing.scheduled_at) } : blankMeeting()); }, [editing, open]);

  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.title?.trim()) { toast.error("శీర్షిక అవసరం"); return; }
    if (!form.scheduled_at) { toast.error("తేదీ అవసరం"); return; }
    setSaving(true);
    const payload = {
      org_id: orgId,
      title: form.title,
      agenda: form.agenda || null,
      meeting_type: form.meeting_type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      location: form.location || null,
      meeting_link: form.meeting_link || null,
      status: form.status,
      attended_member_ids: form.attended_member_ids || [],
      absent_member_ids: form.absent_member_ids || [],
      notes: form.notes || null,
    };
    const op = editing ? supabase.from("org_meetings").update(payload).eq("id", editing.id) : supabase.from("org_meetings").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("సేవ్ చేయబడింది"); onSaved(); }
  }

  function toggleMember(id: string, kind: "attended_member_ids" | "absent_member_ids") {
    const other = kind === "attended_member_ids" ? "absent_member_ids" : "attended_member_ids";
    const cur: string[] = form[kind] || [];
    const otherList: string[] = (form[other] || []).filter((x: string) => x !== id);
    setForm({ ...form, [kind]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id], [other]: otherList });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">{editing ? "సమావేశం సవరించు" : "కొత్త సమావేశం"}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div><Label>శీర్షిక / Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          <div className="space-y-2">
            <div>
              <Label>తేదీ / సమయం *</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-zinc-800 border-zinc-700 w-full" />
            </div>
            <div>
              <Label>విధానం</Label>
              <select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded px-2">
                <option value="offline">ఆఫ్‌లైన్ Offline</option>
                <option value="online">ఆన్‌లైన్ Online</option>
              </select>
            </div>
          </div>
          {form.meeting_type === "offline" ? (
            <div><Label>వేదిక / Location</Label><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          ) : (
            <div><Label>లింక్ / Meeting Link</Label><Input value={form.meeting_link || ""} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          )}
          <div>
            <Label>స్థితి / Status</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded px-2">
              <option value="scheduled">షెడ్యూల్</option>
              <option value="completed">పూర్తయింది</option>
              <option value="cancelled">రద్దు</option>
            </select>
          </div>
          <div><Label>అజెండా / Agenda</Label><Textarea rows={3} value={form.agenda || ""} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>

          <div>
            <Label className="flex items-center gap-1"><Users className="w-3 h-3" /> హాజరు ట్రాకర్ ({members.length} సభ్యులు)</Label>
             <div className="mbr-theme-mini-box mt-2 max-h-56 overflow-y-auto border border-border rounded p-2 space-y-1">
              {members.map((m: any) => {
                const att = form.attended_member_ids?.includes(m.id);
                const abs = form.absent_member_ids?.includes(m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate flex-1">{m.name} <span className="text-muted-foreground">{m.member_code}</span></span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => toggleMember(m.id, "attended_member_ids")} className={`px-2 py-1 rounded text-[10px] border ${att ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>✓ హాజరు</button>
                      <button type="button" onClick={() => toggleMember(m.id, "absent_member_ids")} className={`px-2 py-1 rounded text-[10px] border ${abs ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>✗ గైర్హాజరు</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div><Label>అదనపు గమనికలు</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>

          <InviteSection orgId={orgId} form={form} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>రద్దు</Button>
          <Button type="button" onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "సేవ్…" : "సేవ్"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteSection({ orgId, form }: { orgId: string; form: any }) {
  const send = useServerFn(sendMeetingInvites);
  const [sending, setSending] = useState<null | "committee" | "all">(null);

  async function trigger(scope: "committee" | "all") {
    if (!orgId) { toast.error("Organization missing"); return; }
    if (!form.title?.trim()) { toast.error("ముందుగా శీర్షిక నమోదు చేయండి"); return; }
    if (!form.scheduled_at) { toast.error("తేదీ/సమయం నమోదు చేయండి"); return; }
    setSending(scope);
    try {
      const res: any = await send({ data: {
        org_id: orgId,
        scope,
        title: form.title,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        meeting_type: form.meeting_type,
        location: form.location || null,
        meeting_link: form.meeting_link || null,
        agenda: form.agenda || null,
      }});
      if (res?.sent > 0) {
        toast.success(`✅ ఆహ్వానం పంపబడింది — ${res.sent}/${res.total} మందికి`);
      } else {
        toast.message("ఇమెయిల్ ఉన్న సభ్యులు ఎవరూ లేరు");
      }
    } catch (e: any) {
      toast.error(e?.message || "పంపడంలో విఫలమైంది");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="mbr-theme-mini-box border border-border bg-card rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2 text-foreground text-xs font-semibold">
        <Mail className="w-3.5 h-3.5" /> ఆహ్వాన నోటిఫికేషన్ పంపండి / Send Invitation
      </div>
      <p className="text-[11px] text-muted-foreground">శీర్షిక, తేదీ/సమయం, లింక్ &amp; అజెండాతో ఇమెయిల్ వెళ్తుంది.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={sending !== null}
          onClick={() => trigger("committee")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 justify-start"
        >
          <Send className="w-3.5 h-3.5" />
          {sending === "committee" ? "పంపుతోంది…" : "కార్యవర్గానికి మాత్రమే"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={sending !== null}
          onClick={() => trigger("all")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 justify-start"
        >
          <Send className="w-3.5 h-3.5" />
          {sending === "all" ? "పంపుతోంది…" : "సభ్యులందరికీ"}
        </Button>
      </div>
    </div>
  );
}

function blankMeeting() {
  return { title: "", agenda: "", meeting_type: "offline", scheduled_at: toLocalInput(new Date().toISOString()), location: "", meeting_link: "", status: "scheduled", attended_member_ids: [], absent_member_ids: [], notes: "" };
}
function toLocalInput(iso: string) {
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============ Resolutions Tab ============ */
function ResolutionsTab({ orgId, resolutions, meetings, members, onChange }: any) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" /> కొత్త నిర్ణయం / New Resolution
      </Button>
      {resolutions.length === 0 ? <p className="text-muted-foreground text-xs">ఇంకా నిర్ణయాలు లేవు.</p> :
        resolutions.map((r: any) => (
          <Card key={r.id} className="mbr-theme-mini-box bg-card border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">{r.resolution_no}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">
                    {r.status === "passed" ? "ఆమోదించబడింది" : r.status === "rejected" ? "తిరస్కరించబడింది" : "పెండింగ్"}
                  </span>
                </div>
                <h4 className="text-foreground font-semibold mt-1 text-sm">{r.topic}</h4>
                <p className="text-[11px] text-muted-foreground">{new Date(r.decision_date).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
                {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                <div className="flex gap-3 mt-2 text-[11px]">
                  <span className="text-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {r.approved_member_ids?.length || 0}</span>
                  <span className="text-foreground flex items-center gap-1"><XCircle className="w-3 h-3" /> {r.opposed_member_ids?.length || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => printResolution({ orgId, resolution: r, members, lang })} className="text-xs h-8">
                <Printer className="w-3 h-3 mr-1" /> ప్రింట్
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }} className="text-xs h-8 text-foreground"><Pencil className="w-3 h-3 mr-1" /> సవరించు</Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Delete?")) return;
                const { error } = await supabase.from("org_resolutions").delete().eq("id", r.id);
                if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
              }} className="text-xs h-8 text-foreground"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </Card>
        ))
      }
      <ResolutionDialog open={open} onOpenChange={setOpen} orgId={orgId} meetings={meetings} members={members} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function ResolutionDialog({ open, onOpenChange, orgId, meetings, members, editing, onSaved }: any) {
  const [form, setForm] = useState<any>(blankResolution());
  useEffect(() => { setForm(editing ? { ...editing } : blankResolution()); }, [editing, open]);
  const [saving, setSaving] = useState(false);

  function toggleVote(id: string, kind: "approved_member_ids" | "opposed_member_ids") {
    const other = kind === "approved_member_ids" ? "opposed_member_ids" : "approved_member_ids";
    const cur: string[] = form[kind] || [];
    const otherList: string[] = (form[other] || []).filter((x: string) => x !== id);
    setForm({ ...form, [kind]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id], [other]: otherList });
  }

  async function save() {
    if (!form.resolution_no?.trim() || !form.topic?.trim()) { toast.error("నంబర్ & శీర్షిక అవసరం"); return; }
    setSaving(true);
    const payload = {
      org_id: orgId,
      meeting_id: form.meeting_id || null,
      resolution_no: form.resolution_no,
      topic: form.topic,
      description: form.description || null,
      decision_date: form.decision_date,
      approved_member_ids: form.approved_member_ids || [],
      opposed_member_ids: form.opposed_member_ids || [],
      status: form.status,
    };
    const op = editing ? supabase.from("org_resolutions").update(payload).eq("id", editing.id) : supabase.from("org_resolutions").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("సేవ్"); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">{editing ? "నిర్ణయం సవరించు" : "కొత్త నిర్ణయం"}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>నిర్ణయ సంఖ్య *</Label><Input value={form.resolution_no} onChange={(e) => setForm({ ...form, resolution_no: e.target.value })} placeholder="R-001" className="bg-zinc-800 border-zinc-700" /></div>
            <div><Label>తేదీ</Label><DateInput value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          </div>
          <div><Label>శీర్షిక / Topic *</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          <div><Label>వివరణ / Description</Label><Textarea rows={4} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>సమావేశం (ఐచ్ఛికం)</Label>
              <select value={form.meeting_id || ""} onChange={(e) => setForm({ ...form, meeting_id: e.target.value })} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded px-2">
                <option value="">— ఏదీ లేదు —</option>
                {meetings.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <Label>స్థితి</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded px-2">
                <option value="passed">ఆమోదించబడింది</option>
                <option value="rejected">తిరస్కరించబడింది</option>
                <option value="pending">పెండింగ్</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">ఓటింగ్ ట్రాకింగ్ / Voting</Label>
              <div className="flex gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-card text-foreground border border-border font-semibold">✓ {form.approved_member_ids?.length || 0}</span>
                <span className="px-2 py-0.5 rounded bg-card text-foreground border border-border font-semibold">✕ {form.opposed_member_ids?.length || 0}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">ప్రతి సభ్యునికి ఆమోదం లేదా వ్యతిరేకం బటన్ నొక్కండి</p>
            <div className="mbr-theme-mini-box max-h-64 overflow-y-auto border border-border rounded-lg p-2 space-y-1.5 bg-card">
              {members.map((m: any) => {
                const app = form.approved_member_ids?.includes(m.id);
                const opp = form.opposed_member_ids?.includes(m.id);
                return (
                  <div key={m.id} className="mbr-theme-mini-box flex items-center justify-between gap-2 text-xs bg-card rounded p-2 border border-border">
                    <span className="truncate flex-1 text-foreground">{m.name} <span className="text-muted-foreground text-[10px]">{m.member_code}</span></span>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => toggleVote(m.id, "approved_member_ids")} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition ${app ? "bg-primary border-primary text-primary-foreground shadow" : "bg-card border-border text-foreground"}`}>✓ ఆమోదం</button>
                      <button type="button" onClick={() => toggleVote(m.id, "opposed_member_ids")} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition ${opp ? "bg-primary border-primary text-primary-foreground shadow" : "bg-card border-border text-foreground"}`}>✕ వ్యతిరేకం</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>రద్దు</Button>
          <Button type="button" onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "సేవ్…" : "సేవ్"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function blankResolution() {
  return { resolution_no: "", topic: "", description: "", decision_date: new Date().toISOString().slice(0, 10), meeting_id: "", status: "passed", approved_member_ids: [], opposed_member_ids: [] };
}

/* ============ Activities Tab ============ */
function ActivitiesTab({ orgId, activities, onChange }: any) {
  const { lang } = useI18n();
  const { symbol: sym } = useCurrency();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" /> కొత్త కార్యక్రమం
      </Button>
      {activities.length === 0 ? <p className="text-muted-foreground text-xs">ఇంకా కార్యక్రమాలు లేవు.</p> :
        activities.map((a: any) => {
          const variance = Number(a.allocated_budget) - Number(a.actual_expense);
          return (
            <Card key={a.id} className="mbr-theme-mini-box bg-card border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border text-foreground">{a.status}</span>
                  </div>
                  <h4 className="text-foreground font-semibold mt-1 text-sm">{a.event_name}</h4>
                  <p className="text-[11px] text-muted-foreground">{new Date(a.event_date).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
                  {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                    <div className="bg-card border border-border rounded p-1.5"><div className="text-muted-foreground">బడ్జెట్</div><div className="text-foreground font-semibold">₹{Number(a.allocated_budget).toLocaleString("en-IN")}</div></div>
                    <div className="bg-card border border-border rounded p-1.5"><div className="text-muted-foreground">ఖర్చు</div><div className="text-foreground font-semibold">₹{Number(a.actual_expense).toLocaleString("en-IN")}</div></div>
                    <div className="bg-card border border-border rounded p-1.5"><div className="text-muted-foreground">మిగులు</div><div className="text-foreground font-semibold">₹{variance.toLocaleString("en-IN")}</div></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => printActivity({ orgId, activity: a, lang })} className="text-xs h-8">
                  <Printer className="w-3 h-3 mr-1" /> ప్రింట్
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }} className="text-xs h-8 text-foreground"><Pencil className="w-3 h-3 mr-1" /> సవరించు</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Delete?")) return;
                  const { error } = await supabase.from("org_activities").delete().eq("id", a.id);
                  if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
                }} className="text-xs h-8 text-foreground"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          );
        })}
      <ActivityDialog open={open} onOpenChange={setOpen} orgId={orgId} editing={editing} onSaved={() => { setOpen(false); onChange(); }} />
    </div>
  );
}

function ActivityDialog({ open, onOpenChange, orgId, editing, onSaved }: any) {
  const [form, setForm] = useState<any>(blankActivity());
  useEffect(() => { setForm(editing ? { ...editing } : blankActivity()); }, [editing, open]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.event_name?.trim()) { toast.error("పేరు అవసరం"); return; }
    setSaving(true);
    const payload = {
      org_id: orgId,
      event_name: form.event_name,
      event_date: form.event_date,
      description: form.description || null,
      allocated_budget: Number(form.allocated_budget) || 0,
      actual_expense: Number(form.actual_expense) || 0,
      status: form.status,
    };
    const op = editing ? supabase.from("org_activities").update(payload).eq("id", editing.id) : supabase.from("org_activities").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("సేవ్"); onSaved(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">{editing ? "కార్యక్రమం సవరించు" : "కొత్త కార్యక్రమం"}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div><Label>పేరు / Event Name *</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>తేదీ</Label><DateInput value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
            <div>
              <Label>స్థితి</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded px-2">
                <option value="planned">ప్రణాళిక</option>
                <option value="ongoing">జరుగుతోంది</option>
                <option value="completed">పూర్తయింది</option>
                <option value="cancelled">రద్దు</option>
              </select>
            </div>
          </div>
          <div><Label>వివరణ</Label><Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>బడ్జెట్ (₹)</Label><Input type="number" value={form.allocated_budget} onChange={(e) => setForm({ ...form, allocated_budget: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
            <div><Label>ఖర్చు (₹)</Label><Input type="number" value={form.actual_expense} onChange={(e) => setForm({ ...form, actual_expense: e.target.value })} className="bg-zinc-800 border-zinc-700" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>రద్దు</Button>
          <Button type="button" onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "సేవ్…" : "సేవ్"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function blankActivity() {
  return { event_name: "", event_date: new Date().toISOString().slice(0, 10), description: "", allocated_budget: 0, actual_expense: 0, status: "planned" };
}
